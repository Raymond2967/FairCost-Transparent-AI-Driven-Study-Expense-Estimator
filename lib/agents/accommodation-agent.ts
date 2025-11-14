import { openRouterClient } from '../openrouter';
import { UserInput } from '@/types';
import { SEARCH_MODEL } from '../constants';

// Define the expected output structure for LLM extraction
const ACCOMMODATION_EXTRACTION_SCHEMA = `{
  "monthlyRange": {
    "min": 800,
    "max": 1400
  },
  "currency": "USD",
  "source": "https://www.numbeo.com/cost-of-living/",
  "confidence": 0.8,
  "reasoning": "Based on analysis of official housing data for the specified city and accommodation type"
}`;

export interface AccommodationCost {
  monthlyRange: {
    min: number;
    max: number;
  };
  currency: 'USD' | 'AUD';
  source: string;
  confidence?: number;
  reasoning?: string;
}

export class AccommodationAgent {
  async queryAccommodationCosts(userInput: UserInput): Promise<AccommodationCost> {
    const { country, city, accommodation } = userInput;

    try {
      // Build search query focusing on official housing sources
      const searchQuery = `site:numbeo.com OR site:student.com OR site:unilodgers.com \"${city}\" \"housing cost\" \"${this.getAccommodationTypeLabel(accommodation)}\"`;
      
      // Use intelligent analysis to find accommodation costs
      const analysisPrompt = `You are a housing cost analysis expert. Your task is to find and estimate the monthly accommodation costs for international students in ${city}, ${country}.
      
      CRITICAL INSTRUCTION: Find reliable data from official university housing pages, student accommodation platforms, or government housing statistics.
      
      User's accommodation preference: ${this.getAccommodationTypeLabel(accommodation)}
      Country: ${country}
      Current Year: ${new Date().getFullYear()}
      
      Instructions:
      1. Search for the most accurate and up-to-date accommodation cost information for ${city}, ${country}
      2. Focus on reliable sources like university housing offices, student accommodation websites, or government housing departments
      3. Extract monthly rental prices for the user's preferred accommodation type
      4. Provide a realistic price range (minimum and maximum) based on market data
      5. Identify the currency used in the source
      6. Include the direct URL to the source document
      7. Assess your confidence level (0.0-1.0) based on source reliability
      8. Explain your reasoning briefly
      9. Return ONLY a JSON object with the exact structure specified below
      
      CRITICAL RULES:
      - MUST provide a real, accessible URL as the source
      - NEVER invent or estimate numbers without basis
      - If multiple sources exist, use the most recent and reliable one
      - For confidence: official sources with exact data = 0.8-1.0, reputable third-party sites = 0.6-0.8, limited data = 0.4-0.6
      - ALWAYS return a price range, not a single value
      
      Return ONLY a JSON object with this exact structure:
      ${ACCOMMODATION_EXTRACTION_SCHEMA}
      `;

      // Call the LLM with search capabilities
      const analysisResponse = await openRouterClient.chat({
        model: SEARCH_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a precise housing cost analysis expert. Always respond with valid JSON in the exact format specified. Accuracy is critical - do not invent or estimate numbers. You must return a realistic price range based on actual market data.'
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
        ACCOMMODATION_EXTRACTION_SCHEMA
      );

      // Validate and return the result
      return {
        monthlyRange: {
          min: Math.round(extractedData.monthlyRange.min),
          max: Math.round(extractedData.monthlyRange.max)
        },
        currency: extractedData.currency as 'USD' | 'AUD',
        source: extractedData.source,
        confidence: extractedData.confidence,
        reasoning: extractedData.reasoning
      };

    } catch (error) {
      console.error('Accommodation cost query failed:', error);
      // Return fallback values based on general estimates
      return this.getFallbackAccommodationCost(userInput);
    }
  }

  private getAccommodationTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'dormitory': 'university dormitory',
      'shared': 'shared apartment',
      'studio': 'studio apartment',
      'apartment': 'private apartment'
    };
    return labels[type] || type;
  }

  private getFallbackAccommodationCost(userInput: UserInput): AccommodationCost {
    const { country, accommodation } = userInput;
    
    // Base monthly ranges by country and accommodation type
    const baseRanges = {
      US: {
        dormitory: { min: 800, max: 1400 },
        shared: { min: 1000, max: 1800 },
        studio: { min: 1400, max: 2200 },
        apartment: { min: 1600, max: 2500 }
      },
      AU: {
        dormitory: { min: 700, max: 1200 },
        shared: { min: 900, max: 1500 },
        studio: { min: 1200, max: 1800 },
        apartment: { min: 1400, max: 2200 }
      }
    };
    
    const countryRanges = baseRanges[country];
    const range = countryRanges?.[accommodation] || countryRanges['shared'];
    const currency = country === 'US' ? 'USD' : 'AUD';
    
    return {
      monthlyRange: range,
      currency,
      source: 'https://www.numbeo.com/cost-of-living/',
      confidence: 0.4,
      reasoning: 'Fallback estimate based on general market data for the region'
    };
  }
}