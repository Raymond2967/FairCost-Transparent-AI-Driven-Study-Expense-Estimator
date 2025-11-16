import { openRouterClient } from '../openrouter';
import { safeLLMClient } from '../safe-llm-client';
import { UserInput, OtherCosts } from '@/types';
import { VISA_FEES, US_UNIVERSITIES, AU_UNIVERSITIES, UK_UNIVERSITIES, CA_UNIVERSITIES, DE_UNIVERSITIES, SEARCH_MODEL } from '../constants';

export class OtherCostsAgent {
  async calculateOtherCosts(userInput: UserInput): Promise<OtherCosts> {
    const { country, university, level } = userInput;

    try {
      // 并行获取各种费用信息
      const [applicationFee, visaFee, healthInsurance] = await Promise.all([
        this.getApplicationFee(userInput), // 传递完整的userInput对象
        this.getVisaFee(country),
        this.getHealthInsurance(country, university)
      ]);

      const currency = country === 'US' ? 'USD' : country === 'UK' ? 'GBP' : country === 'CA' ? 'CAD' : country === 'DE' ? 'EUR' : 'AUD';

      return {
        applicationFee,
        visaFee,
        healthInsurance, // 如果为undefined，则不包含在最终报告中
        currency
      };

    } catch (error) {
      console.error('Other costs calculation error:', error);
      return this.getFallbackOtherCosts(userInput);
    }
  }

  private async getApplicationFee(
    userInput: UserInput
  ): Promise<{ amount: number; source: string; confidence?: number }> {
    const { university, level, program, country } = userInput;
    
    try {
      // 获取大学官网信息
      const universityData = [...US_UNIVERSITIES, ...AU_UNIVERSITIES, ...UK_UNIVERSITIES, ...CA_UNIVERSITIES, ...DE_UNIVERSITIES].find(
        uni => uni.name === university
      );

      if (!universityData) {
        throw new Error('University not found');
      }

      // 构建更精确的搜索查询，包含专业领域信息
      const searchQuery = `${university} ${program} application fee ${level} ${new Date().getFullYear()} international students`;

      // 使用gpt-4o-search-preview模型进行搜索
      const searchResults = await safeLLMClient.safeSearch(searchQuery, '数据暂时不可用', SEARCH_MODEL);

      const fallbackData = {
        application_fee: country === 'US' ? 85 : country === 'UK' ? 50 : country === 'CA' ? 100 : country === 'DE' ? 75 : 100,
        source_url: universityData.website,
        confidence: 0.5
      };

      const extractedData = await safeLLMClient.extractApplicationFee(searchResults, fallbackData);

      if (extractedData && extractedData.application_fee && extractedData.confidence > 0.6) {
        return {
          amount: extractedData.application_fee,
          source: this.validateUrl(extractedData.source_url) || universityData.website,
          confidence: extractedData.confidence
        };
      }

      // 如果没有找到特定专业的申请费，尝试搜索通用申请费
      const generalSearchQuery = `${university} general application fee ${level} ${new Date().getFullYear()} international students`;
      const generalSearchResults = await safeLLMClient.safeSearch(generalSearchQuery, '数据暂时不可用', SEARCH_MODEL);
      const generalExtractedData = await safeLLMClient.extractApplicationFee(generalSearchResults, fallbackData);

      if (generalExtractedData && generalExtractedData.application_fee && generalExtractedData.confidence > 0.6) {
        return {
          amount: generalExtractedData.application_fee,
          source: this.validateUrl(generalExtractedData.source_url) || universityData.website,
          confidence: generalExtractedData.confidence
        };
      }

      // 使用默认估算
      const defaultFees = {
        'US': { 'undergraduate': 85, 'graduate': 110 },
        'AU': { 'undergraduate': 100, 'graduate': 125 },
        'UK': { 'undergraduate': 50, 'graduate': 75 },
        'CA': { 'undergraduate': 100, 'graduate': 125 },
        'DE': { 'undergraduate': 75, 'graduate': 100 }
      };

      return {
        amount: (defaultFees as any)[country][level],
        source: `${university}申请费估算`,
        confidence: 0.6
      };

    } catch (error) {
      console.error('Application fee query failed:', error);

      // 紧急后备费用
      const emergencyFees = {
        'US': { 'undergraduate': 75, 'graduate': 100 },
        'AU': { 'undergraduate': 80, 'graduate': 100 },
        'UK': { 'undergraduate': 50, 'graduate': 75 },
        'CA': { 'undergraduate': 90, 'graduate': 110 },
        'DE': { 'undergraduate': 60, 'graduate': 85 }
      };

      return {
        amount: (emergencyFees as any)[country][level],
        source: '基于市场平均数据估算',
        confidence: 0.4
      };
    }
  }

  private async getVisaFee(country: 'US' | 'AU' | 'UK' | 'CA' | 'DE'): Promise<{ amount: number; source: string; confidence?: number }> {
    try {
      if (country === 'US') {
        return {
          amount: VISA_FEES.US.F1,
          source: VISA_FEES.US.source,
          confidence: 0.9 // 官方费用，置信度高
        };
      } else if (country === 'UK') {
        return {
          amount: VISA_FEES.UK.tier4,
          source: VISA_FEES.UK.source,
          confidence: 0.9 // 官方费用，置信度高
        };
      } else if (country === 'CA') {
        return {
          amount: VISA_FEES.CA.study,
          source: VISA_FEES.CA.source,
          confidence: 0.9 // 官方费用，置信度高
        };
      } else if (country === 'DE') {
        return {
          amount: VISA_FEES.DE.national,
          source: VISA_FEES.DE.source,
          confidence: 0.9 // 官方费用，置信度高
        };
      } else {
        return {
          amount: VISA_FEES.AU.student,
          source: VISA_FEES.AU.source,
          confidence: 0.9 // 官方费用，置信度高
        };
      }
    } catch (error) {
      console.error('Visa fee query failed:', error);
      
      // 紧急后备费用
      const emergencyFees = {
        'US': { amount: 350, source: '美国学生签证标准费用', confidence: 0.8 },
        'AU': { amount: 650, source: '澳大利亚学生签证标准费用', confidence: 0.8 },
        'UK': { amount: 475, source: '英国Tier 4学生签证标准费用', confidence: 0.8 },
        'CA': { amount: 150, source: '加拿大学习许可标准费用', confidence: 0.8 },
        'DE': { amount: 75, source: '德国国家签证标准费用', confidence: 0.8 }
      };

      return emergencyFees[country];
    }
  }

  private async getHealthInsurance(
    country: 'US' | 'AU' | 'UK' | 'CA' | 'DE',
    university: string
  ): Promise<{ amount: number; source: string; confidence?: number } | undefined> {
    try {
      // 搜索健康保险费用，仅搜索学校官方要求的保险
      const searchQuery = `${university} ${country === 'US' ? 'health insurance requirement' : 
                          country === 'UK' ? 'health insurance requirement' : 
                          country === 'CA' ? 'health insurance requirement' : 
                          country === 'DE' ? 'health insurance requirement' : 
                          'OSHC requirement'} international students ${new Date().getFullYear()} official`;

      // 使用gpt-4o-search-preview模型进行搜索
      const searchResults = await safeLLMClient.safeSearch(searchQuery, '数据暂时不可用', SEARCH_MODEL);

      const fallbackData = {
        insurance_fee: country === 'US' ? 2500 : country === 'UK' ? 3000 : country === 'CA' ? 2000 : country === 'DE' ? 1000 : 600,
        source_url: '',
        confidence: 0.5
      };

      const extractedData = await safeLLMClient.extractHealthInsurance(searchResults, fallbackData);

      // 只有当置信度较高且来源可靠时才返回数据
      if (extractedData && extractedData.insurance_fee && extractedData.confidence > 0.7 && extractedData.source_url) {
        const validatedUrl = this.validateUrl(extractedData.source_url);
        if (validatedUrl) {
          return {
            amount: extractedData.insurance_fee,
            source: validatedUrl,
            confidence: extractedData.confidence
          };
        }
      }

      // 如果没有找到可靠的官方保险数据，返回undefined
      return undefined;

    } catch (error) {
      console.error('Health insurance query failed:', error);
      // 如果查询失败，返回undefined而不是默认值
      return undefined;
    }
  }

  private getFallbackOtherCosts(userInput: UserInput): OtherCosts {
    const { country } = userInput;
    const currency = country === 'US' ? 'USD' : country === 'UK' ? 'GBP' : country === 'CA' ? 'CAD' : country === 'DE' ? 'EUR' : 'AUD';

    // 注意：这里不包含健康保险，因为如果没有找到可靠数据，就不应该显示
    const defaultFees = {
      'US': { application: 85, visa: 350 },
      'AU': { application: 100, visa: 650 },
      'UK': { application: 50, visa: 475 },
      'CA': { application: 100, visa: 150 },
      'DE': { application: 75, visa: 75 }
    };

    return {
      applicationFee: { amount: defaultFees[country].application, source: '紧急后备数据', confidence: 0.3 },
      visaFee: { amount: defaultFees[country].visa, source: '官方标准费用', confidence: 0.9 },
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
    try {
      new URL(url);
      return url;
    } catch {
      return null;
    }
  }
}