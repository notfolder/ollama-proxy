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
      // GoogleのAPIドキュメントに従って正しいエンドポイントを構築
      const modelName = request.model || 'gemini-pro';
      const endpoint = `${this.baseUrl}/models/${modelName}:generateContent`;
      
      // リクエストURLをデバッグ出力
      console.log('Gemini API Endpoint:', endpoint);

      // システムプロンプトとユーザープロンプトを結合
      const content = request.system ? 
        `${request.system}\n\n${request.prompt}` : 
        request.prompt;

      console.log('Sending to Gemini API:', JSON.stringify({
        contents: [{ 
          parts: [{
            text: content
          }]
        }],
        generationConfig: {
          temperature: request.options?.temperature ?? 0.7,
          topP: request.options?.top_p ?? 1,
          topK: request.options?.top_k ?? 32,
          maxOutputTokens: request.options?.num_predict || 1024
        }
      }, null, 2));

      const response = await axios({
        // APIキーをクエリパラメータとして渡す（Gemini API標準の認証方法）
        url: `${endpoint}?key=${this.apiKey}`,
        method: 'POST',
        headers: {
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
            topP: request.options?.top_p ?? 1, // 注: API仕様に合わせてキャメルケースに変更
            topK: request.options?.top_k ?? 32, // 注: API仕様に合わせてキャメルケースに変更
            maxOutputTokens: request.options?.num_predict || 1024
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
      if (typeof error === 'object' && error !== null && 'response' in error) {
        const axiosError = error as any;
        console.error('Gemini API error details:', {
          status: axiosError.response?.status,
          statusText: axiosError.response?.statusText,
          data: axiosError.response?.data,
          headers: axiosError.response?.headers
        });
      } else {
        console.error('Gemini API error:', 
          error instanceof Error ? error.message : String(error)
        );
      }
      throw error;
    }
  }

  async chat(messages: Message[], options: Record<string, any> = {}): Promise<BackendResponse> {
    try {
      // GoogleのAPIドキュメントに従って正しいエンドポイントを構築
      const modelName = options.model || 'gemini-pro';
      const endpoint = `${this.baseUrl}/models/${modelName}:generateContent`;
      
      // リクエストURLをデバッグ出力
      console.log('Gemini API Endpoint:', endpoint);

      // Gemini APIのメッセージ形式に変換
      // 注: Gemini APIはチャット履歴をそのまま受け取るため、適切な変換が必要
      const formattedMessages = [];
      
      // システムメッセージを探して最初に配置（存在する場合）
      const systemMessage = messages.find(msg => msg.role === 'system');
      const userMessages = messages.filter(msg => msg.role !== 'system');
      
      // ユーザーとアシスタントのメッセージを交互に配置
      for (const msg of userMessages) {
        if (msg.role === 'user') {
          formattedMessages.push({
            role: 'user',
            parts: [{
              text: msg.content
            }]
          });
        } else if (msg.role === 'assistant') {
          formattedMessages.push({
            role: 'model',
            parts: [{
              text: msg.content
            }]
          });
        }
      }
      
      // システムメッセージが存在し、かつメッセージがない場合は、システムメッセージをユーザーメッセージとして追加
      if (systemMessage && formattedMessages.length === 0) {
        formattedMessages.push({
          role: 'user',
          parts: [{
            text: systemMessage.content
          }]
        });
      } else if (systemMessage) {
        // システムメッセージが存在し、他のメッセージもある場合は、最初のユーザーメッセージに前置
        const firstUserIndex = formattedMessages.findIndex(m => m.role === 'user');
        if (firstUserIndex !== -1) {
          const firstMsg = formattedMessages[firstUserIndex];
          formattedMessages[firstUserIndex] = {
            role: 'user',
            parts: [{
              text: `${systemMessage.content}\n\n${firstMsg.parts[0].text}`
            }]
          };
        }
      }
      
      // 空のメッセージのチェック
      if (formattedMessages.length === 0) {
        throw new Error('No valid messages to send to Gemini API');
      }
      
      console.log('Sending to Gemini API:', JSON.stringify({
        contents: formattedMessages,
        generationConfig: {
          temperature: options.temperature ?? 0.7,
          topP: options.top_p ?? 1,
          topK: options.top_k ?? 32,
          maxOutputTokens: options.num_predict || 1024
        }
      }, null, 2));
      
      const response = await axios({
        url: `${endpoint}?key=${this.apiKey}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        data: {
          contents: formattedMessages,
          generationConfig: {
            temperature: options.temperature ?? 0.7,
            topP: options.top_p ?? 1, // 注: API仕様に合わせてキャメルケースに変更
            topK: options.top_k ?? 32, // 注: API仕様に合わせてキャメルケースに変更
            maxOutputTokens: options.num_predict || 1024
          }
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
      if (typeof error === 'object' && error !== null && 'response' in error) {
        const axiosError = error as any;
        console.error('Gemini API error details:', {
          status: axiosError.response?.status,
          statusText: axiosError.response?.statusText,
          data: axiosError.response?.data,
          headers: axiosError.response?.headers
        });
      } else {
        console.error('Gemini API error:', 
          error instanceof Error ? error.message : String(error)
        );
      }
      throw error;
    }
  }

  async listModels(): Promise<BackendResponse> {
    try {
      const response = await axios({
        url: `${this.baseUrl}/models?key=${this.apiKey}`,
        method: 'GET',
        headers: {
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
        console.error('Gemini API error details:', {
          status: axiosError.response?.status,
          statusText: axiosError.response?.statusText,
          data: axiosError.response?.data,
          headers: axiosError.response?.headers
        });
      } else {
        console.error('Gemini API error:', 
          error instanceof Error ? error.message : String(error)
        );
      }
      throw error;
    }
  }
}