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
      // 计算总费用（学费代理已返回总费用，直接使用）
      const totalCost = {
        amount: tuition.total,
        range: {
          min: Math.round(tuition.total * 0.9),
          max: Math.round(tuition.total * 1.1)
        },
        duration: tuition.programDuration
      };

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
        recommendations: this.generateRecommendations(userInput, { tuition, livingCosts, otherCosts }),
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
      sources.push(`其他生活费用来源: ${livingCosts.miscellaneous.source}`);
    }

    // 其他费用来源
    sources.push(`申请费用来源: ${otherCosts.applicationFee.source} ${otherCosts.applicationFee.confidence ? `(置信度: ${(otherCosts.applicationFee.confidence * 100).toFixed(0)}%)` : ''}`);
    sources.push(`签证费用来源: ${otherCosts.visaFee.source} ${otherCosts.visaFee.confidence ? `(置信度: ${(otherCosts.visaFee.confidence * 100).toFixed(0)}%)` : ''}`);
    
    // 只有当健康保险存在且有来源时才添加
    if (otherCosts.healthInsurance && otherCosts.healthInsurance.source) {
      sources.push(`健康保险费用来源: ${otherCosts.healthInsurance.source} ${otherCosts.healthInsurance.confidence ? `(置信度: ${(otherCosts.healthInsurance.confidence * 100).toFixed(0)}%)` : ''}`);
    } else if (otherCosts.healthInsurance) {
      sources.push(`健康保险费用来源: 数据不可用`);
    }

    // 去重并返回
    return [...new Set(sources)];
  }

  private async generateReportContent(reportData: any): Promise<string> {
    try {
      const prompt = `Based on the provided JSON data, generate a comprehensive study abroad cost estimation report in Markdown format. 
      
      JSON Data:
      ${JSON.stringify(reportData, null, 2)}

      Please structure your report as follows:
      1. Executive Summary - Overall cost overview
      2. Cost Breakdown - Detailed breakdown of tuition, living, and other costs
      3. Data Sources - List all sources with URLs
      4. Personalized Recommendations - Tailored cost-saving suggestions based on user preferences
      
      Requirements:
      - Use clear, concise language
      - Include relevant emojis for better visual appeal
      - Provide actionable recommendations
      - Highlight data sources and confidence levels
      - Format numbers as currency
      - Use Markdown formatting for headings, lists, and emphasis
      `;

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
        temperature: 0.5,
        max_tokens: 3000
      });

      return response;
    } catch (error) {
      console.error('Report content generation failed:', error);
      return '# 费用估算报告\n\n由于系统错误，无法生成详细报告。请查看各费用项的估算结果。';
    }
  }

  private calculateTotalCost(
    tuition: TuitionData,
    livingCosts: LivingCosts,
    otherCosts: OtherCosts,
    programDuration: number
  ) {
    // 使用学费代理返回的项目时长，如果不可用则使用用户输入的时长
    const actualProgramDuration = tuition.programDuration || programDuration;
    
    // 学费已经是总费用，不需要额外计算
    const tuitionTotal = tuition.total;
    
    // 生活费（按年计算）× 项目时长
    const livingTotal = livingCosts.total.amount * 12 * actualProgramDuration;
    
    // 其他费用（一次性费用只计算一次）
    const otherFees = (otherCosts.applicationFee?.amount || 0) + 
                      (otherCosts.visaFee?.amount || 0) + 
                      (otherCosts.healthInsurance?.amount || 0);

    const totalAmount = tuitionTotal + livingTotal + otherFees;

    return {
      amount: Math.round(totalAmount),
      range: {
        min: Math.round(totalAmount * 0.9),
        max: Math.round(totalAmount * 1.1)
      },
      duration: actualProgramDuration
    };
  }

  private calculateTotalAnnualCost(
    tuition: TuitionData,
    livingCosts: LivingCosts,
    otherCosts: OtherCosts
  ) {
    // 计算年度总费用（不包含一次性费用）
    const livingAnnual = livingCosts.total.amount * 12;
    
    // 学费代理返回的是整个项目的总费用，需要计算年度学费
    const tuitionAnnual = tuition.total / tuition.programDuration;
    
    const totalAmount = tuitionAnnual + livingAnnual;

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
    // 计算月度总费用（包含学费的月度分摊、生活费和其他费用的月度分摊）
    const tuitionMonthly = tuition.total / 12;
    const otherFees = (otherCosts.applicationFee?.amount || 0) + 
                      (otherCosts.visaFee?.amount || 0) + 
                      (otherCosts.healthInsurance?.amount || 0);
    
    // 将其他费用分摊到12个月
    const otherMonthly = otherFees / 12;
    
    // 月度费用 = 学费月度分摊 + 生活费 + 其他费用的月度分摊
    const totalAmount = tuitionMonthly + livingCosts.total.amount + otherMonthly;

    return {
      amount: Math.round(totalAmount),
      range: {
        min: Math.round(totalAmount * 0.9),
        max: Math.round(totalAmount * 1.1)
      }
    };
  }

  private generateRecommendations(userInput: UserInput, reportData: any): string[] {
    const recommendations: string[] = [];

    // 基于用户输入生成个性化建议（避免给出用户已经选择的建议）
    if (userInput.lifestyle === 'economy') {
      recommendations.push('💰 经济型生活方式优化');
    } else if (userInput.lifestyle === 'comfortable') {
      recommendations.push('🌟 舒适型生活方式优化');
    } else {
      recommendations.push('📊 标准型生活方式优化');
    }

    // 只有当用户没有选择宿舍时才给出宿舍建议
    if (userInput.accommodation !== 'dormitory') {
      recommendations.push('🏠 住宿选择优化');
    }
    
    // 只有当用户没有选择公寓时才给出公寓建议
    if (userInput.accommodation !== 'apartment') {
      recommendations.push('🏢 其他住宿选择');
    }

    // 基于数据生成建议
    if (reportData.livingCosts.total.amount > 2000) {
      recommendations.push('📈 高成本城市生活规划');
    }

    // 基于置信度的建议
    if (reportData.tuition.confidence && reportData.tuition.confidence < 0.5) {
      recommendations.push('⚠️ 学费数据确认');
    }

    if (reportData.livingCosts.confidence && reportData.livingCosts.confidence < 0.5) {
      recommendations.push('⚠️ 生活费数据确认');
    }

    // 如果没有健康保险数据，给出提醒
    if (!reportData.otherCosts.healthInsurance) {
      recommendations.push('🏥 健康保险规划');
    } else if (reportData.otherCosts.healthInsurance && reportData.otherCosts.healthInsurance.amount > 1000) {
      recommendations.push('🏥 高额保险费用优化');
    }

    recommendations.push('📚 奖学金申请策略');
    recommendations.push('🛒 日常消费优化');

    return recommendations;
  }
}