import { openRouterClient } from '../openrouter';
import { safeLLMClient } from '../safe-llm-client';
import { UserInput, TuitionData } from '@/types';
import { US_UNIVERSITIES, AU_UNIVERSITIES, UK_UNIVERSITIES, CA_UNIVERSITIES, DE_UNIVERSITIES, SEARCH_MODEL } from '../constants';

export class TuitionAgent {
  async queryTuition(userInput: UserInput): Promise<TuitionData> {
    const { country, university, program, level } = userInput;

    try {
      // 直接从常量中获取大学网站信息，不依赖programs字段
      const universityData = [...US_UNIVERSITIES, ...AU_UNIVERSITIES, ...UK_UNIVERSITIES, ...CA_UNIVERSITIES, ...DE_UNIVERSITIES].find(
        uni => uni.name === university
      );

      if (!universityData) {
        throw new Error(`University not found in database: ${university}`);
      }

      // 使用智能搜索和推理获取学费信息
      const tuitionData = await this.getIntelligentTuitionAnalysis(userInput, universityData.website);

      // 验证返回的数据是否合理
      if (tuitionData.isEstimate || tuitionData.confidence < 0.7) {
        // 如果是估算数据或置信度较低，使用后备估算
        return await this.estimateTuition(university, program, level, country);
      }

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
      
      CRITICAL INSTRUCTION: Pay EXTREMELY careful attention to the program level. 
      Many universities have DIFFERENT tuition fees for undergraduate and graduate programs, even for programs with the same name.
      You MUST find the fees for the CORRECT program level specified below.
      
      University: ${university}
      Program: ${program}
      Level: ${level === 'undergraduate' ? 'Undergraduate/Bachelor' : 'Graduate/Master'}
      Country: ${country}
      University Website: ${universityWebsite}
      Current Year: ${new Date().getFullYear()}

      Instructions:
      1. Search for the most accurate and up-to-date tuition fee information for this specific program at the specified level
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
      - ALWAYS provide the direct link to the source document - it must be a real URL, not a placeholder
      - NEVER invent or estimate tuition fees
      - ALWAYS return the TOTAL program cost, not per-credit, per-semester, or per-year costs
      - ALWAYS determine and return the program duration in years
      - CRITICAL: Make sure the program level matches EXACTLY what was requested (Undergraduate/Bachelor vs Graduate/Master)
      - If you find fees for the wrong program level, continue searching until you find the correct level
      - If you cannot find reliable information, respond with isEstimate: true and confidence: 0.3
      - CRITICAL: The source URL must be a real, accessible URL from the university website, not a placeholder like "official-university-source.com"

      Return ONLY a JSON object with this exact structure:
      {
        "total": 90000,
        "currency": "${country === 'US' ? 'USD' : country === 'UK' ? 'GBP' : country === 'CA' ? 'CAD' : country === 'DE' ? 'EUR' : 'AUD'}",
        "source": "https://www.university.edu/official/tuition-page",
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
            content: 'You are a precise data extraction and calculation expert. Always respond with valid JSON in the exact format specified. Accuracy is critical - do not invent or estimate numbers. You must return the TOTAL program cost and program duration. Pay EXTREMELY careful attention to ensuring the program level (Undergraduate vs Graduate/Master) matches exactly what was requested. If you accidentally find data for the wrong level, you must continue searching until you find the correct level. If you cannot find reliable information, respond with isEstimate: true and confidence: 0.3. CRITICAL: The source URL must be a real, accessible URL from the university website, not a placeholder like "official-university-source.com"'
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
          "total": 90000,
          "currency": "${country === 'US' ? 'USD' : country === 'UK' ? 'GBP' : country === 'CA' ? 'CAD' : country === 'DE' ? 'EUR' : 'AUD'}",
          "source": "https://www.university.edu/official/tuition-page",
          "isEstimate": false,
          "lastUpdated": "2025-01-15T10:30:00.000Z",
          "confidence": 0.95,
          "programDuration": 2
        }`
      );

      // 验证和清理数据
      // 检查源URL是否是真实URL而不是占位符
      if (!tuitionData.source || 
          tuitionData.source.includes('official-university-source.com') ||
          tuitionData.source.includes('example.com') ||
          tuitionData.source.includes('placeholder')) {
        throw new Error('Invalid source URL - placeholder detected');
      }

      return {
        total: tuitionData.total,
        currency: tuitionData.currency,
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
    country: 'US' | 'AU' | 'UK' | 'CA' | 'DE'
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
            content: 'You are an education cost analyst. Provide realistic tuition estimates based on market data and institutional knowledge. Return only structured data with TOTAL program cost and program duration. If you can find any official university data, use that instead of estimates.'
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
        "programDuration": 2,
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
        },
        UK: {
          undergraduate: { public: 25000, private: 40000, duration: 3 },
          graduate: { public: 30000, private: 45000, duration: 1 }
        },
        CA: {
          undergraduate: { public: 20000, private: 35000, duration: 4 },
          graduate: { public: 15000, private: 30000, duration: 2 }
        },
        DE: {
          undergraduate: { public: 2000, private: 25000, duration: 3 },
          graduate: { public: 2000, private: 30000, duration: 2 }
        }
      };

      const levelData = defaultEstimates[country][level];
      const fallbackAmount = levelData.private * levelData.duration; // 总费用 = 年费用 × 年数
      const currency = country === 'US' ? 'USD' : country === 'UK' ? 'GBP' : country === 'CA' ? 'CAD' : country === 'DE' ? 'EUR' : 'AUD';
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

      // 验证源URL是否是真实的URL而不是占位符
      let source = estimatedData?.source_url || `基于${university}同类项目市场数据的估算`;
      if (source.includes('official-university-source.com') || 
          source.includes('example.com') || 
          source.includes('placeholder')) {
        source = `基于${university}同类项目市场数据的估算`;
      }

      return {
        total: estimatedData?.estimated_tuition || fallbackAmount,
        currency: currency as 'USD' | 'AUD' | 'GBP' | 'CAD' | 'EUR',
        source: source,
        isEstimate: true,
        lastUpdated: new Date().toISOString(),
        confidence: confidence,
        programDuration: estimatedData?.programDuration || fallbackDuration
      };

    } catch (error) {
      console.error('Tuition estimation failed:', error);

      // 最终后备方案
      const emergency_estimates = {
        'US': { 'undergraduate': { amount: 180000, duration: 4 }, 'graduate': { amount: 110000, duration: 2 } },
        'AU': { 'undergraduate': { amount: 120000, duration: 3 }, 'graduate': { amount: 90000, duration: 2 } },
        'UK': { 'undergraduate': { amount: 100000, duration: 3 }, 'graduate': { amount: 60000, duration: 1 } },
        'CA': { 'undergraduate': { amount: 80000, duration: 4 }, 'graduate': { amount: 50000, duration: 2 } },
        'DE': { 'undergraduate': { amount: 15000, duration: 3 }, 'graduate': { amount: 20000, duration: 2 } }
      };

      const levelData = emergency_estimates[country][level];

      return {
        total: levelData.amount,
        currency: country === 'US' ? 'USD' : country === 'UK' ? 'GBP' : country === 'CA' ? 'CAD' : country === 'DE' ? 'EUR' : 'AUD',
        source: `基于${country}国家平均数据的紧急估算`,
        isEstimate: true,
        lastUpdated: new Date().toISOString(),
        confidence: 0.3, // 紧急估算置信度较低
        programDuration: levelData.duration
      };
    }
  }
}