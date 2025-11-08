import { openRouterClient } from '../openrouter';
import { safeLLMClient } from '../safe-llm-client';
import { UserInput, LivingCosts } from '@/types';
import { CITIES, LIFESTYLE_MULTIPLIERS, ACCOMMODATION_BASE_COSTS, SEARCH_MODEL } from '../constants';
import { adjustForLifestyle, calculateRange } from '../utils';

export class LivingCostAgent {
  async analyzeLivingCosts(userInput: UserInput): Promise<LivingCosts> {
    const { country, city, lifestyle, accommodation, diet, transportation } = userInput;

    try {
      // 获取城市基础数据
      const cityData = CITIES.find(c => c.name === city && c.country === country);

      if (!cityData) {
        throw new Error(`City data not found for ${city}, ${country}`);
      }

      // 获取实时生活成本数据
      const realTimeData = await this.getRealTimeLivingCosts(city, country);

      // 计算各项费用
      const accommodationCost = await this.calculateAccommodationCost(userInput, realTimeData?.accommodation_source);
      const foodCost = this.calculateFoodCost(country, lifestyle, diet, city, realTimeData?.food_source);
      const transportationCost = this.calculateTransportationCost(country, transportation, lifestyle, city, realTimeData?.transportation_source);
      const utilitiesCost = this.calculateUtilitiesCost(country, accommodation, lifestyle, realTimeData?.utilities_source);
      const entertainmentCost = this.calculateEntertainmentCost(country, lifestyle, city, realTimeData?.entertainment_source);
      const miscellaneousCost = this.calculateMiscellaneousCost(country, lifestyle, realTimeData?.miscellaneous_source);

      const totalMonthlyCost =
        accommodationCost.amount +
        foodCost.amount +
        transportationCost.amount +
        utilitiesCost.amount +
        entertainmentCost.amount +
        miscellaneousCost.amount;

      const currency = country === 'US' ? 'USD' : 'AUD';

      return {
        accommodation: accommodationCost,
        food: foodCost,
        transportation: transportationCost,
        utilities: utilitiesCost,
        entertainment: entertainmentCost,
        miscellaneous: miscellaneousCost,
        total: {
          amount: Math.round(totalMonthlyCost),
          range: calculateRange(totalMonthlyCost, 0.25)
        },
        currency,
        period: 'monthly',
        sources: [
          realTimeData?.source_url || 'https://www.numbeo.com',
          'https://www.expatistan.com'
        ].filter(Boolean) as string[],
        confidence: realTimeData?.confidence || 0.5
      };

    } catch (error) {
      console.error('Living cost analysis error:', error);
      // 使用后备估算
      return this.getFallbackLivingCosts(userInput);
    }
  }

  private async getRealTimeLivingCosts(city: string, country: 'US' | 'AU'): Promise<any> {
    try {
      const searchQuery = `${city} ${country} cost of living 2024 rent food transportation monthly expenses`;

      // 使用gpt-4o-search-preview模型进行搜索
      const searchResults = await safeLLMClient.safeSearch(searchQuery, '数据暂时不可用', SEARCH_MODEL);

      const fallbackData = {
        accommodation: country === 'US' ? 1800 : 1400,
        food: country === 'US' ? 450 : 380,
        transportation: country === 'US' ? 150 : 120,
        utilities: country === 'US' ? 180 : 150,
        entertainment: country === 'US' ? 300 : 250,
        miscellaneous: country === 'US' ? 200 : 180,
        total: country === 'US' ? 3080 : 2500,
        source_url: 'https://www.numbeo.com',
        accommodation_source: 'https://www.numbeo.com',
        food_source: 'https://www.numbeo.com',
        transportation_source: 'https://www.numbeo.com',
        utilities_source: 'https://www.numbeo.com',
        entertainment_source: 'https://www.numbeo.com',
        miscellaneous_source: 'https://www.numbeo.com',
        confidence: 0.7
      };

      return await safeLLMClient.extractLivingCosts(searchResults, fallbackData);
    } catch (error) {
      console.log('Real-time data unavailable, using estimates');
      return null;
    }
  }

  private async calculateAccommodationCost(
    userInput: UserInput,
    source?: string
  ) {
    const { country, city, accommodation, lifestyle } = userInput;
    const baseCost = ACCOMMODATION_BASE_COSTS[country][accommodation as keyof typeof ACCOMMODATION_BASE_COSTS['US']];

    // 城市调整系数
    const cityMultipliers = {
      'New York': 1.6,
      'San Francisco': 1.8,
      'Los Angeles': 1.4,
      'Cambridge': 1.5,
      'Sydney': 1.4,
      'Melbourne': 1.2,
      'Canberra': 1.1,
    };

    const cityMultiplier = (cityMultipliers as any)[city] || 1.0;
    const adjustedCost = adjustForLifestyle(baseCost * cityMultiplier, lifestyle as any);

    // 尝试获取更准确的住宿费用数据
    try {
      const searchQuery = `${userInput.university} ${city} ${country} student accommodation costs ${accommodation} ${new Date().getFullYear()} international students`;
      const searchResults = await safeLLMClient.safeSearch(searchQuery, '数据暂时不可用', SEARCH_MODEL);

      const fallbackData = {
        accommodation_cost: adjustedCost,
        source_url: source || 'https://www.numbeo.com',
        confidence: 0.6
      };

      const extractedData = await safeLLMClient.extractAccommodationCost(searchResults, fallbackData);

      if (extractedData && extractedData.accommodation_cost && extractedData.confidence > 0.7) {
        return {
          amount: Math.round(extractedData.accommodation_cost),
          type: accommodation,
          range: calculateRange(extractedData.accommodation_cost, 0.3),
          source: extractedData.source_url
        };
      }
    } catch (error) {
      console.log('Accommodation cost search failed, using estimates');
    }

    return {
      amount: Math.round(adjustedCost),
      type: accommodation,
      range: calculateRange(adjustedCost, 0.3),
      source: source
    };
  }

  private calculateFoodCost(
    country: 'US' | 'AU',
    lifestyle: string,
    diet?: string,
    city?: string,
    source?: string
  ) {
    const baseFood = country === 'US' ? 400 : 350; // 基础食物成本

    // 饮食调整
    const dietMultipliers = {
      'normal': 1.0,
      'vegetarian': 0.85,
      'halal': 1.1,
      'kosher': 1.2,
      'custom': 1.15
    };

    const dietMultiplier = (dietMultipliers as any)[diet || 'normal'];
    const adjustedCost = adjustForLifestyle(baseFood * dietMultiplier, lifestyle as any);

    return {
      amount: Math.round(adjustedCost),
      range: calculateRange(adjustedCost, 0.4),
      source: source
    };
  }

  private calculateTransportationCost(
    country: 'US' | 'AU',
    transportation?: string,
    lifestyle?: string,
    city?: string,
    source?: string
  ) {
    const transportCosts = {
      'walking': country === 'US' ? 50 : 40,
      'public': country === 'US' ? 120 : 100,
      'bike': country === 'US' ? 30 : 25,
      'car': country === 'US' ? 400 : 350
    };

    const baseCost = (transportCosts as any)[transportation || 'public'];
    const adjustedCost = adjustForLifestyle(baseCost, lifestyle as any);

    return {
      amount: Math.round(adjustedCost),
      range: calculateRange(adjustedCost, 0.3),
      source: source
    };
  }

  private calculateUtilitiesCost(
    country: 'US' | 'AU',
    accommodation: string,
    lifestyle: string,
    source?: string
  ) {
    const baseUtilities = country === 'US' ? 150 : 130;

    // 住宿类型调整
    const accommodationMultipliers = {
      'dormitory': 0.3, // 宿舍通常包含在费用中
      'shared': 0.5,
      'studio': 0.8,
      'apartment': 1.0
    };

    const accommodationMultiplier = (accommodationMultipliers as any)[accommodation];
    const adjustedCost = adjustForLifestyle(baseUtilities * accommodationMultiplier, lifestyle as any);

    return {
      amount: Math.round(adjustedCost),
      range: calculateRange(adjustedCost, 0.2),
      source: source
    };
  }

  private calculateEntertainmentCost(
    country: 'US' | 'AU',
    lifestyle: string,
    city?: string,
    source?: string
  ) {
    const baseEntertainment = country === 'US' ? 200 : 180;

    const adjustedCost = adjustForLifestyle(baseEntertainment, lifestyle as any);

    // 城市调整
    const cityMultipliers = {
      'New York': 1.4,
      'San Francisco': 1.5,
      'Los Angeles': 1.2,
      'Cambridge': 1.3,
      'Sydney': 1.3,
      'Melbourne': 1.2,
      'Canberra': 1.1,
    };

    const cityMultiplier = (cityMultipliers as any)[city] || 1.0;
    const finalCost = adjustedCost * cityMultiplier;

    return {
      amount: Math.round(finalCost),
      range: calculateRange(finalCost, 0.4),
      source: source
    };
  }

  private calculateMiscellaneousCost(
    country: 'US' | 'AU',
    lifestyle: string,
    source?: string
  ) {
    const baseMiscellaneous = country === 'US' ? 150 : 130;
    const adjustedCost = adjustForLifestyle(baseMiscellaneous, lifestyle as any);

    return {
      amount: Math.round(adjustedCost),
      range: calculateRange(adjustedCost, 0.3),
      source: source
    };
  }

  private getFallbackLivingCosts(userInput: UserInput): LivingCosts {
    const { country, lifestyle } = userInput;
    const currency = country === 'US' ? 'USD' : 'AUD';

    // 使用常量中的基础费用
    const baseCosts = ACCOMMODATION_BASE_COSTS[country];

    return {
      accommodation: {
        amount: baseCosts[userInput.accommodation as keyof typeof baseCosts],
        type: userInput.accommodation,
        range: calculateRange(baseCosts[userInput.accommodation as keyof typeof baseCosts], 0.3),
        source: '紧急后备数据'
      },
      food: {
        amount: country === 'US' ? 400 : 350,
        range: calculateRange(country === 'US' ? 400 : 350, 0.4),
        source: '紧急后备数据'
      },
      transportation: {
        amount: country === 'US' ? 120 : 100,
        range: calculateRange(country === 'US' ? 120 : 100, 0.3),
        source: '紧急后备数据'
      },
      utilities: {
        amount: country === 'US' ? 150 : 130,
        range: calculateRange(country === 'US' ? 150 : 130, 0.2),
        source: '紧急后备数据'
      },
      entertainment: {
        amount: country === 'US' ? 200 : 180,
        range: calculateRange(country === 'US' ? 200 : 180, 0.4),
        source: '紧急后备数据'
      },
      miscellaneous: {
        amount: country === 'US' ? 150 : 130,
        range: calculateRange(country === 'US' ? 150 : 130, 0.3),
        source: '紧急后备数据'
      },
      total: {
        amount: country === 'US' ? 2000 : 1800,
        range: calculateRange(country === 'US' ? 2000 : 1800, 0.25)
      },
      currency,
      period: 'monthly',
      sources: ['紧急后备数据'],
      confidence: 0.3
    };
  }
}