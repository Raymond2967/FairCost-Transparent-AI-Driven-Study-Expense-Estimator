import { openRouterClient } from './openrouter';
import { OPENROUTER_CONFIG } from './constants';

/**
 * 安全的LLM客户端包装器
 * 提供更好的错误处理和降级策略
 */
export class SafeLLMClient {
  private maxRetries = 2;
  private retryDelay = 1000; // 1秒
  private defaultModel = OPENROUTER_CONFIG.model;

  async safeExtractData<T>(
    content: string,
    exampleSchema: string,
    fallbackData: T,
    description: string = '数据'
  ): Promise<T> {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`Attempting ${description} extraction (attempt ${attempt}/${this.maxRetries})`);

        const result = await openRouterClient.extractStructuredData(content, exampleSchema);

        if (this.validateResult(result, exampleSchema)) {
          console.log(`Successfully extracted ${description}`);
          return result as T;
        } else {
          console.warn(`Invalid ${description} structure, retrying...`);
          if (attempt < this.maxRetries) {
            await this.delay(this.retryDelay);
            continue;
          }
        }
      } catch (error) {
        console.error(`${description} extraction failed (attempt ${attempt}):`, error);

        if (attempt < this.maxRetries) {
          await this.delay(this.retryDelay);
          continue;
        }
      }
    }

    console.log(`Using fallback data for ${description}`);
    return fallbackData;
  }

  async safeSearch(query: string, fallbackContent: string = '数据暂时不可用', model: string = 'openai/gpt-4o'): Promise<string> {
    try {
      console.log('Performing web search:', query);
      const result = await openRouterClient.searchWeb(query, model);
      return result || fallbackContent;
    } catch (error) {
      console.error('Web search failed:', error);
      return fallbackContent;
    }
  }

  private validateResult(result: any, exampleSchema: string): boolean {
    if (!result || typeof result !== 'object') {
      return false;
    }

    try {
      // 从示例模式中提取必需字段
      const schemaObj = JSON.parse(exampleSchema);
      const requiredFields = Object.keys(schemaObj);

      // 检查所有必需字段是否存在
      for (const field of requiredFields) {
        if (!(field in result)) {
          console.warn(`Missing required field: ${field}`);
          return false;
        }
      }

      // 特殊验证：检查源URL是否是真实URL而不是占位符
      if (result.source || result.source_url) {
        const sourceUrl = result.source || result.source_url;
        if (sourceUrl && 
            (sourceUrl.includes('official-university-source.com') || 
             sourceUrl.includes('example.com') || 
             sourceUrl.includes('placeholder'))) {
          console.warn('Invalid source URL - placeholder detected:', sourceUrl);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Schema validation error:', error);
      return false;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 为特定数据类型提供预设的提取方法
  async extractTuitionData(content: string, fallback: any) {
    return this.safeExtractData(
      content,
      `{
        "tuition_amount": 45000,
        "currency": "USD",
        "period": "annual",
        "source_url": "https://university.edu",
        "is_estimate": false,
        "confidence": 0.8
      }`,
      fallback,
      '学费数据'
    );
  }

  async extractLivingCosts(content: string, fallback: any) {
    return this.safeExtractData(
      content,
      `{
        "accommodation": 1200,
        "food": 400,
        "transportation": 150,
        "utilities": 120,
        "entertainment": 200,
        "miscellaneous": 150,
        "total": 2220,
        "source_url": "https://numbeo.com",
        "confidence": 0.75
      }`,
      fallback,
      '生活费用数据'
    );
  }

  async extractApplicationFee(content: string, fallback: any) {
    return this.safeExtractData(
      content,
      `{
        "application_fee": 85,
        "source_url": "https://university.edu",
        "confidence": 0.8
      }`,
      fallback,
      '申请费用数据'
    );
  }

  async extractHealthInsurance(content: string, fallback: any) {
    return this.safeExtractData(
      content,
      `{
        "insurance_fee": 2500,
        "source_url": "https://insurance.com",
        "confidence": 0.7
      }`,
      fallback,
      '健康保险费用数据'
    );
  }

  async extractAccommodationCost(content: string, fallback: any) {
    return this.safeExtractData(
      content,
      `{
        "accommodation_cost": 1200,
        "source_url": "https://university.edu",
        "confidence": 0.8
      }`,
      fallback,
      '住宿费用数据'
    );
  }

  async extractNonAccommodationLivingCosts(searchResults: string, fallbackData: any): Promise<any> {
    const extractionPrompt = `
      Based on the following search results about living costs, extract the non-accommodation living costs:
      
      Search Results:
      ${searchResults}
      
      Extract the following information in JSON format:
      {
        "food": {
          "amount": [monthly food cost],
          "range": {"min": [minimum], "max": [maximum]},
          "source": "[source url]"
        },
        "transportation": {
          "amount": [monthly transportation cost],
          "range": {"min": [minimum], "max": [maximum]},
          "source": "[source url]"
        },
        "utilities": {
          "amount": [monthly utilities cost],
          "range": {"min": [minimum], "max": [maximum]},
          "source": "[source url]"
        },
        "entertainment": {
          "amount": [monthly entertainment cost],
          "range": {"min": [minimum], "max": [maximum]},
          "source": "[source url]"
        },
        "miscellaneous": {
          "amount": [monthly miscellaneous cost],
          "range": {"min": [minimum], "max": [maximum]},
          "source": "[source url]"
        },
        "total": {
          "amount": [sum of all categories],
          "range": {"min": [sum of minimums], "max": [sum of maximums]}
        },
        "source_url": "[main source url]",
        "confidence": [0.0-1.0]
      }
      
      If exact data is not available, use reasonable estimates based on the search results.
      Focus specifically on "Cost of Living Index (Excl. Rent)" which excludes accommodation costs.
      All amounts should be in monthly values.
    `;

    try {
      const response = await openRouterClient.chat({
        model: this.defaultModel,
        messages: [
          {
            role: 'system',
            content: 'You are a data extraction expert. Extract the requested information from the search results and return ONLY valid JSON.'
          },
          {
            role: 'user',
            content: extractionPrompt
          }
        ],
        temperature: 0.1,
        max_tokens: 1500
      });

      const content = response;
      return JSON.parse(content);
    } catch (error) {
      console.error('Failed to extract non-accommodation living costs:', error);
      return fallbackData;
    }
  }
}

export const safeLLMClient = new SafeLLMClient();