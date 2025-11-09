import { openRouterClient } from '../openrouter';
import { safeLLMClient } from '../safe-llm-client';
import { UserInput, TuitionData } from '@/types';
import { US_UNIVERSITIES, AU_UNIVERSITIES, SEARCH_MODEL } from '../constants';

export class TuitionAgent {
  async queryTuition(userInput: UserInput): Promise<TuitionData> {
    const { country, university, program, level } = userInput;

    try {
      // 首先尝试从官方网站获取准确学费信息
      const officialData = await this.getOfficialTuition(userInput);

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

  private async getOfficialTuition(userInput: UserInput): Promise<TuitionData | null> {
    const { university, program, level, country } = userInput;
    
    try {
      // 获取大学官网信息
      const universityData = [...US_UNIVERSITIES, ...AU_UNIVERSITIES].find(
        uni => uni.name === university
      );

      if (!universityData) {
        throw new Error('University not found in database');
      }

      // 构建多种搜索查询以支持不同计费方式
      // 优化搜索查询，更好地匹配专业领域
      const searchQueries = [
        // 年度学费搜索 - 使用更具体的专业关键词
        `${university} ${program} ${level === 'undergraduate' ? 'undergraduate bachelor' : 'graduate master'} tuition fees ${new Date().getFullYear()} international students site:${universityData.website}`,
        // 学期学费搜索 - 使用更具体的专业关键词
        `${university} ${program} ${level === 'undergraduate' ? 'undergraduate bachelor' : 'graduate master'} semester tuition fees ${new Date().getFullYear()} international students site:${universityData.website}`,
        // 学分费用搜索 - 使用更具体的专业关键词
        `${university} ${program} ${level === 'undergraduate' ? 'undergraduate bachelor' : 'graduate master'} cost per credit ${new Date().getFullYear()} international students site:${universityData.website}`,
        // 通用学费搜索 - 使用更具体的专业关键词
        `${university} ${program} tuition ${new Date().getFullYear()} international students site:${universityData.website}`,
        // 特定学院搜索 - 如果是数据科学等热门专业，尝试搜索相关学院
        `${university} data science computer science graduate tuition fees ${new Date().getFullYear()} international students site:${universityData.website}`,
        // 学院特定搜索
        `${university} graduate school ${program} tuition fees ${new Date().getFullYear()} international students site:${universityData.website}`
      ];

      // 尝试多个搜索查询
      for (const searchQuery of searchQueries) {
        try {
          // 使用gpt-4o-search-preview模型进行搜索
          const searchResults = await safeLLMClient.safeSearch(searchQuery, '数据暂时不可用', SEARCH_MODEL);

          const fallbackData = {
            tuition_amount: country === 'US' ? 50000 : 45000,
            currency: country === 'US' ? 'USD' : 'AUD',
            period: 'annual',
            source_url: universityData.website,
            is_estimate: true,
            confidence: 0.5
          };

          const extractedData = await safeLLMClient.extractTuitionData(searchResults, fallbackData);

          // 修复置信度检查逻辑，允许更低置信度的数据通过
          if (extractedData && extractedData.tuition_amount) {
            return {
              amount: extractedData.tuition_amount,
              currency: extractedData.currency,
              period: extractedData.period,
              source: extractedData.source_url || universityData.website,
              isEstimate: extractedData.is_estimate || false,
              lastUpdated: new Date().toISOString(),
              confidence: extractedData.confidence
            };
          }
        } catch (searchError) {
          console.log(`Search query failed: ${searchQuery}`, searchError);
          continue; // 尝试下一个搜索查询
        }
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
      5. Different billing structures (annual, semester, credit-based) and provide the most common one

      Also provide information about possible variations in billing methods (annual, semester, or credit-based).`;

      const estimationResponse = await openRouterClient.chat({
        model: SEARCH_MODEL, // 使用搜索模型进行估算
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
        "confidence_level": "medium",
        "source_url": "https://university.edu"
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

      // 确定置信度
      let confidence = 0.6;
      if (estimatedData?.confidence_level === 'high') {
        confidence = 0.8;
      } else if (estimatedData?.confidence_level === 'medium') {
        confidence = 0.6;
      } else if (estimatedData?.confidence_level === 'low') {
        confidence = 0.4;
      }

      const source = estimatedData?.source_url || `内部估算基于${university}同类项目市场数据`;

      return {
        amount: estimatedData?.estimated_tuition || fallbackAmount,
        currency: currency as 'USD' | 'AUD',
        period: estimatedData?.period || 'annual',
        source: source,
        isEstimate: true, // 明确标识为估算数据
        lastUpdated: new Date().toISOString(),
        confidence: confidence
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
        lastUpdated: new Date().toISOString(),
        confidence: 0.3 // 紧急估算置信度较低
      };
    }
  }
}