import { openRouterClient } from '../openrouter';
import { UserInput, LivingCosts } from '@/types';
import { CITIES, LIFESTYLE_MULTIPLIERS, ACCOMMODATION_BASE_COSTS } from '../constants';
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
      const accommodationCost = this.calculateAccommodationCost(country, accommodation, lifestyle, city);
      const foodCost = this.calculateFoodCost(country, lifestyle, diet, city);
      const transportationCost = this.calculateTransportationCost(country, transportation, lifestyle, city);
      const utilitiesCost = this.calculateUtilitiesCost(country, accommodation, lifestyle);
      const entertainmentCost = this.calculateEntertainmentCost(country, lifestyle, city);
      const miscellaneousCost = this.calculateMiscellaneousCost(country, lifestyle);

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
          'https://www.numbeo.com',
          'https://www.expatistan.com',
          realTimeData?.source || '官方统计数据'
        ]
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

      const searchResults = await openRouterClient.searchWeb(searchQuery);

      const extractionSchema = `{
        "rent_1br": number,
        "rent_3br": number,
        "food_monthly": number,
        "transportation_monthly": number,
        "utilities_monthly": number,
        "entertainment_monthly": number,
        "source": "string"
      }`;

      return await openRouterClient.extractStructuredData(searchResults, extractionSchema);
    } catch (error) {
      console.log('Real-time data unavailable, using estimates');
      return null;
    }
  }

  private calculateAccommodationCost(
    country: 'US' | 'AU',
    accommodation: string,
    lifestyle: string,
    city: string
  ) {
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

    return {
      amount: Math.round(adjustedCost),
      type: accommodation,
      range: calculateRange(adjustedCost, 0.3)
    };
  }

  private calculateFoodCost(
    country: 'US' | 'AU',
    lifestyle: string,
    diet?: string,
    city?: string
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
      range: calculateRange(adjustedCost, 0.4)
    };
  }

  private calculateTransportationCost(
    country: 'US' | 'AU',
    transportation?: string,
    lifestyle?: string,
    city?: string
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
      range: calculateRange(adjustedCost, 0.3)
    };
  }

  private calculateUtilitiesCost(
    country: 'US' | 'AU',
    accommodation: string,
    lifestyle: string
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
      range: calculateRange(adjustedCost, 0.3)
    };
  }

  private calculateEntertainmentCost(
    country: 'US' | 'AU',
    lifestyle: string,
    city: string
  ) {
    const baseEntertainment = country === 'US' ? 250 : 200;
    const adjustedCost = adjustForLifestyle(baseEntertainment, lifestyle as any);

    return {
      amount: Math.round(adjustedCost),
      range: calculateRange(adjustedCost, 0.5)
    };
  }

  private calculateMiscellaneousCost(
    country: 'US' | 'AU',
    lifestyle: string
  ) {
    const baseMisc = country === 'US' ? 200 : 180;
    const adjustedCost = adjustForLifestyle(baseMisc, lifestyle as any);

    return {
      amount: Math.round(adjustedCost),
      range: calculateRange(adjustedCost, 0.4)
    };
  }

  private getFallbackLivingCosts(userInput: UserInput): LivingCosts {
    const { country, lifestyle } = userInput;
    const currency = country === 'US' ? 'USD' : 'AUD';

    // 紧急后备数据
    const fallbackData = {
      'US': {
        'economy': { total: 1800 },
        'standard': { total: 2500 },
        'comfortable': { total: 3200 }
      },
      'AU': {
        'economy': { total: 1600 },
        'standard': { total: 2200 },
        'comfortable': { total: 2800 }
      }
    };

    const totalCost = (fallbackData as any)[country][lifestyle].total;

    return {
      accommodation: { amount: Math.round(totalCost * 0.4), type: userInput.accommodation, range: calculateRange(totalCost * 0.4) },
      food: { amount: Math.round(totalCost * 0.25), range: calculateRange(totalCost * 0.25) },
      transportation: { amount: Math.round(totalCost * 0.1), range: calculateRange(totalCost * 0.1) },
      utilities: { amount: Math.round(totalCost * 0.1), range: calculateRange(totalCost * 0.1) },
      entertainment: { amount: Math.round(totalCost * 0.1), range: calculateRange(totalCost * 0.1) },
      miscellaneous: { amount: Math.round(totalCost * 0.05), range: calculateRange(totalCost * 0.05) },
      total: { amount: totalCost, range: calculateRange(totalCost) },
      currency,
      period: 'monthly',
      sources: ['内部数据库估算']
    };
  }
}