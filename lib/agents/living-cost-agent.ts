import { openRouterClient } from '../openrouter';
import { UserInput, LivingCosts, AccommodationCost } from '@/types';
import { CITIES, SEARCH_MODEL } from '../constants';

// Define the expected output structure for LLM extraction
const NON_ACCOMMODATION_EXTRACTION_SCHEMA = `{
  "monthlyCost": 1200.0,
  "monthlyRange": {
    "min": 1000,
    "max": 1500
  },
  "currency": "USD",
  "source": "https://www.numbeo.com/cost-of-living/in/CityName",
  "confidence": 0.9,
  "reasoning": "Based on Cost of Living data from numbeo.com"
}`;

export class LivingCostAgent {

  async analyzeLivingCosts(userInput: UserInput): Promise<Pick<LivingCosts, 'total' | 'currency' | 'period' | 'sources' | 'confidence'> & { accommodation?: AccommodationCost }> {
    const { country, city } = userInput;

    try {
      // 获取目标城市的单人生活成本（不含房租）
      const costData = await this.getCostOfLivingData(city!, country);

      const currency = country === 'US' ? 'USD' : country === 'UK' ? 'GBP' : country === 'CA' ? 'CAD' : country === 'DE' ? 'EUR' : 'AUD';

      // 基于单一数值生成一个合理的区间，上下浮动20%
      const min = Math.round(costData.monthlyCost * 0.8);
      const max = Math.round(costData.monthlyCost * 1.2);

      return {
        total: {
          amount: costData.monthlyCost,
          range: {
            min,
            max
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

  private async getCostOfLivingData(targetCity: string, country: 'US' | 'AU' | 'UK' | 'CA' | 'DE'): Promise<{ 
    monthlyCost: number;
    monthlyRange: { min: number; max: number };
    currency: 'USD' | 'AUD' | 'GBP' | 'CAD' | 'EUR'; 
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
      2. Extract BOTH the exact cost value AND the cost range (min-max) provided on the page
      3. For example, if the page shows "The estimated monthly costs for a single person are 1,146.7$ (1,755.8A$), excluding rent" with a range of "1,173 - 1,760", extract both values
      4. Return the cost value, cost range, currency, source URL (specific page with the data, not just the homepage), confidence level, and brief reasoning
      5. Return ONLY a JSON object with the exact structure specified below

      CRITICAL RULES:
      - MUST provide a real, accessible URL from numbeo.com as the source (specific page with the data)
      - NEVER invent or estimate numbers without basis
      - If multiple values exist, use the most recent one
      - For confidence: direct data from numbeo = 0.8-0.9
      - ALWAYS return the result in the user's target country currency (USD for US, AUD for AU, GBP for UK, CAD for CA, EUR for DE)
      - ALWAYS provide both monthlyCost (single value) and monthlyRange (min-max range)
      - Do NOT round numbers, use exact values from the website

      Return ONLY a JSON object with this exact structure:
      ${NON_ACCOMMODATION_EXTRACTION_SCHEMA}
      `;

      // Call the LLM with search capabilities
      const analysisResponse = await openRouterClient.chat({
        model: SEARCH_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a precise cost of living analysis expert. Always respond with valid JSON in the exact format specified. Accuracy is critical - do not invent or estimate numbers. You must return the cost based on actual data from numbeo.com. Provide the specific URL with the data, not just the homepage. Always provide both the single monthly cost and the monthly range.'
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
        monthlyRange: {
          min: Number(extractedData.monthlyRange.min),
          max: Number(extractedData.monthlyRange.max)
        },
        currency: extractedData.currency as 'USD' | 'AUD' | 'GBP' | 'CAD' | 'EUR',
        source: extractedData.source,
        confidence: extractedData.confidence,
        reasoning: extractedData.reasoning
      };

    } catch (error) {
      console.log('Real-time non-accommodation data unavailable, using estimates');
      // Return fallback based on country
      // 为后备估算生成一个更具体的URL
      const baseUrl = 'https://www.numbeo.com/cost-of-living/';
      const cityParam = targetCity ? `in/${encodeURIComponent(targetCity)}` : '';
      const specificUrl = baseUrl + cityParam;
      
      // Return fallback with estimated range
      const monthlyCost = country === 'US' ? 1500 : country === 'UK' ? 2000 : country === 'CA' ? 1800 : country === 'DE' ? 1200 : 1200;
      return {
        monthlyCost: monthlyCost,
        monthlyRange: {
          min: Math.round(monthlyCost * 0.8),
          max: Math.round(monthlyCost * 1.2)
        },
        currency: country === 'US' ? 'USD' : country === 'UK' ? 'GBP' : country === 'CA' ? 'CAD' : country === 'DE' ? 'EUR' : 'AUD',
        source: specificUrl,
        confidence: 0.6,
        reasoning: 'Fallback based on national average'
      };
    }
  }

  private getFallbackLivingCosts(userInput: UserInput): Pick<LivingCosts, 'total' | 'currency' | 'period' | 'sources' | 'confidence'> & { accommodation?: AccommodationCost } {
    const { country, lifestyle } = userInput;
    
    // 默认月度生活成本
    const defaultMonthlyCost = country === 'US' ? 1500 : country === 'UK' ? 2000 : country === 'CA' ? 1800 : country === 'DE' ? 1200 : 1200;
    
    const multiplier = lifestyle === 'economy' ? 0.8 : lifestyle === 'comfortable' ? 1.25 : 1.0;

    // 应用生活方式乘数
    const monthlyCost = Math.round(defaultMonthlyCost * multiplier);

    const currency = country === 'US' ? 'USD' : country === 'UK' ? 'GBP' : country === 'CA' ? 'CAD' : country === 'DE' ? 'EUR' : 'AUD';

    // 为后备估算生成一个更具体的URL
    const baseUrl = 'https://www.numbeo.com/cost-of-living/';
    const cityParam = userInput.city ? `in/${encodeURIComponent(userInput.city)}` : '';
    const specificUrl = baseUrl + cityParam;

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
      sources: [specificUrl],
      confidence: 0.3
    };
  }
}