import axios from 'axios';
import { LLMBackend } from './base';
import { GenerateRequest, BackendResponse, Message } from '../types';

export class OpenAIBackend extends LLMBackend {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    super();
    this.apiKey = apiKey;
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
      url: 'https://api.openai.com/v1/chat/completions',
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
      url: 'https://api.openai.com/v1/chat/completions',
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
}