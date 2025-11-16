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
      const prompt = `Based on the following cost estimate report for a student planning to study ${userInput.program} in ${userInput.city}, ${userInput.country}, provide 3-5 specific, actionable recommendations for saving money or optimizing their budget:

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

      Please provide practical advice in Chinese about:
      1. Accommodation cost optimization based on their chosen accommodation type and location preference
      2. Daily expense management considering their lifestyle preference
      3. Part-time work opportunities relevant to their program and location (if allowed)
      4. Student discounts and benefits specific to their university and country
      5. Transportation and other cost-saving measures in their city

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
      
      // 如果无法解析JSON，返回默认建议
      console.error('Failed to parse any valid JSON from response:', content);
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