import { OPENROUTER_CONFIG } from './constants';
import { LLMRequest } from '@/types';

export class OpenRouterClient {
  private apiKey: string;
  private baseURL: string;

  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY || '';
    this.baseURL = OPENROUTER_CONFIG.baseURL;

    if (!this.apiKey) {
      throw new Error('OPENROUTER_API_KEY is not configured');
    }
  }

  async chat(request: LLMRequest): Promise<string> {
    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Title': 'Smart Study Abroad Cost Estimator',
        },
        body: JSON.stringify({
          model: request.model || OPENROUTER_CONFIG.model,
          messages: request.messages,
          temperature: request.temperature || OPENROUTER_CONFIG.temperature,
          max_tokens: request.max_tokens || OPENROUTER_CONFIG.max_tokens,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid response format from OpenRouter API');
      }

      return data.choices[0].message.content;
    } catch (error) {
      console.error('OpenRouter API error:', error);
      throw new Error(`LLM request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async searchWeb(query: string): Promise<string> {
    try {
      const messages = [
        {
          role: 'system' as const,
          content: `You are a web research assistant. Search for and provide accurate information about: ${query}.
                   Provide specific data points, URLs, and sources when possible. Focus on official and authoritative sources.`
        },
        {
          role: 'user' as const,
          content: `Please search for information about: ${query}`
        }
      ];

      return await this.chat({
        model: OPENROUTER_CONFIG.model,
        messages,
        temperature: 0.3,
        max_tokens: 1500
      });
    } catch (error) {
      console.error('Web search error:', error);
      throw error;
    }
  }

  async extractStructuredData(content: string, schema: string): Promise<any> {
    try {
      const messages = [
        {
          role: 'system' as const,
          content: `You are a data extraction specialist. Extract structured data from the provided content according to the specified schema. Return ONLY valid JSON without any additional text or formatting.`
        },
        {
          role: 'user' as const,
          content: `Extract data according to this schema: ${schema}\n\nFrom this content:\n${content}`
        }
      ];

      const response = await this.chat({
        model: OPENROUTER_CONFIG.model,
        messages,
        temperature: 0.1,
        max_tokens: 2000
      });

      try {
        return JSON.parse(response);
      } catch (parseError) {
        console.error('Failed to parse JSON response:', response);
        throw new Error('Invalid JSON response from LLM');
      }
    } catch (error) {
      console.error('Data extraction error:', error);
      throw error;
    }
  }
}

export const openRouterClient = new OpenRouterClient();