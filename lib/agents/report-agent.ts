import { openRouterClient } from '../openrouter';
import { UserInput, TuitionData, LivingCosts, OtherCosts, CostEstimateReport } from '@/types';
import { calculateAnnualCost, calculateRange } from '../utils';

export class ReportAgent {
  async generateReport(
    userInput: UserInput,
    tuition: TuitionData,
    livingCosts: LivingCosts,
    otherCosts: OtherCosts
  ): Promise<CostEstimateReport> {
    try {
      // 计算费用总览
      const summary = this.calculateSummary(tuition, livingCosts, otherCosts);

      // 生成个性化建议
      const recommendations = await this.generateRecommendations(userInput, summary);

      // 收集所有数据来源
      const sources = this.collectSources(tuition, livingCosts, otherCosts);

      const report: CostEstimateReport = {
        userInput,
        tuition,
        livingCosts,
        otherCosts,
        summary,
        recommendations,
        generatedAt: new Date().toISOString(),
        sources
      };

      return report;

    } catch (error) {
      console.error('Report generation error:', error);
      throw new Error('Failed to generate cost estimate report');
    }
  }

  private calculateSummary(
    tuition: TuitionData,
    livingCosts: LivingCosts,
    otherCosts: OtherCosts
  ) {
    const currency = tuition.currency;

    // 计算年度总费用
    const annualTuition = tuition.amount;
    const annualLiving = livingCosts.total.amount * 12;
    const annualOther = otherCosts.applicationFee.amount + otherCosts.visaFee.amount +
      (otherCosts.healthInsurance?.amount || 0);

    const totalAnnual = annualTuition + annualLiving + annualOther;

    // 计算月度费用
    const monthlyTotal = livingCosts.total.amount + (annualTuition + annualOther) / 12;

    return {
      totalAnnualCost: {
        amount: Math.round(totalAnnual),
        range: calculateRange(totalAnnual, 0.2)
      },
      totalMonthlyCost: {
        amount: Math.round(monthlyTotal),
        range: calculateRange(monthlyTotal, 0.2)
      },
      currency,
      breakdown: {
        tuition: annualTuition,
        living: annualLiving,
        other: annualOther
      }
    };
  }

  private async generateRecommendations(
    userInput: UserInput,
    summary: any
  ): Promise<string[]> {
    try {
      const prompt = `基于以下留学费用估算情况，为学生提供5-8个实用的省钱建议：

用户信息：
- 目标国家：${userInput.country}
- 大学：${userInput.university}
- 专业：${userInput.program}
- 学位：${userInput.level}
- 城市：${userInput.city}
- 生活方式：${userInput.lifestyle}
- 住宿偏好：${userInput.accommodation}

费用总览：
- 年度总费用：${summary.totalAnnualCost.amount} ${summary.currency}
- 学费：${summary.breakdown.tuition} ${summary.currency}
- 生活费：${summary.breakdown.living} ${summary.currency}
- 其他费用：${summary.breakdown.other} ${summary.currency}

请提供具体、可执行的建议，涵盖住宿、饮食、交通、学习用品等方面。`;

      const response = await openRouterClient.chat({
        model: 'openai/gpt-4o',
        messages: [
          {
            role: 'system',
            content: '你是一位资深的留学财务规划师。请提供实用、具体的省钱建议。每条建议应该简洁明了，易于执行。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7
      });

      // 解析建议内容
      const lines = response.split('\n').filter(line => line.trim());
      const recommendations = lines
        .filter(line => line.match(/^\d+\./) || line.startsWith('•') || line.startsWith('-'))
        .map(line => line.replace(/^\d+\.\s*/, '').replace(/^[•\-]\s*/, '').trim())
        .filter(rec => rec.length > 10) // 过滤太短的建议
        .slice(0, 8); // 最多8条建议

      return recommendations.length > 0 ? recommendations : this.getDefaultRecommendations(userInput);

    } catch (error) {
      console.error('Recommendations generation failed:', error);
      return this.getDefaultRecommendations(userInput);
    }
  }

  private getDefaultRecommendations(userInput: UserInput): string[] {
    const { country, accommodation, lifestyle } = userInput;

    const recommendations = [];

    // 住宿建议
    if (accommodation === 'apartment') {
      recommendations.push('考虑与室友合租公寓以降低住宿成本');
    } else if (accommodation === 'dormitory') {
      recommendations.push('学校宿舍通常包含水电费，是经济实惠的选择');
    }

    // 饮食建议
    recommendations.push('自己做饭比在外就餐能节省60-70%的饮食费用');
    recommendations.push('购买大包装食品和利用折扣优惠券可以有效降低食物支出');

    // 交通建议
    if (country === 'US') {
      recommendations.push('购买月票或学生交通卡可以节省公共交通费用');
    } else {
      recommendations.push('澳大利亚的学生可享受公共交通折扣，记得申请学生卡');
    }

    // 学习用品建议
    recommendations.push('购买二手教材或租借教材可以显著降低学习成本');
    recommendations.push('充分利用图书馆的免费资源和学习空间');

    // 娱乐建议
    recommendations.push('参加学校组织的免费活动，既能社交又能节省娱乐费用');

    // 兼职建议
    recommendations.push('在学习许可范围内寻找兼职工作，可以补贴生活费用');

    return recommendations.slice(0, 6);
  }

  private collectSources(
    tuition: TuitionData,
    livingCosts: LivingCosts,
    otherCosts: OtherCosts
  ): string[] {
    const sources = new Set<string>();

    // 学费来源
    sources.add(tuition.source);

    // 生活成本来源
    livingCosts.sources.forEach(source => sources.add(source));

    // 其他费用来源
    sources.add(otherCosts.applicationFee.source);
    sources.add(otherCosts.visaFee.source);
    if (otherCosts.healthInsurance) {
      sources.add(otherCosts.healthInsurance.source);
    }

    return Array.from(sources).filter(source =>
      source && source.length > 0 && source !== '内部估算'
    );
  }

  async enhanceReportWithInsights(
    report: CostEstimateReport
  ): Promise<CostEstimateReport> {
    try {
      // 可以添加更多深度分析
      // 例如：与同类大学比较、市场趋势分析等

      const insights = await this.generateMarketInsights(report.userInput, report.summary);

      return {
        ...report,
        recommendations: [...report.recommendations, ...insights]
      };

    } catch (error) {
      console.error('Report enhancement failed:', error);
      return report;
    }
  }

  private async generateMarketInsights(
    userInput: UserInput,
    summary: any
  ): Promise<string[]> {
    try {
      const prompt = `基于以下留学费用数据，提供2-3个市场洞察和趋势分析：

目标：${userInput.university} ${userInput.program}
年度总费用：${summary.totalAnnualCost.amount} ${summary.currency}

请分析：
1. 相比同类大学，这个费用水平如何？
2. 未来1-2年的费用趋势预测
3. 该地区/专业的就业前景对投资回报的影响`;

      const response = await openRouterClient.chat({
        model: 'openai/gpt-4o',
        messages: [
          {
            role: 'system',
            content: '你是留学市场分析专家，提供基于数据的客观分析。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.5
      });

      return response.split('\n')
        .filter(line => line.trim().length > 20)
        .slice(0, 3);

    } catch (error) {
      return [];
    }
  }
}