import { openRouterClient } from '../openrouter';
import { UserInput, TuitionData, LivingCosts, OtherCosts, CostEstimateReport } from '@/types';
import { REPORT_MODEL } from '../constants';

export class ReportAgent {
  async generateReport(
    userInput: UserInput,
    tuition: TuitionData,
    livingCosts: LivingCosts,
    otherCosts: OtherCosts
  ): Promise<CostEstimateReport> {
    try {
      // 计算年度总费用
      const totalAnnualCost = this.calculateTotalAnnualCost(tuition, livingCosts, otherCosts);
      const totalMonthlyCost = this.calculateTotalMonthlyCost(tuition, livingCosts, otherCosts);
      // 计算总费用（整个学习期间）
      const programDuration = this.extractDurationInYears(tuition.programDuration);
      const totalCost = this.calculateTotalCost(tuition, livingCosts, otherCosts, programDuration);

      // 计算生活费用明细
      const nonAccommodationAnnual = livingCosts.total.amount * 12;
      const accommodationMonthlyAvg = ((livingCosts.accommodation?.monthlyRange?.min || 0) + 
                                     (livingCosts.accommodation?.monthlyRange?.max || 0)) / 2;
      const accommodationAnnual = accommodationMonthlyAvg * 12;

      // 收集所有来源
      const sources = this.collectAllSources(tuition, livingCosts, otherCosts);

      // 构建完整的报告对象（在生成建议之前）
      const completeReport: CostEstimateReport = {
        userInput,
        tuition,
        livingCosts,
        otherCosts,
        summary: {
          totalAnnualCost,
          totalMonthlyCost,
          totalCost: { ...totalCost, duration: programDuration },
          currency: tuition.currency,
          breakdown: {
            tuition: tuition.total,
            living: nonAccommodationAnnual + accommodationAnnual,
            other: (otherCosts.applicationFee?.amount || 0) +
                   (otherCosts.visaFee?.amount || 0) +
                   (otherCosts.healthInsurance?.amount || 0)
          }
        },
        recommendations: [],
        generatedAt: new Date().toISOString(),
        sources
      };

      // 生成个性化建议
      const recommendations = await this.generateRecommendations(userInput, completeReport);

      // 返回最终报告
      return {
        ...completeReport,
        recommendations
      };

    } catch (error) {
      console.error('Report generation failed:', error);
      throw new Error(`报告生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  private calculateTotalAnnualCost(
    tuition: TuitionData,
    livingCosts: LivingCosts,
    otherCosts: OtherCosts
  ) {
    // 计算年度学费
    const tuitionAmount = tuition.total / (tuition.programDuration || 1);
    
    // 计算年度生活费 (非住宿月费用 * 12) + (住宿月费用 * 12)
    const nonAccommodationCost = livingCosts.total.amount * 12;
    const accommodationCost = ((livingCosts.accommodation?.monthlyRange?.min || 0) + 
                              (livingCosts.accommodation?.monthlyRange?.max || 0)) / 2 * 12;
    const livingCostAmount = nonAccommodationCost + accommodationCost;
    
    // 其他费用通常是一次性费用，按年分摊
    const otherCostAmount = (
      (otherCosts.applicationFee?.amount || 0) +
      (otherCosts.visaFee?.amount || 0) +
      (otherCosts.healthInsurance?.amount || 0)
    );

    const totalAmount = tuitionAmount + livingCostAmount + otherCostAmount;

    return {
      amount: Math.round(totalAmount),
      range: {
        min: Math.round(totalAmount * 0.9),
        max: Math.round(totalAmount * 1.1)
      }
    };
  }

  private calculateTotalMonthlyCost(
    tuition: TuitionData,
    livingCosts: LivingCosts,
    otherCosts: OtherCosts
  ) {
    // 计算月度学费
    const tuitionAmount = tuition.total / (tuition.programDuration || 1) / 12;
    
    // 计算月度生活费 (非住宿月费用) + (住宿月费用)
    const nonAccommodationCost = livingCosts.total.amount;
    const accommodationCost = ((livingCosts.accommodation?.monthlyRange?.min || 0) + 
                              (livingCosts.accommodation?.monthlyRange?.max || 0)) / 2;
    const livingCostAmount = nonAccommodationCost + accommodationCost;
    
    // 其他费用通常是一次性费用，按月分摊
    const otherCostAmount = (
      (otherCosts.applicationFee?.amount || 0) +
      (otherCosts.visaFee?.amount || 0) +
      (otherCosts.healthInsurance?.amount || 0)
    ) / 12;

    const totalAmount = tuitionAmount + livingCostAmount + otherCostAmount;

    return {
      amount: Math.round(totalAmount),
      range: {
        min: Math.round(totalAmount * 0.9),
        max: Math.round(totalAmount * 1.1)
      }
    };
  }

  private calculateTotalCost(
    tuition: TuitionData,
    livingCosts: LivingCosts,
    otherCosts: OtherCosts,
    programDuration: number
  ) {
    // 学费总额
    const tuitionAmount = tuition.total;
    
    // 生活费总额 (非住宿月费用 * 12 * 年数) + (住宿月费用 * 12 * 年数)
    const nonAccommodationCost = livingCosts.total.amount * 12 * programDuration;
    const accommodationCost = ((livingCosts.accommodation?.monthlyRange?.min || 0) + 
                              (livingCosts.accommodation?.monthlyRange?.max || 0)) / 2 * 12 * programDuration;
    const livingCostAmount = nonAccommodationCost + accommodationCost;
    
    // 其他费用总额 (一次性费用)
    const otherCostAmount = (
      (otherCosts.applicationFee?.amount || 0) +
      (otherCosts.visaFee?.amount || 0) +
      (otherCosts.healthInsurance?.amount || 0)
    );

    const totalAmount = tuitionAmount + livingCostAmount + otherCostAmount;

    return {
      amount: Math.round(totalAmount),
      range: {
        min: Math.round(totalAmount * 0.9),
        max: Math.round(totalAmount * 1.1)
      }
    };
  }

  private extractDurationInYears(programDuration: number): number {
    return programDuration || 1; // 确保至少为1年，避免除零错误
  }

  private async generateRecommendations(
    userInput: UserInput,
    currentReport: CostEstimateReport
  ): Promise<string[]> {
    try {
      // Generate personalized recommendations using LLM
      const prompt = `Based on the following cost estimate report for a student planning to study ${userInput.program} at ${userInput.university} in ${userInput.city}, ${userInput.country}, provide 3-5 specific, actionable recommendations for saving money or optimizing their budget:

      User Profile:
      - University: ${userInput.university}
      - Program: ${userInput.program}
      - Degree Level: ${userInput.level === 'undergraduate' ? 'Undergraduate' : 'Postgraduate'}
      - Country: ${userInput.country}
      - City: ${userInput.city}
      - Lifestyle Preference: ${userInput.lifestyle === 'economy' ? 'Economy' : userInput.lifestyle === 'comfortable' ? 'Comfortable' : 'Standard'}
      - Accommodation Type: ${userInput.accommodation === 'dormitory' ? 'Dormitory' : userInput.accommodation === 'shared' ? 'Shared Apartment' : userInput.accommodation === 'studio' ? 'Studio' : 'Private Apartment'}
      - Location Preference: ${userInput.locationPreference === 'cityCentre' ? 'City Centre' : 'Outside City Centre'}

      Cost Analysis:
      - Total Program Cost: ${currentReport.summary.totalCost.amount} ${currentReport.summary.currency}
      - Annual Living Cost: ${currentReport.summary.totalAnnualCost.amount} ${currentReport.summary.currency}
      - Monthly Living Cost: ${currentReport.summary.totalMonthlyCost.amount} ${currentReport.summary.currency}
      - Monthly Accommodation Cost: ${currentReport.livingCosts.accommodation ? `${Math.round(((currentReport.livingCosts.accommodation.monthlyRange.min + currentReport.livingCosts.accommodation.monthlyRange.max) / 2))} ${currentReport.livingCosts.accommodation.currency}` : 'Not available'}

      Please provide practical advice in Chinese about:
      1. Accommodation cost optimization based on their chosen accommodation type and location preference
      2. Daily expense management considering their lifestyle preference
      3. Part-time work opportunities relevant to their program and location (if allowed)
      4. Student discounts and benefits specific to their university and country
      5. Transportation and other cost-saving measures in their city

      Consider specific factors for each country:
      - US: F1 visa work restrictions, on-campus job opportunities, meal plans
      - UK: Tier 4 visa work hour limits, NHS surcharge, rail card discounts
      - AU: Student visa work rights, OSHC health insurance, public transport concessions
      - CA: Student visa work rights, healthcare coverage, public transport passes
      - DE: No tuition fees at public universities, student union fees, semester tickets
      - HK: High living costs, limited work opportunities, public transport efficiency
      - MO: Gaming industry opportunities, lower living costs than HK, unique cultural factors
      - SG: Strong job market, strict visa regulations, public housing options

      Additional considerations:
      - If the user selected a dormitory, suggest ways to make the most of dorm life and shared facilities
      - If the user selected a shared apartment, provide advice on roommate relationships and shared expenses
      - If the user selected a studio or apartment, give tips on furnishing and managing a private space
      - If the user prefers an economy lifestyle, focus on maximizing savings
      - If the user prefers a comfortable lifestyle, suggest ways to maintain quality while being cost-effective
      - If the user lives in the city centre, address the challenges of high costs and fast-paced life
      - If the user lives outside the city centre, provide advice on commuting and accessing amenities

      Return ONLY a valid JSON array with 3-5 recommendation strings in Chinese. Each recommendation should be specific and personalized to the user's situation. Do not include any other text, explanations, or formatting. Example format: ["建议1", "建议2", "建议3"]`;

      // 设置超时控制
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Recommendation generation timeout')), 30000) // 30秒超时
      );

      const llmPromise = openRouterClient.chat({
        model: REPORT_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful study abroad advisor providing practical budgeting advice in Chinese. Return ONLY a valid JSON array with 3-5 recommendation strings. Do not include any other text, explanations, or formatting. Example format: ["建议1", "建议2", "建议3"]'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      });

      const response = await Promise.race([llmPromise, timeoutPromise]) as any;

      // 更全面地检查响应格式
      if (!response) {
        throw new Error('Empty response from LLM');
      }

      // 检查是否是 OpenRouter API 的标准响应格式
      if (response.error) {
        throw new Error(`LLM API error: ${JSON.stringify(response.error)}`);
      }

      // 检查响应内容是否存在
      let content = '';
      if (typeof response === 'string') {
        // 如果响应是字符串（直接从 chat 方法返回）
        content = response.trim();
      } else if (response.choices && response.choices.length > 0) {
        // 如果响应是标准的 OpenAI 格式
        if (response.choices[0].message && response.choices[0].message.content) {
          content = response.choices[0].message.content.trim();
        } else {
          throw new Error('No content in LLM response choices');
        }
      } else {
        throw new Error('Invalid response format from LLM - no choices array');
      }

      if (!content) {
        throw new Error('Empty content in LLM response');
      }

      // 尝试直接解析整个响应作为JSON
      try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
          return parsed;
        } else {
          console.error('Response is not an array of strings:', parsed);
        }
      } catch (parseError) {
        // 如果直接解析失败，尝试提取JSON数组
        const recommendationsMatch = content.match(/\[[\s\S]*\]/);
        if (recommendationsMatch) {
          try {
            const parsed = JSON.parse(recommendationsMatch[0]);
            if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
              return parsed;
            } else {
              console.error('Extracted content is not an array of strings:', parsed);
            }
          } catch (innerParseError) {
            console.error('Failed to parse extracted recommendations as JSON:', innerParseError);
            console.error('Extracted content:', recommendationsMatch[0]);
          }
        } else {
          console.error('No JSON array found in response:', content);
        }
      }
      
      // 如果无法解析JSON，返回针对具体国家的默认建议
      console.error('Failed to parse any valid JSON from response:', content);
      return this.getDefaultRecommendations(userInput);
    } catch (error) {
      console.error('Recommendation generation failed:', error);
      // 返回针对具体国家的默认建议
      return this.getDefaultRecommendations(userInput);
    }
  }

  private getDefaultRecommendations(userInput: UserInput): string[] {
    // 基于用户输入生成更个性化的默认建议
    const { country, accommodation, lifestyle, locationPreference, university, program } = userInput;
    
    // 为不同国家提供定制化的默认建议
    const countrySpecificRecommendations: Record<string, string[]> = {
      US: [
        `作为${university}的${program}学生，建议充分利用学校提供的meal plan来节省饮食开支`,
        "利用美国的tax return政策，在每年4月申请退税，通常能退回几百到上千美元",
        "积极申请校内研究助理或助教职位，既可获得经济支持又可积累经验",
        "使用学生身份购买或租赁电子产品，享受教育折扣"
      ],
      UK: [
        `在${university}学习期间，建议购买16-25 Railcard享受火车票1/3折扣，适合需要经常出行的学生`,
        "充分利用NHS免费医疗服务，避免不必要的医疗支出",
        `考虑加入${university}的社团和运动队，通常包含在学费中且能丰富生活`,
        "在Tesco等超市购物时使用Clubcard积分，可兑换商品或现金券"
      ],
      AU: [
        `作为${university}的学生，确保申请Medicare和OSHC健康保险，符合签证要求且保障医疗`,
        "利用学生签证允许每两周工作40小时的政策，寻找校内兼职工作",
        "使用Myki卡乘坐公共交通，可享受学生折扣",
        `参加${university}组织的免费活动，丰富社交生活且无需额外支出`
      ],
      CA: [
        `在${university}学习时，申请社会保险号(SIN)后寻找校内工作机会，时薪通常较高`,
        "利用加拿大的免费医疗系统，减少医疗支出",
        "购买月票或年票乘坐公共交通，比单次购票更经济",
        "在Costco等会员制商店购物，长期来看更节省生活开支"
      ],
      DE: [
        `在${university}就读期间，充分利用德国的免费公立高等教育优势`,
        "办理Semesterticket享受免费或优惠的公共交通",
        "加入学生工会(Students' Union)享受各种优惠和服务",
        "在Aldi、Lidl等廉价超市购买日用品，显著降低生活成本"
      ],
      HK: [
        `作为${university}的学生，考虑与他人合租以分摊高昂的租金成本`,
        "使用八达通卡乘坐公共交通，方便快捷且有优惠",
        "在便利店购买便当作为午餐，比餐厅用餐更经济",
        "充分利用香港的免费活动和设施，如图书馆、公园等"
      ],
      MO: [
        `在${university}学习期间，可考虑在澳门的赌场或酒店寻找兼职工作，收入相对较高`,
        "利用澳门的免费WiFi网络，减少通讯费用",
        "在街市购买新鲜食材自己烹饪，比外出就餐节省开支",
        "参加澳门旅游局组织的免费文化活动，丰富课余生活"
      ],
      SG: [
        `作为${university}的学生，利用新加坡完善的公共交通系统，购买月票更经济实惠`,
        "在Food Court用餐，既便宜又能体验当地美食文化",
        `参加学校组织的CCA活动，通常免费且能结交朋友`,
        "利用新加坡的热带气候，在户外运动而无需支付健身房费用"
      ]
    };

    // 根据住宿类型添加个性化建议
    const accommodationSpecificTips: Record<string, string[]> = {
      dormitory: [
        "充分利用宿舍的共享设施，如厨房、洗衣房、学习室等，减少额外支出",
        "与室友建立良好关系，可以共享生活用品，分摊部分费用"
      ],
      shared: [
        "制定室友间的费用分摊协议，明确水电煤气网费等如何分配",
        "合理安排公共空间的使用，避免不必要的冲突和额外费用"
      ],
      studio: [
        "合理规划studio空间，可以同时作为卧室、学习区和客厅使用",
        "购买多功能家具，如储物床、折叠桌等，节省空间和费用"
      ],
      apartment: [
        "考虑与朋友合租公寓，分摊房租和生活成本",
        "选择靠近学校或交通便利的公寓，减少通勤时间和费用"
      ]
    };

    // 根据生活方式添加个性化建议
    const lifestyleSpecificTips: Record<string, string[]> = {
      economy: [
        "制定详细的月度预算计划，严格控制各项支出",
        "优先购买打折商品，关注超市和商店的促销活动"
      ],
      standard: [
        "在必要支出上选择性价比高的选项，适度享受生活",
        "定期评估和调整消费习惯，寻找节省开支的机会"
      ],
      comfortable: [
        "在预算允许的范围内适当提高生活质量，但避免浪费",
        "投资于能提升学习效率和生活品质的物品"
      ]
    };

    // 根据位置偏好添加个性化建议
    const locationSpecificTips: Record<string, string[]> = {
      cityCentre: [
        "虽然市中心生活成本高，但便利的交通可以节省大量通勤时间和费用",
        "充分利用市中心丰富的免费活动和资源，如博物馆、图书馆、公园等"
      ],
      outsideCityCentre: [
        "选择靠近公共交通站点的住所，方便出行且能节省交通费用",
        "了解如何通过学生折扣享受市中心的资源和服务"
      ]
    };

    // 组合所有建议
    let recommendations: string[] = [];

    // 添加国家特定建议
    recommendations = recommendations.concat(countrySpecificRecommendations[country] || [
      "建议申请校内宿舍以获得更优惠的价格",
      "可以通过做饭和合理规划饮食来节省生活费用",
      "积极寻找允许的校内兼职工作机会",
      "充分利用学生身份享受各种折扣和优惠"
    ]);

    // 添加住宿类型特定建议
    recommendations = recommendations.concat(accommodationSpecificTips[accommodation] || []);

    // 添加生活方式特定建议
    recommendations = recommendations.concat(lifestyleSpecificTips[lifestyle] || []);

    // 添加位置偏好特定建议
    recommendations = recommendations.concat(locationSpecificTips[locationPreference] || []);

    // 确保返回3-5条建议
    return recommendations.slice(0, 5);
  }

  private collectAllSources(
    tuition: TuitionData,
    livingCosts: LivingCosts,
    otherCosts: OtherCosts
  ): string[] {
    const sources: string[] = [];
    
    // Collect tuition sources
    if (tuition.source) sources.push(tuition.source);
    
    // Collect living cost sources
    if (livingCosts.sources) sources.push(...livingCosts.sources);
    if (livingCosts.accommodation?.source) sources.push(livingCosts.accommodation.source);
    
    // Collect other cost sources
    if (otherCosts.applicationFee?.source) sources.push(otherCosts.applicationFee.source);
    if (otherCosts.visaFee?.source) sources.push(otherCosts.visaFee.source);
    if (otherCosts.healthInsurance?.source) sources.push(otherCosts.healthInsurance.source);
    
    // Remove duplicates and empty values
    return Array.from(new Set(sources.filter(source => source)));
  }
}