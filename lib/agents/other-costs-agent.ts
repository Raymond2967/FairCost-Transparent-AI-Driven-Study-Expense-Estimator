import { openRouterClient } from '../openrouter';
import { safeLLMClient } from '../safe-llm-client';
import { UserInput, OtherCosts } from '@/types';
import { VISA_FEES, US_UNIVERSITIES, AU_UNIVERSITIES } from '../constants';

export class OtherCostsAgent {
  async calculateOtherCosts(userInput: UserInput): Promise<OtherCosts> {
    const { country, university, level } = userInput;

    try {
      // 并行获取各种费用信息
      const [applicationFee, visaFee, healthInsurance] = await Promise.all([
        this.getApplicationFee(university, level, country),
        this.getVisaFee(country),
        this.getHealthInsurance(country, university)
      ]);

      const currency = country === 'US' ? 'USD' : 'AUD';

      return {
        applicationFee,
        visaFee,
        healthInsurance,
        currency
      };

    } catch (error) {
      console.error('Other costs calculation error:', error);
      return this.getFallbackOtherCosts(userInput);
    }
  }

  private async getApplicationFee(
    university: string,
    level: 'undergraduate' | 'graduate',
    country: 'US' | 'AU'
  ): Promise<{ amount: number; source: string }> {
    try {
      // 获取大学官网信息
      const universityData = [...US_UNIVERSITIES, ...AU_UNIVERSITIES].find(
        uni => uni.name === university
      );

      if (!universityData) {
        throw new Error('University not found');
      }

      // 搜索申请费信息
      const searchQuery = `${university} application fee ${level} ${new Date().getFullYear()} international students`;

      const searchResults = await safeLLMClient.safeSearch(searchQuery);

      const fallbackData = {
        application_fee: country === 'US' ? 85 : 100,
        source_url: universityData.website,
        confidence: 0.5
      };

      const extractedData = await safeLLMClient.extractApplicationFee(searchResults, fallbackData);

      if (extractedData && extractedData.application_fee && extractedData.confidence > 0.6) {
        return {
          amount: extractedData.application_fee,
          source: this.validateUrl(extractedData.source_url) || universityData.website
        };
      }

      // 使用默认估算
      const defaultFees = {
        'US': { 'undergraduate': 85, 'graduate': 110 },
        'AU': { 'undergraduate': 100, 'graduate': 125 }
      };

      return {
        amount: (defaultFees as any)[country][level],
        source: `${university}申请费估算`
      };

    } catch (error) {
      console.error('Application fee query failed:', error);

      // 紧急后备费用
      const emergencyFees = {
        'US': { 'undergraduate': 75, 'graduate': 100 },
        'AU': { 'undergraduate': 80, 'graduate': 100 }
      };

      return {
        amount: (emergencyFees as any)[country][level],
        source: '基于市场平均数据估算'
      };
    }
  }

  private async getVisaFee(country: 'US' | 'AU'): Promise<{ amount: number; source: string }> {
    try {
      if (country === 'US') {
        return {
          amount: VISA_FEES.US.F1,
          source: VISA_FEES.US.source
        };
      } else {
        return {
          amount: VISA_FEES.AU.student,
          source: VISA_FEES.AU.source
        };
      }
    } catch (error) {
      console.error('Visa fee query failed:', error);

      // 后备费用
      return {
        amount: country === 'US' ? 350 : 650,
        source: `${country}学生签证费用（估算）`
      };
    }
  }

  private async getHealthInsurance(
    country: 'US' | 'AU',
    university: string
  ): Promise<{ amount: number; source: string } | undefined> {
    try {
      // 搜索健康保险要求
      const searchQuery = `${university} health insurance requirement cost international students ${country} ${new Date().getFullYear()}`;

      const searchResults = await safeLLMClient.safeSearch(searchQuery);

      const fallbackData = {
        insurance_cost_annual: country === 'US' ? 2500 : 600,
        is_mandatory: true,
        source_url: `${university}健康保险要求`,
        confidence: 0.5
      };

      const extractedData = await safeLLMClient.extractHealthInsurance(searchResults, fallbackData);

      if (extractedData && extractedData.insurance_cost_annual && extractedData.is_mandatory) {
        return {
          amount: extractedData.insurance_cost_annual,
          source: this.validateUrl(extractedData.source_url) || `${university}健康保险要求`
        };
      }

      // 根据国家返回典型保险费用
      const typicalInsurance = {
        'US': 2500,
        'AU': 600
      };

      return {
        amount: typicalInsurance[country],
        source: `${country}国际学生健康保险典型费用`
      };

    } catch (error) {
      console.log('Health insurance data not available');

      // 某些情况下可能不是强制性的，返回undefined
      if (country === 'AU') {
        return {
          amount: 600, // OSHC费用
          source: '澳大利亚海外学生健康保险(OSHC)'
        };
      }

      return undefined;
    }
  }

  private getFallbackOtherCosts(userInput: UserInput): OtherCosts {
    const { country, level } = userInput;
    const currency = country === 'US' ? 'USD' : 'AUD';

    // 紧急后备数据
    const fallbackData = {
      'US': {
        applicationFee: { amount: 85, source: '美国大学申请费估算' },
        visaFee: { amount: 350, source: '美国F-1学生签证费用' },
        healthInsurance: { amount: 2500, source: '美国国际学生健康保险估算' }
      },
      'AU': {
        applicationFee: { amount: 100, source: '澳大利亚大学申请费估算' },
        visaFee: { amount: 650, source: '澳大利亚学生签证费用' },
        healthInsurance: { amount: 600, source: 'OSHC海外学生健康保险' }
      }
    };

    const data = (fallbackData as any)[country];

    return {
      applicationFee: data.applicationFee,
      visaFee: data.visaFee,
      healthInsurance: data.healthInsurance,
      currency
    };
  }

  async getAdditionalCosts(
    userInput: UserInput
  ): Promise<{ [key: string]: { amount: number; source: string } }> {
    // 可扩展的其他费用查询
    try {
      const additionalCosts: { [key: string]: { amount: number; source: string } } = {};

      // 根据用户输入查询其他相关费用
      // 例如：机票、英语考试费用、材料费等

      return additionalCosts;
    } catch (error) {
      console.error('Additional costs query failed:', error);
      return {};
    }
  }

  private validateUrl(url: string): string | null {
    if (!url || typeof url !== 'string') {
      return null;
    }

    try {
      // 检查是否是有效的URL
      new URL(url);

      // 检查是否包含中文字符
      const chineseRegex = /[\u4e00-\u9fff]/;
      if (chineseRegex.test(url)) {
        return null;
      }

      // 检查是否是合理的域名
      if (url.includes('http') && url.includes('.')) {
        return url;
      }

      return null;
    } catch (error) {
      return null;
    }
  }
}