import { openRouterClient } from '../openrouter';
import { UserInput, CostEstimateReport, TuitionData, LivingCosts, OtherCosts } from '@/types';
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
      const recommendations = await this.generateRecommendations(userInput, { tuition, livingCosts, otherCosts });

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
          totalCost,
          currency: tuition.currency,
          breakdown: {
            tuition: tuition.total,
            living: livingCosts.total.amount * 12,
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

  private collectAllSources(
    tuition: TuitionData,
    livingCosts: LivingCosts,
    otherCosts: OtherCosts
  ): string[] {
    const sources: string[] = [];

    // 学费来源
    sources.push(`学费数据来源: ${tuition.source} ${tuition.isEstimate ? '(估算)' : '(官方数据)'} ${tuition.confidence ? `(置信度: ${(tuition.confidence * 100).toFixed(0)}%)` : ''}`);

    // 生活费来源
    sources.push(...livingCosts.sources.map(source => `生活费用数据来源: ${source} ${livingCosts.confidence ? `(置信度: ${(livingCosts.confidence * 100).toFixed(0)}%)` : ''}`));

    // 各项生活费用的详细来源
    if (livingCosts.accommodation.source) {
      sources.push(`住宿费用来源: ${livingCosts.accommodation.source}`);
    }
    if (livingCosts.food.source) {
      sources.push(`餐饮费用来源: ${livingCosts.food.source}`);
    }
    if (livingCosts.transportation.source) {
      sources.push(`交通费用来源: ${livingCosts.transportation.source}`);
    }
    if (livingCosts.utilities.source) {
      sources.push(`水电费用来源: ${livingCosts.utilities.source}`);
    }
    if (livingCosts.entertainment.source) {
      sources.push(`娱乐费用来源: ${livingCosts.entertainment.source}`);
    }
    if (livingCosts.miscellaneous.source) {
      sources.push(`其他费用来源: ${livingCosts.miscellaneous.source}`);
    }

    // 其他费用来源
    if (otherCosts.applicationFee?.source) {
      sources.push(`申请费用来源: ${otherCosts.applicationFee.source}`);
    }
    if (otherCosts.visaFee?.source) {
      sources.push(`签证费用来源: ${otherCosts.visaFee.source}`);
    }
    if (otherCosts.healthInsurance?.source) {
      sources.push(`健康保险费用来源: ${otherCosts.healthInsurance.source}`);
    }

    return sources;
  }

  private extractDurationInYears(programDuration: string | number): number {
    // 如果已经是数字，直接返回
    if (typeof programDuration === 'number') {
      return programDuration;
    }
    
    // 从字符串中提取年数，如"2年" -> 2, "18个月" -> 1.5
    const yearMatch = programDuration.match(/(\d+(?:\.\d+)?)\s*年/);
    if (yearMatch) {
      return parseFloat(yearMatch[1]);
    }

    const monthMatch = programDuration.match(/(\d+(?:\.\d+)?)\s*个?月/);
    if (monthMatch) {
      return parseFloat(monthMatch[1]) / 12;
    }

    // 如果无法解析，默认返回2年（研究生常见时长）
    console.warn(`Cannot parse program duration: ${programDuration}, defaulting to 2 years`);
    return 2;
  }

  private calculateTotalCost(
    tuition: TuitionData,
    livingCosts: LivingCosts,
    otherCosts: OtherCosts,
    programDuration: number
  ) {
    // 学费总额 - 现在直接就是整个项目的总费用
    const tuitionTotal = tuition.total;

    // 生活费总额（月度费用 × 12个月 × 项目年数）
    const livingTotal = livingCosts.total.amount * 12 * programDuration;

    // 其他费用总额（一次性费用）
    const otherFees = (otherCosts.applicationFee?.amount || 0) +
                      (otherCosts.visaFee?.amount || 0) +
                      (otherCosts.healthInsurance?.amount || 0);

    // 总费用 = 学费 + 生活费 + 其他费用
    const totalAmount = tuitionTotal + livingTotal + otherFees;

    return {
      amount: Math.round(totalAmount),
      range: {
        min: Math.round(totalAmount * 0.9),
        max: Math.round(totalAmount * 1.1)
      },
      duration: programDuration
    };
  }

  private calculateTotalAnnualCost(
    tuition: TuitionData,
    livingCosts: LivingCosts,
    otherCosts: OtherCosts
  ) {
    // 计算年度学费：将项目总学费除以项目年数
    const programDuration = this.extractDurationInYears(tuition.programDuration);
    const annualTuition = tuition.total / programDuration;

    // 计算年度生活费（月度费用 × 12个月）
    const annualLiving = livingCosts.total.amount * 12;

    // 计算年度总费用
    const totalAmount = annualTuition + annualLiving;

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
    // 计算月度学费：将项目总学费除以总月数
    const programDuration = this.extractDurationInYears(tuition.programDuration);
    const totalMonths = programDuration * 12;
    const tuitionMonthly = tuition.total / totalMonths;

    // 其他费用（一次性）分摊到每个月
    const otherFees = (otherCosts.applicationFee?.amount || 0) +
                      (otherCosts.visaFee?.amount || 0) +
                      (otherCosts.healthInsurance?.amount || 0);
    const otherMonthly = otherFees / totalMonths;

    // 月度总费用 = 月度学费 + 月度生活费 + 月度其他费用分摊
    const totalAmount = tuitionMonthly + livingCosts.total.amount + otherMonthly;

    return {
      amount: Math.round(totalAmount),
      range: {
        min: Math.round(totalAmount * 0.9),
        max: Math.round(totalAmount * 1.1)
      }
    };
  }

  private async generateRecommendations(userInput: UserInput, reportData: any): Promise<string[]> {
    try {
      // 构建提示词给AI生成个性化建议
      const prompt = `作为一名留学费用规划专家，请基于以下用户信息和费用估算结果，提供5-8个实用的省钱建议：

用户信息：
- 目标国家：${userInput.country === 'US' ? '美国' : '澳大利亚'}
- 大学：${userInput.university}
- 专业：${userInput.program}
- 学位：${userInput.level === 'undergraduate' ? '本科' : '硕士'}
- 城市：${userInput.city}
- 生活方式：${userInput.lifestyle === 'economy' ? '经济型' : userInput.lifestyle === 'comfortable' ? '舒适型' : '标准型'}
- 住宿偏好：${userInput.accommodation === 'dormitory' ? '宿舍' : userInput.accommodation === 'apartment' ? '公寓' : '其他'}

费用估算结果：
- 年度总费用：${reportData.summary.totalAnnualCost.amount} ${reportData.summary.currency}
- 学费：${reportData.summary.breakdown.tuition} ${reportData.summary.currency}
- 生活费：${reportData.summary.breakdown.living} ${reportData.summary.currency}
- 其他费用：${reportData.summary.breakdown.other} ${reportData.summary.currency}

请提供具体、可执行的建议，涵盖住宿、饮食、交通、学习用品等方面。要求：
1. 建议必须与用户的选择和费用结构相关
2. 避免给出用户已经选择的建议（如用户已选择宿舍，不要建议住宿舍）
3. 每条建议一行，不要使用任何格式符号
4. 用中文回复`;

      // 调用AI生成个性化建议
      const response = await openRouterClient.chat({
        model: REPORT_MODEL, // 使用Claude模型生成报告
        messages: [
          {
            role: 'system',
            content: 'You are a study abroad financial advisor. Generate comprehensive, well-structured reports in Markdown format based on the provided JSON data.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      });

      // 解析AI响应为建议列表
      return response.split('\n').filter(line => line.trim() !== '').map(line => line.trim());
    } catch (error) {
      console.error('Recommendation generation failed:', error);
      
      // 紧急备用建议
      const fallbackRecommendations = [
        '💰 合理规划月度预算，避免不必要支出',
        '🏠 考虑与室友合租以降低住宿成本',
        '🛒 自己做饭，减少外出就餐频率',
        '📚 充分利用学校图书馆和免费学习资源',
        '🚌 使用学生公交卡享受交通折扣',
        '🎉 参加学校免费活动，降低娱乐支出',
        '🛍️ 购买二手教材和学习用品',
        '💡 申请奖学金和助学金以减轻经济负担'
      ];

      return fallbackRecommendations;
    }
  }
}