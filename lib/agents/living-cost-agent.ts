import { openRouterClient } from '../openrouter';
import { UserInput, LivingCosts, AccommodationCost } from '@/types';
import { CITIES, SEARCH_MODEL } from '../constants';

// Define the expected output structure for LLM extraction
const NON_ACCOMMODATION_EXTRACTION_SCHEMA = `{
  "monthlyCost": 1668.8,
  "currency": "USD",
  "source": "https://www.numbeo.com/cost-of-living/in/New-York",
  "confidence": 0.9,
  "reasoning": "Based on Cost of Living data from numbeo.com"
}`;

export class LivingCostAgent {

  async analyzeLivingCosts(userInput: UserInput): Promise<Pick<LivingCosts, 'total' | 'currency' | 'period' | 'sources' | 'confidence'> & { accommodation?: AccommodationCost }> {
    const { country, city } = userInput;

    try {
      // 获取目标城市的单人生活成本（不含房租）
      const costData = await this.getCostOfLivingData(city!, country);

      const currency = country === 'US' ? 'USD' : 'AUD';

      return {
        total: {
          amount: costData.monthlyCost,
          range: {
            min: Math.round(costData.monthlyCost * 0.8),
            max: Math.round(costData.monthlyCost * 1.2)
          }
        },
        currency,
        period: 'monthly',
        sources: [costData.source].filter(Boolean) as string[],
        confidence: costData.confidence || 0.5
      };

    } catch (error) {
      console.error('Living cost analysis error:', error);
      // 使用后备估算
      return this.getFallbackLivingCosts(userInput);
    }
  }

  private async getCostOfLivingData(targetCity: string, country: 'US' | 'AU'): Promise<{ 
    monthlyCost: number;
    currency: 'USD' | 'AUD'; 
    source: string; 
    confidence?: number; 
    reasoning?: string 
  }> {
    try {
      // 构建分析提示词
      const analysisPrompt = `You are a cost of living analysis expert. Your task is to find the estimated monthly costs for a single person excluding rent for ${targetCity} from numbeo.com.
      
      CRITICAL INSTRUCTION: Only use data from numbeo.com. Find the exact "estimated monthly costs for a single person excluding rent" for ${targetCity}.

      Instructions:
      1. Search for the most recent "estimated monthly costs for a single person excluding rent" for ${targetCity} on numbeo.com
      2. Extract the exact cost value for the city
      3. Return the cost value, currency, source URL, confidence level, and brief reasoning
      4. Return ONLY a JSON object with the exact structure specified below

      CRITICAL RULES:
      - MUST provide a real, accessible URL from numbeo.com as the source
      - NEVER invent or estimate numbers without basis
      - If multiple values exist, use the most recent one
      - For confidence: direct data from numbeo = 0.8-0.9
      - ALWAYS return the result in the user's target country currency (USD for US, AUD for AU)

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
        monthlyCost: Number(extractedData.monthlyCost),
        currency: extractedData.currency as 'USD' | 'AUD',
        source: extractedData.source,
        confidence: extractedData.confidence,
        reasoning: extractedData.reasoning
      };

    } catch (error) {
      console.log('Real-time non-accommodation data unavailable, using estimates');
      // Return fallback based on country
      return {
        monthlyCost: country === 'US' ? 1500 : 1200,
        currency: country === 'US' ? 'USD' : 'AUD',
        source: 'https://www.numbeo.com/cost-of-living/',
        confidence: 0.6,
        reasoning: 'Fallback based on national average'
      };
    }
  }

  private getFallbackLivingCosts(userInput: UserInput): Pick<LivingCosts, 'total' | 'currency' | 'period' | 'sources' | 'confidence'> & { accommodation?: AccommodationCost } {
    const { country, lifestyle } = userInput;
    
    // 默认月度生活成本
    const defaultMonthlyCost = country === 'US' ? 1500 : 1200;
    
    const multiplier = lifestyle === 'economy' ? 0.8 : lifestyle === 'comfortable' ? 1.25 : 1.0;

    // 应用生活方式乘数
    const monthlyCost = Math.round(defaultMonthlyCost * multiplier);

    const currency = country === 'US' ? 'USD' : 'AUD';

    return {
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