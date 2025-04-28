import axios from 'axios';
import { LLMBackend } from './base';
import { GenerateRequest, BackendResponse, Message } from '../types';

export class GeminiBackend extends LLMBackend {
  private readonly accessToken: string;

  constructor(accessToken: string) {
    super();
    this.accessToken = accessToken;
  }

  async generate(request: GenerateRequest): Promise<BackendResponse> {
    const endpoint = 
      `https://generativelanguage.googleapis.com/v1beta/models/${request.model || 'gemini-pro'}:generateContent`;

    // システムプロンプトとユーザープロンプトを結合
    const content = request.system ? 
      `${request.system}\n\n${request.prompt}` : 
      request.prompt;

    const response = await axios({
      url: endpoint,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        contents: [{ 
          parts: [{
            text: content
          }]
        }],
        generationConfig: {
          temperature: request.options?.temperature ?? 0.7,
          top_p: request.options?.top_p ?? 1,
          top_k: request.options?.top_k ?? 32,
          maxOutputTokens: request.options?.num_predict,
        },
      },
      responseType: request.stream ? 'stream' : 'json'
    });

    return {
      status: response.status,
      data: response.data
    };
  }

  async chat(messages: Message[], options: Record<string, any> = {}): Promise<BackendResponse> {
    const endpoint = 
      `https://generativelanguage.googleapis.com/v1beta/models/${options.model || 'gemini-pro'}:generateContent`;

    const response = await axios({
      url: endpoint,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        contents: [{ 
          parts: messages.map(msg => ({
            text: msg.content
          }))
        }],
        generationConfig: {
          temperature: options.temperature ?? 0.7,
          top_p: options.top_p ?? 1,
          top_k: options.top_k ?? 32,
          maxOutputTokens: options.num_predict,
        },
      },
      responseType: options.stream ? 'stream' : 'json'
    });

    return {
      status: response.status,
      data: response.data
    };
  }
}