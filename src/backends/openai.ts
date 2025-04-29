import axios from 'axios';
import { LLMBackend } from './base';
import { GenerateRequest, BackendResponse, Message } from '../types';

export class OpenAIBackend extends LLMBackend {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(apiKey: string, baseUrl: string) {
    super();
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async generate(request: GenerateRequest): Promise<BackendResponse> {
    // システムメッセージとユーザープロンプトを配列に変換
    const messages = [];
    if (request.system) {
      messages.push({
        role: 'system',
        content: request.system
      });
    }
    messages.push({
      role: 'user',
      content: request.prompt
    });

    const response = await axios({
      url: `${this.baseUrl}/chat/completions`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      data: {
        model: request.model,
        messages,
        stream: request.stream,
        ...request.options
      },
      responseType: request.stream ? 'stream' : 'json'
    });

    return {
      status: response.status,
      data: response.data
    };
  }

  async chat(messages: Message[], options: Record<string, any> = {}): Promise<BackendResponse> {
    const response = await axios({
      url: `${this.baseUrl}/chat/completions`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      data: {
        // デフォルトでgpt-3.5-turboを使用。必要に応じてoptionsでgpt-4等に上書き可能
        model: options.model || 'gpt-3.5-turbo',
        messages,
        stream: options.stream || false,
        ...options
      },
      responseType: options.stream ? 'stream' : 'json'
    });

    return {
      status: response.status,
      data: response.data
    };
  }

  async listModels(): Promise<BackendResponse> {
    try {
      const response = await axios({
        url: `${this.baseUrl}/models`,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        }
      });

      return {
        status: response.status,
        data: response.data
      };
    } catch (error: unknown) {
      // エラーを型安全に処理
      if (typeof error === 'object' && error !== null && 'response' in error) {
        const axiosError = error as any;
        console.error('OpenAI API error details:', {
          status: axiosError.response?.status,
          statusText: axiosError.response?.statusText,
          data: axiosError.response?.data,
          headers: axiosError.response?.headers
        });
      } else {
        console.error('OpenAI API error:', 
          error instanceof Error ? error.message : String(error)
        );
      }
      throw error;
    }
  }
}