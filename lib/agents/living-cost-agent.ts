import { openRouterClient } from '../openrouter';
import { safeLLMClient } from '../safe-llm-client';
import { UserInput, LivingCosts } from '@/types';
import { CITIES, SEARCH_MODEL } from '../constants';
import { AccommodationAgent } from '../agents/accommodation-agent';

// Define the expected output structure for LLM extraction
const NON_ACCOMMODATION_EXTRACTION_SCHEMA = `{
  "monthly": 1380,
  "currency": "USD",
  "source": "https://www.numbeo.com/cost-of-living/",
  "confidence": 0.8,
  "reasoning": "Based on Cost of Living Index (Excl. Rent) from numbeo.com"
}`;

export class LivingCostAgent {
  private accommodationAgent: AccommodationAgent;

  constructor() {
    this.accommodationAgent = new AccommodationAgent();
  }

  async analyzeLivingCosts(userInput: UserInput): Promise<LivingCosts> {
    const { country, city, lifestyle } = userInput;

    try {
      // 获取城市基础数据
      const cityData = CITIES.find(c => c.name === city && c.country === country);

      if (!cityData) {
        throw new Error(`City data not found for ${city}, ${country}`);
      }

      // 获取非住宿生活成本从Numbeo
      const nonAccommodationCost = await this.getNonAccommodationCostFromNumbeo(city!, country);

      // 获取住宿成本（使用单独的agent）
      const accommodationCost = await this.accommodationAgent.queryAccommodationCosts(userInput);

      const currency = country === 'US' ? 'USD' : 'AUD';

      return {
        accommodation: accommodationCost,
        total: {
          amount: nonAccommodationCost.monthly,
          range: {
            min: Math.round(nonAccommodationCost.monthly * 0.8),
            max: Math.round(nonAccommodationCost.monthly * 1.2)
          }
        },
        currency,
        period: 'monthly',
        sources: [
          nonAccommodationCost.source,
          accommodationCost.source
        ].filter(Boolean) as string[],
        confidence: nonAccommodationCost.confidence || 0.5
      };

    } catch (error) {
      console.error('Living cost analysis error:', error);
      // 使用后备估算
      return this.getFallbackLivingCosts(userInput);
    }
  }

  private async getNonAccommodationCostFromNumbeo(city: string, country: 'US' | 'AU'): Promise<{ monthly: number; currency: 'USD' | 'AUD'; source: string; confidence?: number; reasoning?: string }> {
    try {
      // 专注于从numbeo.com获取非住宿生活成本指数
      const searchQuery = `site:numbeo.com \"Cost of Living Index (Excl. Rent)\" \"${city}\"`;
      
      // 构建分析提示词
      const analysisPrompt = `You are a cost of living analysis expert. Your task is to find the Cost of Living Index (Excluding Rent) for ${city}, ${country} from numbeo.com.
      
      CRITICAL INSTRUCTION: Only use data from numbeo.com. Find the exact "Cost of Living Index (Excl. Rent)" value for the specified city.
      
      Current Year: ${new Date().getFullYear()}
      
      Instructions:
      1. Search for the most recent Cost of Living Index (Excl. Rent) for ${city}, ${country} on numbeo.com
      2. Extract the index value and convert it to an estimated monthly cost in local currency
      3. Use New York as baseline (index 100 = $1380/month for US, $1180/month for AU)
      4. Calculate estimated monthly cost: (city_index / 100) * baseline_cost
      5. Return the monthly amount, currency, source URL, confidence level, and brief reasoning
      6. Return ONLY a JSON object with the exact structure specified below
      
      CRITICAL RULES:
      - MUST provide a real, accessible URL from numbeo.com as the source
      - NEVER invent or estimate numbers without basis
      - If multiple values exist, use the most recent one
      - For confidence: direct data from numbeo = 0.8-0.9, calculated from index = 0.7-0.8
      - ALWAYS return the result in the user's country currency (USD for US, AUD for AU)
      
      Return ONLY a JSON object with this exact structure:
      ${NON_ACCOMMODATION_EXTRACTION_SCHEMA}
      `;

      // Call the LLM with search capabilities
      const analysisResponse = await openRouterClient.chat({
        model: SEARCH_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a precise cost of living analysis expert. Always respond with valid JSON in the exact format specified. Accuracy is critical - do not invent or estimate numbers. You must return the cost based on actual data from numbeo.com.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        temperature: 0.0
      });

      // Extract structured data using the defined schema
      const extractedData = await openRouterClient.extractStructuredData(
        analysisResponse,
        NON_ACCOMMODATION_EXTRACTION_SCHEMA
      );

      // Validate and return the result
      return {
        monthly: Math.round(extractedData.monthly),
        currency: extractedData.currency as 'USD' | 'AUD',
        source: extractedData.source,
        confidence: extractedData.confidence,
        reasoning: extractedData.reasoning
      };

    } catch (error) {
      console.log('Real-time non-accommodation data unavailable, using estimates');
      // Return fallback based on country
      const baseline = country === 'US' ? 1380 : 1180;
      return {
        monthly: baseline,
        currency: country === 'US' ? 'USD' : 'AUD',
        source: 'https://www.numbeo.com/cost-of-living/',
        confidence: 0.6,
        reasoning: 'Fallback based on national average'
      };
    }
  }

  private getFallbackLivingCosts(userInput: UserInput): LivingCosts {
    const { country, lifestyle } = userInput;
    
    // 基础月度生活成本（不含住宿）
    const baseMonthlyCost = country === 'US' ? 1380 : 1180;
    const multiplier = lifestyle === 'economy' ? 0.8 : lifestyle === 'comfortable' ? 1.25 : 1.0;

    // 应用生活方式乘数
    const monthlyCost = Math.round(baseMonthlyCost * multiplier);

    // 获取住宿成本
    const accommodationCost = this.accommodationAgent.getFallbackAccommodationCost(userInput);

    const currency = country === 'US' ? 'USD' : 'AUD';

    return {
      accommodation: accommodationCost,
      total: {
        amount: monthlyCost,
        range: { 
          min: Math.round(monthlyCost * 0.8), 
          max: Math.round(monthlyCost * 1.2) 
        }
      },
      currency,
      period: 'monthly',
      sources: ['https://www.numbeo.com/cost-of-living/'],
      confidence: 0.3
    };
  }
}