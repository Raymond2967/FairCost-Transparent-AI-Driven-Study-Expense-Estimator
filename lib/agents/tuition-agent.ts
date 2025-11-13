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
      const analysisPrompt = `You are a tuition fee analysis expert. Your task is to find and calculate the EXACT TOTAL tuition fees for a specific university program from official sources.
      
      University: ${university}
      Program: ${program}
      Level: ${level === 'undergraduate' ? 'Undergraduate/Bachelor' : 'Graduate/Master'}
      Country: ${country}
      University Website: ${universityWebsite}
      Current Year: ${new Date().getFullYear()}

      Instructions:
      1. Search for the most accurate and up-to-date tuition fee information for this specific program
      2. Locate official university documents like tuition fee schedules, handbooks, or PDFs
      3. Extract the EXACT figures from these official sources
      4. If the program has multiple fee types, select the one most relevant to international students
      5. Identify the billing structure (credit-based, semester-based, or annual)
      6. Find the cost per unit (credit/semester/year) AND the typical requirements (total credits/semesters/years)
      7. Calculate the TOTAL program tuition cost using: cost per unit × number of units
      8. Determine the program duration in years
      9. Verify your calculations and sources multiple times
      10. Provide the information in the exact JSON format specified below

      CRITICAL RULES:
      - ONLY use official university sources. Do not make up or estimate numbers.
      - If you cannot find the exact program, find the closest match within the same faculty/school
      - If only ranges are provided, use the midpoint
      - If multiple valid sources exist, use the most recent one
      - ALWAYS provide the direct link to the source document
      - NEVER invent or estimate tuition fees
      - ALWAYS return the TOTAL program cost, not per-credit, per-semester, or per-year costs
      - ALWAYS determine and return the program duration in years

      Return ONLY a JSON object with this exact structure:
      {
        "amount": 90000,
        "currency": "${country === 'US' ? 'USD' : 'AUD'}",
        "period": "total",
        "source": "https://official-university-source.com/tuition-page",
        "isEstimate": false,
        "lastUpdated": "2025-01-15T10:30:00.000Z",
        "confidence": 0.95,
        "programDuration": 2
      }

      Additional guidelines:
      - For confidence: official sources with exact numbers = 0.9-1.0, official sources with ranges = 0.8-0.9, closest matches = 0.7-0.8
      - Always include detailed calculation notes showing how you arrived at the total amount
      - If you cannot find reliable information, respond with isEstimate: true and confidence: 0.3
      `;

      // 使用搜索模型进行智能分析
      const analysisResponse = await openRouterClient.chat({
        model: SEARCH_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a precise data extraction and calculation expert. Always respond with valid JSON in the exact format specified. Accuracy is critical - do not invent or estimate numbers. You must return the TOTAL program cost and program duration.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        temperature: 0.0 // 更低的温度确保更一致和保守的输出
      });

      // 提取结构化数据
      const tuitionData = await openRouterClient.extractStructuredData(
        analysisResponse,
        `{
          "amount": 90000,
          "currency": "${country === 'US' ? 'USD' : 'AUD'}",
          "period": "total",
          "source": "https://official-university-source.com/tuition-page",
          "isEstimate": false,
          "lastUpdated": "2025-01-15T10:30:00.000Z",
          "confidence": 0.95,
          "programDuration": 2
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
        confidence: tuitionData.confidence,
        programDuration: tuitionData.programDuration
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
      const estimationPrompt = `As an expert on international education costs, estimate the TOTAL tuition fees for the entire program:

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
      5. Different billing structures (annual, semester, credit-based)
      6. Typical program duration in years

      CRITICAL: Return the TOTAL program cost, not per-credit, per-semester, or per-year costs.
      Also provide the estimated program duration in years.`;

      const estimationResponse = await openRouterClient.chat({
        model: SEARCH_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are an education cost analyst. Provide realistic tuition estimates based on market data and institutional knowledge. Return only structured data with TOTAL program cost and program duration.'
          },
          {
            role: 'user',
            content: estimationPrompt
          }
        ],
        temperature: 0.3
      });

      const extractionSchema = `{
        "estimated_tuition": 90000,
        "currency": "USD",
        "period": "total",
        "program_duration": 2,
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
          undergraduate: { public: 35000, private: 55000, duration: 4 },
          graduate: { public: 45000, private: 65000, duration: 2 }
        },
        AU: {
          undergraduate: { public: 35000, private: 45000, duration: 3 },
          graduate: { public: 40000, private: 50000, duration: 2 }
        }
      };

      const levelData = defaultEstimates[country][level];
      const fallbackAmount = levelData.private * levelData.duration; // 总费用 = 年费用 × 年数
      const currency = country === 'US' ? 'USD' : 'AUD';
      const fallbackDuration = levelData.duration;

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
        period: 'total',
        source: source,
        isEstimate: true,
        lastUpdated: new Date().toISOString(),
        confidence: confidence,
        programDuration: estimatedData?.program_duration || fallbackDuration
      };

    } catch (error) {
      console.error('Tuition estimation failed:', error);

      // 最终后备方案
      const emergency_estimates = {
        'US': { 'undergraduate': { amount: 180000, duration: 4 }, 'graduate': { amount: 110000, duration: 2 } },
        'AU': { 'undergraduate': { amount: 120000, duration: 3 }, 'graduate': { amount: 90000, duration: 2 } }
      };

      const levelData = emergency_estimates[country][level];

      return {
        amount: levelData.amount,
        currency: country === 'US' ? 'USD' : 'AUD',
        period: 'total',
        source: '基于市场平均数据的紧急估算',
        isEstimate: true,
        lastUpdated: new Date().toISOString(),
        confidence: 0.3, // 紧急估算置信度较低
        programDuration: levelData.duration
      };
    }
  }
}