import { openRouterClient } from '../openrouter';
import { UserInput } from '@/types';
import { SEARCH_MODEL } from '../constants';

// Define the expected output structure for LLM extraction
const ACCOMMODATION_EXTRACTION_SCHEMA = `{
  "cityCentre1Beds": {
    "average": 1200.00,
    "range": {
      "min": 1000.00,
      "max": 1500.00
    }
  },
  "outsideCityCentre1Beds": {
    "average": 900.00,
    "range": {
      "min": 700.00,
      "max": 1200.00
    }
  },
  "cityCentre3Beds": {
    "average": 2400.00,
    "range": {
      "min": 2000.00,
      "max": 3000.00
    }
  },
  "outsideCityCentre3Beds": {
    "average": 1800.00,
    "range": {
      "min": 1500.00,
      "max": 2500.00
    }
  },
  "currency": "USD",
  "source": "https://www.numbeo.com/cost-of-living/in/CityName",
  "confidence": 0.9,
  "reasoning": "Based on analysis of official housing data for the specified city and accommodation type"
}`;

export interface AccommodationCost {
  monthlyRange: {
    min: number;
    max: number;
  };
  currency: 'USD' | 'AUD' | 'GBP' | 'CAD' | 'EUR' | 'HKD' | 'MOP' | 'SGD';
  source: string;
  confidence?: number;
  reasoning?: string;
}

export class AccommodationAgent {
  async queryAccommodationCosts(userInput: UserInput): Promise<AccommodationCost> {
    const { country, city, accommodation, locationPreference } = userInput;

    try {
      // Use intelligent analysis to find accommodation costs
      const analysisPrompt = `You are a housing cost analysis expert. Your task is to find and extract the EXACT monthly rental prices from the "Rent Per Month" section in ${city}, ${country} from numbeo.com.
      
      CRITICAL INSTRUCTION: You MUST extract the EXACT min-max ranges as shown on numbeo.com. DO NOT make up numbers.
      
      Country: ${country}
      City: ${city}
      Current Year: ${new Date().getFullYear()}
      
      Instructions:
      1. Go to numbeo.com/cost-of-living/in/${encodeURIComponent(city)} for ${city}, ${country}
      2. Find the "Rent Per Month" table
      3. Extract the EXACT data for these four categories:
         - 1 Bedroom Apartment in City Centre -> cityCentre1Beds
         - 1 Bedroom Apartment Outside of City Centre -> outsideCityCentre1Beds
         - 3 Bedroom Apartment in City Centre -> cityCentre3Beds
         - 3 Bedroom Apartment Outside of City Centre -> outsideCityCentre3Beds
      4. For each category, extract the average price and the EXACT price range (min-max) as shown on the website
      5. Identify the currency used in the source
      6. Include the direct URL to the source document
      7. Assess your confidence level (0.0-1.0) based on source reliability
      8. Explain your reasoning briefly
      9. Return ONLY a JSON object with the exact structure specified below
      
      CRITICAL RULES:
      - MUST provide a real, accessible URL as the source (the specific numbeo page with the data)
      - NEVER invent or estimate numbers without basis
      - If multiple sources exist, use the most recent and reliable one from numbeo.com
      - For confidence: direct data from numbeo = 0.8-1.0
      - ALWAYS return all four categories with both average and range data
      - Make sure the min and max values in the range are EXACTLY as shown on numbeo.com
      - Do NOT round the numbers - use the exact values from the website
      
      Example from the website:
      "1 Bedroom Apartment in City Centre     3,409.72 A$     2,800.00-4,800.00"
      Should become:
      "cityCentre1Beds": {
        "average": 3409.72,
        "range": {
          "min": 2800.00,
          "max": 4800.00
        }
      }
      
      Return ONLY a JSON object with this exact structure:
      ${ACCOMMODATION_EXTRACTION_SCHEMA}
      `;

      // Call the LLM with search capabilities
      const analysisResponse = await openRouterClient.chat({
        model: SEARCH_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a precise housing cost analysis expert. Always respond with valid JSON in the exact format specified. Accuracy is critical - do not invent or estimate numbers. You must return rental data based on actual numbeo.com information. Make sure the min and max values in the range are EXACTLY as shown on numbeo.com. Do NOT round the numbers - use the exact values from the website.'
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

      // Calculate the appropriate range based on user preferences
      let selectedRange;
      let bedrooms;
      
      switch (accommodation) {
        case 'dormitory':
          // For dormitory, use a reduced rate compared to 1 bedroom
          bedrooms = 1;
          if (locationPreference === 'cityCentre') {
            selectedRange = {
              min: Math.round(extractedData.cityCentre1Beds.range.min * 0.7),
              max: Math.round(extractedData.cityCentre1Beds.range.max * 0.7)
            };
          } else {
            selectedRange = {
              min: Math.round(extractedData.outsideCityCentre1Beds.range.min * 0.7),
              max: Math.round(extractedData.outsideCityCentre1Beds.range.max * 0.7)
            };
          }
          break;
          
        case 'shared':
          // For shared accommodations, use 1 bedroom data and divide accordingly
          bedrooms = 1;
          if (locationPreference === 'cityCentre') {
            selectedRange = extractedData.cityCentre1Beds.range;
          } else {
            selectedRange = extractedData.outsideCityCentre1Beds.range;
          }
          // For shared accommodation, divide the price by number of roommates (assume 2 for shared)
          if (accommodation === 'shared') {
            selectedRange = {
              min: Math.round(selectedRange.min / 2),
              max: Math.round(selectedRange.max / 2)
            };
          }
          break;
          
        case 'studio':
          // For studio, use 1 bedroom data
          bedrooms = 1;
          if (locationPreference === 'cityCentre') {
            selectedRange = extractedData.cityCentre1Beds.range;
          } else {
            selectedRange = extractedData.outsideCityCentre1Beds.range;
          }
          break;
          
        case 'apartment':
          // For apartment, use 3 bedroom data
          bedrooms = 3;
          if (locationPreference === 'cityCentre') {
            selectedRange = extractedData.cityCentre3Beds.range;
          } else {
            selectedRange = extractedData.outsideCityCentre3Beds.range;
          }
          break;
          
        default:
          // Default to 1 bedroom data
          bedrooms = 1;
          if (locationPreference === 'cityCentre') {
            selectedRange = extractedData.cityCentre1Beds.range;
          } else {
            selectedRange = extractedData.outsideCityCentre1Beds.range;
          }
      }

      // Validate and return the result
      return {
        monthlyRange: {
          min: Math.round(selectedRange.min),
          max: Math.round(selectedRange.max)
        },
        currency: extractedData.currency as 'USD' | 'AUD' | 'GBP' | 'CAD' | 'EUR' | 'HKD' | 'MOP' | 'SGD',
        source: extractedData.source,
        confidence: extractedData.confidence,
        reasoning: `Based on ${bedrooms} bedroom ${locationPreference === 'cityCentre' ? 'city centre' : 'outside city centre'} apartment data from Numbeo. ${accommodation === 'shared' ? 'Price divided by 2 for shared accommodation.' : accommodation === 'dormitory' ? 'Price reduced by 30% for dormitory accommodation.' : ''} ${extractedData.reasoning || ''}`
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
    const { country, accommodation, locationPreference } = userInput;
    
    // Base monthly ranges by country, accommodation type, and location preference
    const baseRanges = {
      US: {
        cityCentre: {
          dormitory: { min: 800, max: 1400 },
          shared: { min: 500, max: 900 },
          studio: { min: 1400, max: 2200 },
          apartment: { min: 2000, max: 3500 }
        },
        outsideCityCentre: {
          dormitory: { min: 600, max: 1100 },
          shared: { min: 400, max: 700 },
          studio: { min: 1000, max: 1700 },
          apartment: { min: 1500, max: 2800 }
        }
      },
      AU: {
        cityCentre: {
          dormitory: { min: 700, max: 1200 },
          shared: { min: 450, max: 750 },
          studio: { min: 1200, max: 1800 },
          apartment: { min: 1800, max: 3000 }
        },
        outsideCityCentre: {
          dormitory: { min: 500, max: 900 },
          shared: { min: 350, max: 600 },
          studio: { min: 900, max: 1400 },
          apartment: { min: 1300, max: 2200 }
        }
      },
      UK: {
        cityCentre: {
          dormitory: { min: 600, max: 1100 },
          shared: { min: 400, max: 700 },
          studio: { min: 900, max: 1500 },
          apartment: { min: 1400, max: 2500 }
        },
        outsideCityCentre: {
          dormitory: { min: 500, max: 900 },
          shared: { min: 300, max: 600 },
          studio: { min: 700, max: 1200 },
          apartment: { min: 1100, max: 2000 }
        }
      },
      CA: {
        cityCentre: {
          dormitory: { min: 700, max: 1200 },
          shared: { min: 500, max: 800 },
          studio: { min: 1100, max: 1700 },
          apartment: { min: 1600, max: 2800 }
        },
        outsideCityCentre: {
          dormitory: { min: 600, max: 1000 },
          shared: { min: 400, max: 700 },
          studio: { min: 900, max: 1400 },
          apartment: { min: 1300, max: 2200 }
        }
      },
      DE: {
        cityCentre: {
          dormitory: { min: 300, max: 600 },
          shared: { min: 350, max: 650 },
          studio: { min: 500, max: 900 },
          apartment: { min: 700, max: 1300 }
        },
        outsideCityCentre: {
          dormitory: { min: 250, max: 500 },
          shared: { min: 300, max: 550 },
          studio: { min: 400, max: 750 },
          apartment: { min: 600, max: 1100 }
        }
      },
      HK: {
        cityCentre: {
          dormitory: { min: 6000, max: 10000 },
          shared: { min: 8000, max: 12000 },
          studio: { min: 10000, max: 15000 },
          apartment: { min: 12000, max: 20000 }
        },
        outsideCityCentre: {
          dormitory: { min: 4000, max: 8000 },
          shared: { min: 6000, max: 10000 },
          studio: { min: 8000, max: 12000 },
          apartment: { min: 10000, max: 16000 }
        }
      },
      MO: {
        cityCentre: {
          dormitory: { min: 4000, max: 8000 },
          shared: { min: 6000, max: 10000 },
          studio: { min: 8000, max: 12000 },
          apartment: { min: 10000, max: 16000 }
        },
        outsideCityCentre: {
          dormitory: { min: 3000, max: 6000 },
          shared: { min: 5000, max: 8000 },
          studio: { min: 7000, max: 10000 },
          apartment: { min: 8000, max: 13000 }
        }
      },
      SG: {
        cityCentre: {
          dormitory: { min: 800, max: 1200 },
          shared: { min: 1000, max: 1500 },
          studio: { min: 1200, max: 1800 },
          apartment: { min: 1500, max: 2500 }
        },
        outsideCityCentre: {
          dormitory: { min: 600, max: 1000 },
          shared: { min: 800, max: 1200 },
          studio: { min: 1000, max: 1500 },
          apartment: { min: 1200, max: 2000 }
        }
      }
    };
    
    const countryRanges = (baseRanges as any)[country];
    const locationRanges = countryRanges?.[locationPreference] || countryRanges?.cityCentre;
    const range = locationRanges?.[accommodation] || locationRanges?.shared;
    const currency = country === 'US' ? 'USD' : country === 'UK' ? 'GBP' : country === 'CA' ? 'CAD' : country === 'DE' ? 'EUR' : country === 'HK' ? 'HKD' : country === 'MO' ? 'MOP' : 'SGD';
    
    // 为后备估算生成一个更具体的URL
    const baseUrl = 'https://www.numbeo.com/cost-of-living/';
    const cityParam = userInput.city ? `in/${encodeURIComponent(userInput.city)}` : '';
    const specificUrl = baseUrl + cityParam;
    
    return {
      monthlyRange: range,
      currency,
      source: specificUrl,
      confidence: 0.4,
      reasoning: 'Fallback estimate based on general market data for the region'
    };
  }
}