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

      // 生成个性化建议
      const recommendations = await this.generateRecommendations(userInput, {
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
            living: (livingCosts.total.amount + 
                    ((livingCosts.accommodation?.monthlyRange?.min || 0) + 
                     (livingCosts.accommodation?.monthlyRange?.max || 0)) / 2) * 12,
            other: (otherCosts.applicationFee?.amount || 0) +
                   (otherCosts.visaFee?.amount || 0) +
                   (otherCosts.healthInsurance?.amount || 0)
          }
        },
        recommendations: [],
        generatedAt: new Date().toISOString(),
        sources: []
      });

      // 收集所有来源
      const sources = this.collectAllSources(tuition, livingCosts, otherCosts);

      return {
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
            living: (livingCosts.total.amount + 
                    ((livingCosts.accommodation?.monthlyRange?.min || 0) + 
                     (livingCosts.accommodation?.monthlyRange?.max || 0)) / 2) * 12,
            other: (otherCosts.applicationFee?.amount || 0) +
                   (otherCosts.visaFee?.amount || 0) +
                   (otherCosts.healthInsurance?.amount || 0)
          }
        },
        recommendations,
        generatedAt: new Date().toISOString(),
        sources
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
      const prompt = `Based on the following cost estimate report for a student planning to study ${userInput.program} in ${userInput.city}, ${userInput.country}, provide 3-5 specific, actionable recommendations for saving money or optimizing their budget:

      Report Summary:
      - Total Program Cost: $${currentReport.summary.totalCost.amount}
      - Annual Living Cost: $${currentReport.summary.totalAnnualCost.amount}
      - Accommodation Type: ${userInput.accommodation}
      - Lifestyle Preference: ${userInput.lifestyle}

      Please provide practical advice in Chinese about:
      1. Accommodation options
      2. Daily expense management
      3. Part-time work opportunities (if allowed)
      4. Student discounts and benefits
      5. Transportation and other cost-saving measures

      Return ONLY a JSON array of 3-5 recommendation strings in Chinese.`;

      // 设置超时控制
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Recommendation generation timeout')), 30000) // 30秒超时
      );

      const llmPromise = openRouterClient.chat({
        model: REPORT_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful study abroad advisor providing practical budgeting advice in Chinese.'
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

      // Try to extract JSON array from response
      const recommendationsMatch = response.choices[0]?.message?.content?.match(/\[[\s\S]*\]/);
      if (recommendationsMatch) {
        return JSON.parse(recommendationsMatch[0]);
      }
      
      return [
        "建议申请校内宿舍以获得更优惠的价格",
        "可以通过做饭和合理规划饮食来节省生活费用",
        "积极寻找允许的校内兼职工作机会",
        "充分利用学生身份享受各种折扣和优惠"
      ];
    } catch (error) {
      console.error('Recommendation generation failed:', error);
      return [
        "建议申请校内宿舍以获得更优惠的价格",
        "可以通过做饭和合理规划饮食来节省生活费用",
        "积极寻找允许的校内兼职工作机会",
        "充分利用学生身份享受各种折扣和优惠"
      ];
    }
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