import { openRouterClient } from '../openrouter';
import { safeLLMClient } from '../safe-llm-client';
import { UserInput, TuitionData } from '@/types';
import { US_UNIVERSITIES, AU_UNIVERSITIES } from '../constants';

export class TuitionAgent {
  async queryTuition(userInput: UserInput): Promise<TuitionData> {
    const { country, university, program, level } = userInput;

    try {
      // 首先尝试从官方网站获取准确学费信息
      const officialData = await this.getOfficialTuition(university, program, level, country);

      if (officialData) {
        return officialData;
      }

      // 如果官方数据获取失败，使用估算方法
      console.log('Official tuition data not found, using estimation');
      return await this.estimateTuition(university, program, level, country);

    } catch (error) {
      console.error('Tuition query error:', error);
      // 降级到估算方法
      return await this.estimateTuition(university, program, level, country);
    }
  }

  private async getOfficialTuition(
    university: string,
    program: string,
    level: 'undergraduate' | 'graduate',
    country: 'US' | 'AU'
  ): Promise<TuitionData | null> {
    try {
      // 获取大学官网信息
      const universityData = [...US_UNIVERSITIES, ...AU_UNIVERSITIES].find(
        uni => uni.name === university
      );

      if (!universityData) {
        throw new Error('University not found in database');
      }

      // 构建搜索查询
      const searchQuery = `${university} ${program} ${level === 'undergraduate' ? 'undergraduate bachelor' : 'graduate master'} tuition fees ${new Date().getFullYear()} international students site:${universityData.website}`;

      // 使用安全的LLM客户端进行搜索和数据提取
      const searchResults = await safeLLMClient.safeSearch(searchQuery);

      const fallbackData = {
        tuition_amount: country === 'US' ? 50000 : 45000,
        currency: country === 'US' ? 'USD' : 'AUD',
        period: 'annual',
        source_url: universityData.website,
        is_estimate: true,
        last_updated: new Date().toISOString(),
        confidence: 0.5
      };

      const extractedData = await safeLLMClient.extractTuitionData(searchResults, fallbackData);

      if (extractedData && extractedData.tuition_amount && extractedData.confidence > 0.7) {
        return {
          amount: extractedData.tuition_amount,
          currency: extractedData.currency,
          period: extractedData.period,
          source: extractedData.source_url || universityData.website,
          isEstimate: false,
          lastUpdated: new Date().toISOString()
        };
      }

      return null;
    } catch (error) {
      console.error('Official tuition search failed:', error);
      return null;
    }
  }

  private async estimateTuition(
    university: string,
    program: string,
    level: 'undergraduate' | 'graduate',
    country: 'US' | 'AU'
  ): Promise<TuitionData> {
    try {
      const estimationPrompt = `As an expert on international education costs, estimate the tuition fees for:

      University: ${university}
      Program: ${program}
      Level: ${level}
      Country: ${country}
      Year: ${new Date().getFullYear()}

      Please consider:
      1. The university's ranking and reputation
      2. The specific program type (STEM, Business, Liberal Arts, etc.)
      3. Current market rates for international students
      4. Regional cost variations

      Provide a realistic estimate based on similar institutions and programs.`;

      const estimationResponse = await openRouterClient.chat({
        model: 'openai/gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an education cost analyst. Provide realistic tuition estimates based on market data and institutional knowledge. Return only structured data.'
          },
          {
            role: 'user',
            content: estimationPrompt
          }
        ],
        temperature: 0.3
      });

      const extractionSchema = `{
        "estimated_tuition": 45000,
        "currency": "USD",
        "period": "annual",
        "reasoning": "Based on similar programs at comparable institutions",
        "confidence_level": "medium"
      }`;

      const estimatedData = await openRouterClient.extractStructuredData(
        estimationResponse,
        extractionSchema
      );

      // 使用默认估算值作为后备
      const defaultEstimates = {
        US: {
          undergraduate: { public: 35000, private: 55000 },
          graduate: { public: 45000, private: 65000 }
        },
        AU: {
          undergraduate: { public: 35000, private: 45000 },
          graduate: { public: 40000, private: 50000 }
        }
      };

      const fallbackAmount = defaultEstimates[country][level].private; // 使用私立大学费用作为保守估计
      const currency = country === 'US' ? 'USD' : 'AUD';

      return {
        amount: estimatedData?.estimated_tuition || fallbackAmount,
        currency: currency as 'USD' | 'AUD',
        period: 'annual',
        source: `内部估算基于${university}同类项目市场数据`,
        isEstimate: true,
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      console.error('Tuition estimation failed:', error);

      // 最终后备方案
      const emergency_estimates = {
        'US': { 'undergraduate': 45000, 'graduate': 55000 },
        'AU': { 'undergraduate': 40000, 'graduate': 45000 }
      };

      return {
        amount: emergency_estimates[country][level],
        currency: country === 'US' ? 'USD' : 'AUD',
        period: 'annual',
        source: '基于市场平均数据的紧急估算',
        isEstimate: true,
        lastUpdated: new Date().toISOString()
      };
    }
  }
}