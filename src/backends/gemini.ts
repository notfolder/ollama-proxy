import axios from 'axios';
import { LLMBackend } from './base';
import { GenerateRequest, BackendResponse, Message } from '../types';

export class GeminiBackend extends LLMBackend {
  private readonly projectId: string;
  private readonly location: string;
  private readonly accessToken: string;

  constructor(projectId: string, location: string, accessToken: string) {
    super();
    this.projectId = projectId;
    this.location = location;
    this.accessToken = accessToken;
  }

  async generate(request: GenerateRequest): Promise<BackendResponse> {
    const endpoint = 
      `https://generativelanguage.googleapis.com/v1beta/models/${request.model || 'gemini-pro'}:generateContent`;

    const response = await axios({
      url: endpoint,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        contents: [{ 
          parts: request.messages.map(msg => ({
            text: msg.content
          }))
        }],
        generationConfig: {
          temperature: request.options?.temperature ?? 0.7,
          topP: request.options?.topP ?? 1,
          topK: request.options?.topK ?? 32,
          maxOutputTokens: request.options?.maxOutputTokens,
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
          // messagesをGemini APIの形式に変換
          parts: messages.map(msg => ({
            text: msg.content
          }))
        }],
        generationConfig: {
          temperature: options.temperature ?? 0.7,
          topP: options.topP ?? 1,
          topK: options.topK ?? 32,
          maxOutputTokens: options.maxOutputTokens,
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