import { UserInput, CostEstimateReport, EstimationProgress } from '@/types';
import { TuitionAgent } from './agents/tuition-agent';
import { LivingCostAgent } from './agents/living-cost-agent';
import { OtherCostsAgent } from './agents/other-costs-agent';
import { ReportAgent } from './agents/report-agent';

export type ProgressCallback = (progress: EstimationProgress) => void;

export class EstimationCoordinator {
  private tuitionAgent: TuitionAgent;
  private livingCostAgent: LivingCostAgent;
  private otherCostsAgent: OtherCostsAgent;
  private reportAgent: ReportAgent;

  constructor() {
    this.tuitionAgent = new TuitionAgent();
    this.livingCostAgent = new LivingCostAgent();
    this.otherCostsAgent = new OtherCostsAgent();
    this.reportAgent = new ReportAgent();
  }

  async generateCostEstimate(
    userInput: UserInput,
    onProgress?: ProgressCallback
  ): Promise<CostEstimateReport> {
    try {
      // 第一步：查询学费
      onProgress?.({
        step: 'tuition',
        progress: 10,
        message: '正在查询项目学费信息...'
      });

      const tuition = await this.tuitionAgent.queryTuition(userInput);

      onProgress?.({
        step: 'tuition',
        progress: 30,
        message: '学费信息查询完成'
      });

      // 第二步：分析生活成本
      onProgress?.({
        step: 'living',
        progress: 40,
        message: '正在分析个性化生活成本...'
      });

      const livingCosts = await this.livingCostAgent.analyzeLivingCosts(userInput);

      onProgress?.({
        step: 'living',
        progress: 60,
        message: '生活成本分析完成'
      });

      // 第三步：计算其他费用
      onProgress?.({
        step: 'other',
        progress: 70,
        message: '正在计算申请费、签证费等其他费用...'
      });

      const otherCosts = await this.otherCostsAgent.calculateOtherCosts(userInput);

      onProgress?.({
        step: 'other',
        progress: 80,
        message: '其他费用计算完成'
      });

      // 第四步：生成报告
      onProgress?.({
        step: 'report',
        progress: 90,
        message: '正在生成个性化报告和建议...'
      });

      const report = await this.reportAgent.generateReport(
        userInput,
        tuition,
        livingCosts,
        otherCosts
      );

      onProgress?.({
        step: 'complete',
        progress: 100,
        message: '费用估算报告生成完成！'
      });

      return report;

    } catch (error) {
      console.error('Cost estimation failed:', error);
      throw new Error(`费用估算失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  async generateCostEstimateParallel(
    userInput: UserInput,
    onProgress?: ProgressCallback
  ): Promise<CostEstimateReport> {
    try {
      onProgress?.({
        step: 'tuition',
        progress: 10,
        message: '正在并行查询各项费用信息...'
      });

      // 并行执行所有查询任务
      const [tuition, livingCosts, otherCosts] = await Promise.allSettled([
        this.tuitionAgent.queryTuition(userInput),
        this.livingCostAgent.analyzeLivingCosts(userInput),
        this.otherCostsAgent.calculateOtherCosts(userInput)
      ]);

      onProgress?.({
        step: 'living',
        progress: 70,
        message: '数据查询完成，正在汇总分析...'
      });

      // 检查结果
      const tuitionData = tuition.status === 'fulfilled' ? tuition.value :
        this.getEmergencyTuitionData(userInput);
      const livingData = livingCosts.status === 'fulfilled' ? livingCosts.value :
        this.getEmergencyLivingData(userInput);
      const otherData = otherCosts.status === 'fulfilled' ? otherCosts.value :
        this.getEmergencyOtherData(userInput);

      onProgress?.({
        step: 'report',
        progress: 90,
        message: '正在生成个性化报告...'
      });

      const report = await this.reportAgent.generateReport(
        userInput,
        tuitionData,
        livingData,
        otherData
      );

      onProgress?.({
        step: 'complete',
        progress: 100,
        message: '费用估算报告生成完成！'
      });

      return report;

    } catch (error) {
      console.error('Parallel cost estimation failed:', error);
      throw new Error(`费用估算失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  private getEmergencyTuitionData(userInput: UserInput) {
    const { country, level } = userInput;
    const emergencyFees = {
      'US': { 'undergraduate': 45000, 'graduate': 55000 },
      'AU': { 'undergraduate': 40000, 'graduate': 45000 }
    };

    return {
      amount: (emergencyFees as any)[country][level],
      currency: country === 'US' ? 'USD' as const : 'AUD' as const,
      period: 'annual' as const,
      source: '紧急后备数据',
      isEstimate: true,
      lastUpdated: new Date().toISOString()
    };
  }

  private getEmergencyLivingData(userInput: UserInput) {
    const { country } = userInput;
    const currency = country === 'US' ? 'USD' as const : 'AUD' as const;
    const baseAmount = country === 'US' ? 2500 : 2200;

    return {
      accommodation: { amount: Math.round(baseAmount * 0.4), type: userInput.accommodation, range: { min: 800, max: 1400 } },
      food: { amount: Math.round(baseAmount * 0.25), range: { min: 400, max: 800 } },
      transportation: { amount: Math.round(baseAmount * 0.1), range: { min: 100, max: 300 } },
      utilities: { amount: Math.round(baseAmount * 0.1), range: { min: 80, max: 200 } },
      entertainment: { amount: Math.round(baseAmount * 0.1), range: { min: 150, max: 400 } },
      miscellaneous: { amount: Math.round(baseAmount * 0.05), range: { min: 100, max: 300 } },
      total: { amount: baseAmount, range: { min: Math.round(baseAmount * 0.8), max: Math.round(baseAmount * 1.3) } },
      currency,
      period: 'monthly' as const,
      sources: ['紧急后备数据']
    };
  }

  private getEmergencyOtherData(userInput: UserInput) {
    const { country } = userInput;
    const currency = country === 'US' ? 'USD' as const : 'AUD' as const;

    return {
      applicationFee: { amount: country === 'US' ? 85 : 100, source: '紧急后备数据' },
      visaFee: { amount: country === 'US' ? 350 : 650, source: '官方标准费用' },
      healthInsurance: { amount: country === 'US' ? 2500 : 600, source: '紧急后备数据' },
      currency
    };
  }

  // 添加数据验证方法
  validateUserInput(userInput: UserInput): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!userInput.country) errors.push('国家不能为空');
    if (!userInput.university) errors.push('大学不能为空');
    if (!userInput.program) errors.push('专业不能为空');
    if (!userInput.city) errors.push('城市不能为空');
    if (!userInput.level) errors.push('学位层次不能为空');
    if (!userInput.lifestyle) errors.push('生活方式不能为空');
    if (!userInput.accommodation) errors.push('住宿偏好不能为空');

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // 添加费用对比功能
  async compareWithSimilarPrograms(
    userInput: UserInput,
    report: CostEstimateReport
  ): Promise<any> {
    try {
      // 可以实现与相似项目的费用对比
      // 这里是一个简化的实现
      return {
        comparison: '数据收集中，暂无对比信息',
        recommendation: '建议关注同地区相似专业的费用情况'
      };
    } catch (error) {
      console.error('Comparison failed:', error);
      return null;
    }
  }
}