import { UserInput, CostEstimateReport, EstimationProgress } from '@/types';
import { TuitionAgent } from './agents/tuition-agent';
import { LivingCostAgent } from './agents/living-cost-agent';
import { OtherCostsAgent } from './agents/other-costs-agent';
import { ReportAgent } from './agents/report-agent';
import { AccommodationAgent } from './agents/accommodation-agent';

export type ProgressCallback = (progress: EstimationProgress) => void;

export class EstimationCoordinator {
  private tuitionAgent: TuitionAgent;
  private livingCostAgent: LivingCostAgent;
  private otherCostsAgent: OtherCostsAgent;
  private reportAgent: ReportAgent;
  private accommodationAgent: AccommodationAgent;

  constructor() {
    this.tuitionAgent = new TuitionAgent();
    this.livingCostAgent = new LivingCostAgent();
    this.otherCostsAgent = new OtherCostsAgent();
    this.reportAgent = new ReportAgent();
    this.accommodationAgent = new AccommodationAgent();
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

      const livingCostsPartial = await this.livingCostAgent.analyzeLivingCosts(userInput);
      const accommodationCosts = await this.accommodationAgent.queryAccommodationCosts(userInput);

      // 合并生活成本和住宿成本数据
      const livingCosts: LivingCosts = {
        ...livingCostsPartial,
        accommodation: accommodationCosts
      } as LivingCosts;

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

      // 合并生活成本和住宿成本数据
      const combinedLivingCosts = {
        ...livingCosts,
        accommodation: accommodationCosts
      };

      const report = await this.reportAgent.generateReport(
        userInput,
        tuition,
        combinedLivingCosts,
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
      const [tuition, livingCostsPartial, accommodationCosts, otherCosts] = await Promise.allSettled([
        this.tuitionAgent.queryTuition(userInput),
        this.livingCostAgent.analyzeLivingCosts(userInput),
        this.accommodationAgent.queryAccommodationCosts(userInput),
        this.otherCostsAgent.calculateOtherCosts(userInput)
      ]);

      onProgress?.({
        step: 'living',
        progress: 70,
        message: '数据查询完成，正在汇总分析...'
      });

      // 检查结果并记录失败情况
      const tuitionData = tuition.status === 'fulfilled' ? tuition.value :
        (() => {
          console.warn('Tuition query failed:', tuition.reason);
          return this.getEmergencyTuitionData(userInput);
        })();

      const livingDataPartial = livingCostsPartial.status === 'fulfilled' ? livingCostsPartial.value :
        (() => {
          console.warn('Living costs query failed:', livingCostsPartial.reason);
          return this.getEmergencyLivingData(userInput);
        })();

      const accommodationData = accommodationCosts.status === 'fulfilled' ? accommodationCosts.value :
        (() => {
          console.warn('Accommodation costs query failed:', accommodationCosts.reason);
          return this.getEmergencyAccommodationData(userInput);
        })();

      const otherData = otherCosts.status === 'fulfilled' ? otherCosts.value :
        (() => {
          console.warn('Other costs query failed:', otherCosts.reason);
          return this.getEmergencyOtherData(userInput);
        })();

      onProgress?.({
        step: 'report',
        progress: 90,
        message: '正在生成个性化报告...'
      });

      // 合并生活成本和住宿成本数据
      const livingData: LivingCosts = {
        ...livingDataPartial,
        accommodation: accommodationData
      } as LivingCosts;

      const report = await this.reportAgent.generateReport(
        userInput,
        tuitionData,
        combinedLivingCosts,
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
      total: (emergencyFees as any)[country][level] * (level === 'undergraduate' ? 4 : 2),
      currency: country === 'US' ? 'USD' : 'AUD',
      source: '紧急后备数据',
      isEstimate: true,
      lastUpdated: new Date().toISOString(),
      confidence: 0.3,
      programDuration: level === 'undergraduate' ? 4 : 2
    };
  }

  private getEmergencyLivingData(userInput: UserInput) {
    const { country } = userInput;
    const currency = country === 'US' ? 'USD' : 'AUD';
    const baseAmount = country === 'US' ? 1380 : 1180;

    return {
      total: {
        amount: baseAmount,
        range: { min: Math.round(baseAmount * 0.8), max: Math.round(baseAmount * 1.2) }
      },
      accommodation: {
        monthlyRange: { min: 800, max: 1400 },
        currency,
        source: '紧急后备数据'
      },
      currency,
      period: 'monthly',
      sources: ['紧急后备数据']
    };
  }

  private getEmergencyAccommodationData(userInput: UserInput) {
    const { country, accommodation } = userInput;
    
    // 基础月度住宿费用范围
    const baseRanges = {
      US: {
        dormitory: { min: 800, max: 1400 },
        shared: { min: 1000, max: 1800 },
        studio: { min: 1400, max: 2200 },
        apartment: { min: 1600, max: 2500 }
      },
      AU: {
        dormitory: { min: 700, max: 1200 },
        shared: { min: 900, max: 1500 },
        studio: { min: 1200, max: 1800 },
        apartment: { min: 1400, max: 2200 }
      }
    };
    
    const countryRanges = baseRanges[country];
    const range = countryRanges?.[accommodation] || countryRanges['shared'];
    const currency = country === 'US' ? 'USD' : 'AUD';
    
    return {
      monthlyRange: range,
      currency,
      source: '紧急后备数据',
      confidence: 0.4,
      reasoning: '基于通用市场数据估算'
    };
  }

  private getEmergencyOtherData(userInput: UserInput) {
    const { country } = userInput;
    const currency = country === 'US' ? 'USD' : 'AUD';

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
    if (!userInput.locationPreference) errors.push('地理位置偏好不能为空');

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