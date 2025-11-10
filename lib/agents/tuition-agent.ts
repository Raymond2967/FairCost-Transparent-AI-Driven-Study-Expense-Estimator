import { openRouterClient } from '../openrouter';
import { safeLLMClient } from '../safe-llm-client';
import { UserInput, TuitionData } from '@/types';
import { US_UNIVERSITIES, AU_UNIVERSITIES, SEARCH_MODEL } from '../constants';

export class TuitionAgent {
  async queryTuition(userInput: UserInput): Promise<TuitionData> {
    const { country, university, program, level } = userInput;

    try {
      // 直接从常量中获取大学网站信息，不依赖programs字段
      const universityData = [...US_UNIVERSITIES, ...AU_UNIVERSITIES].find(
        uni => uni.name === university
      );

      if (!universityData) {
        throw new Error(`University not found in database: ${university}`);
      }

      // 使用智能搜索和推理获取学费信息
      const tuitionData = await this.getIntelligentTuitionAnalysis(userInput, universityData.website);

      return tuitionData;

    } catch (error) {
      console.error('Tuition query error:', error);
      // 降级到估算方法
      return await this.estimateTuition(university, program, level, country);
    }
  }

  private async getIntelligentTuitionAnalysis(
    userInput: UserInput, 
    universityWebsite: string
  ): Promise<TuitionData> {
    const { university, program, level, country } = userInput;
    
    try {
      // 构建智能分析提示词
      const analysisPrompt = `You are a tuition fee analysis expert. Your task is to find and calculate the tuition fees for a specific university program.
      
      University: ${university}
      Program: ${program}
      Level: ${level === 'undergraduate' ? 'Undergraduate/Bachelor' : 'Graduate/Master'}
      Country: ${country}
      University Website: ${universityWebsite}
      Current Year: ${new Date().getFullYear()}

      Please follow these steps:
      1. Search for the most accurate tuition fee information for this specific program
      2. Identify the billing structure (credit-based, semester-based, or annual)
      3. If credit-based, find the cost per credit and typical credit requirements
      4. If semester-based, find the cost per semester and program duration in semesters
      5. If annual, find the annual cost and program duration in years
      6. Calculate the total program tuition cost
      7. Evaluate the reliability of the information source
      8. Provide the information in the exact JSON format specified below

      Return ONLY a JSON object with this exact structure:
      {
        "amount": 45000,
        "currency": "${country === 'US' ? 'USD' : 'AUD'}",
        "period": "annual",
        "source": "https://official-university-source.com/tuition-page",
        "isEstimate": false,
        "lastUpdated": "2025-01-15T10:30:00.000Z",
        "confidence": 0.95,
        "billingStructure": "credit-based",
        "programDuration": "2 years",
        "calculationNotes": "Based on X credits at Y per credit",
        "alternativeSources": [
          "https://alternative-source-1.com",
          "https://alternative-source-2.com"
        ]
      }

      Important guidelines:
      - Use only official university sources when possible
      - If you must estimate, set "isEstimate" to true and lower the confidence score
      - Ensure the source URL is specific to the program if possible
      - For confidence: official sources = 0.9-1.0, educational databases = 0.7-0.9, estimates = 0.6 or below
      - Always include the calculation method you used
      `;

      // 使用搜索模型进行智能分析
      const analysisResponse = await openRouterClient.chat({
        model: SEARCH_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a precise data extraction and calculation expert. Always respond with valid JSON in the exact format specified.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        temperature: 0.1 // 低温度确保更一致的输出
      });

      // 提取结构化数据
      const tuitionData = await openRouterClient.extractStructuredData(
        analysisResponse,
        `{
          "amount": 45000,
          "currency": "${country === 'US' ? 'USD' : 'AUD'}",
          "period": "annual",
          "source": "https://official-university-source.com/tuition-page",
          "isEstimate": false,
          "lastUpdated": "2025-01-15T10:30:00.000Z",
          "confidence": 0.95,
          "billingStructure": "credit-based",
          "programDuration": "2 years",
          "calculationNotes": "Based on X credits at Y per credit"
        }`
      );

      // 验证和清理数据
      return {
        amount: tuitionData.amount,
        currency: tuitionData.currency,
        period: tuitionData.period,
        source: tuitionData.source,
        isEstimate: tuitionData.isEstimate,
        lastUpdated: tuitionData.lastUpdated || new Date().toISOString(),
        confidence: tuitionData.confidence
      };

    } catch (error) {
      console.error('Intelligent tuition analysis failed:', error);
      throw error;
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