import { openRouterClient } from './openrouter';

/**
 * 安全的LLM客户端包装器
 * 提供更好的错误处理和降级策略
 */
export class SafeLLMClient {
  private maxRetries = 2;
  private retryDelay = 1000; // 1秒

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
}

export const safeLLMClient = new SafeLLMClient();