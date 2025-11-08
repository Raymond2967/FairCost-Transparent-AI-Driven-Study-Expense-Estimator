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

  async searchWeb(query: string, model: string = OPENROUTER_CONFIG.model): Promise<string> {
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
        model: model, // 使用传入的模型参数
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
          content: `You are a data extraction specialist. Extract structured data from the provided content according to the specified schema.

IMPORTANT: Return ONLY the JSON object without any markdown formatting, code blocks, or additional text.
The response should be valid JSON that can be directly parsed.

Example of correct format:
{"field1": "value1", "field2": 123}

NOT:
\`\`\`json
{"field1": "value1"}
\`\`\``
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

      // Clean response by removing markdown code blocks if present
      const cleanedResponse = this.cleanJsonResponse(response);

      try {
        return JSON.parse(cleanedResponse);
      } catch (parseError) {
        console.error('Failed to parse JSON response:', cleanedResponse);
        console.error('Original response:', response);

        // Try to extract JSON from markdown-wrapped response as fallback
        const fallbackJson = this.extractJsonFromMarkdown(response);
        if (fallbackJson) {
          try {
            return JSON.parse(fallbackJson);
          } catch (fallbackError) {
            console.error('Fallback parsing also failed');
          }
        }

        throw new Error('Invalid JSON response from LLM');
      }
    } catch (error) {
      console.error('Data extraction error:', error);
      throw error;
    }
  }

  private cleanJsonResponse(response: string): string {
    // Remove common markdown formatting
    return response
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .replace(/^[\s\n]*/, '')
      .replace(/[\s\n]*$/, '')
      .trim();
  }

  private extractJsonFromMarkdown(response: string): string | null {
    // Try to extract JSON from markdown code blocks
    const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
    const match = response.match(jsonRegex);

    if (match && match[1]) {
      return match[1].trim();
    }

    // Try without the 'json' label
    const generalCodeRegex = /```\s*([\s\S]*?)\s*```/;
    const generalMatch = response.match(generalCodeRegex);

    if (generalMatch && generalMatch[1]) {
      const content = generalMatch[1].trim();
      // Check if it looks like JSON
      if (content.startsWith('{') && content.endsWith('}')) {
        return content;
      }
    }

    return null;
  }
}

export const openRouterClient = new OpenRouterClient();