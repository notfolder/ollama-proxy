import axios from 'axios';
import { LLMBackend } from './base';
import { GenerateRequest, BackendResponse, Message } from '../types';

export class GeminiBackend extends LLMBackend {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(apiKey: string, baseUrl: string) {
    super();
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  // Gemini APIのレスポンスを統一形式に変換するプライベートメソッド
  private transformResponse(responseData: any): any {
    if (!responseData) return responseData;
    
    // ストリームの場合は変換しない
    if (responseData.on) return responseData;
    
    // Gemini APIのレスポンス形式を OpenAI 互換形式に変換
    if (responseData.candidates && responseData.candidates.length > 0) {
      const candidate = responseData.candidates[0];
      
      if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
        const text = candidate.content.parts[0].text || '';
        
        return {
          ...responseData,
          choices: [{
            message: {
              content: text,
              role: 'assistant'
            }
          }]
        };
      }
    }
    
    return responseData;
  }

  async generate(request: GenerateRequest): Promise<BackendResponse> {
    try {
      const endpoint = 
        `${this.baseUrl}/models/${request.model || 'gemini-pro'}:generateContent`;

      // システムプロンプトとユーザープロンプトを結合
      const content = request.system ? 
        `${request.system}\n\n${request.prompt}` : 
        request.prompt;

      const response = await axios({
        url: endpoint,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
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
            maxOutputTokens: request.options?.num_predict || 1024,
          },
        },
        responseType: request.stream ? 'stream' : 'json'
      });

      // レスポンスデータを変換
      const transformedData = request.stream ? response.data : this.transformResponse(response.data);

      return {
        status: response.status,
        data: transformedData
      };
    } catch (error: unknown) {
      // エラーを型安全に処理
      console.error('Gemini API error:', 
        error instanceof Error 
          ? error.message 
          : (typeof error === 'object' && error !== null && 'response' in error 
              ? (error as any).response?.data 
              : String(error))
      );
      throw error;
    }
  }

  async chat(messages: Message[], options: Record<string, any> = {}): Promise<BackendResponse> {
    try {
      const endpoint = 
        `${this.baseUrl}/models/${options.model || 'gemini-pro'}:generateContent`;

      // Gemini APIのメッセージ形式に変換
      const formattedMessages = messages.map(msg => {
        let role = 'user';
        if (msg.role === 'assistant') {
          role = 'model';
        } else if (msg.role === 'system') {
          // システムメッセージは特別扱い
          role = 'user';
        }

        return {
          role,
          parts: [{
            text: msg.content
          }]
        };
      });
      
      const response = await axios({
        url: endpoint,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        data: {
          contents: formattedMessages,
          generationConfig: {
            temperature: options.temperature ?? 0.7,
            top_p: options.top_p ?? 1,
            top_k: options.top_k ?? 32,
            maxOutputTokens: options.num_predict || 1024,
          },
        },
        responseType: options.stream ? 'stream' : 'json'
      });

      // レスポンスデータを変換
      const transformedData = options.stream ? response.data : this.transformResponse(response.data);

      return {
        status: response.status,
        data: transformedData
      };
    } catch (error: unknown) {
      // エラーを型安全に処理
      console.error('Gemini API error:', 
        error instanceof Error 
          ? error.message 
          : (typeof error === 'object' && error !== null && 'response' in error 
              ? (error as any).response?.data 
              : String(error))
      );
      throw error;
    }
  }
}