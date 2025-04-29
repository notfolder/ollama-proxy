import axios from 'axios';
import { LLMBackend } from './base';
import { GenerateRequest, BackendResponse, Message } from '../types';

export class OllamaBackend extends LLMBackend {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    super();
    this.baseUrl = baseUrl;
  }

  async generate(request: GenerateRequest): Promise<BackendResponse> {
    try {
      // Ollamaの/api/generateエンドポイントに直接リクエストを送信
      // OllamaのAPIは認証キーを必要としないため、APIキーは不要
      const response = await axios({
        url: `${this.baseUrl}/api/generate`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        data: {
          model: request.model,
          prompt: request.prompt,
          system: request.system,
          stream: request.stream,
          options: request.options,
          format: request.format,
          context: request.context
        },
        responseType: request.stream ? 'stream' : 'json'
      });

      return {
        status: response.status,
        data: response.data
      };
    } catch (error: unknown) {
      // エラーを型安全に処理
      if (typeof error === 'object' && error !== null && 'response' in error) {
        const axiosError = error as any;
        console.error('Ollama API error details:', {
          status: axiosError.response?.status,
          statusText: axiosError.response?.statusText,
          data: axiosError.response?.data,
          headers: axiosError.response?.headers
        });
      } else {
        console.error('Ollama API error:', 
          error instanceof Error ? error.message : String(error)
        );
      }
      throw error;
    }
  }

  async chat(messages: Message[], options: Record<string, any> = {}): Promise<BackendResponse> {
    try {
      // Ollamaの/api/chatエンドポイントに直接リクエストを送信
      const response = await axios({
        url: `${this.baseUrl}/api/chat`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        data: {
          model: options.model || 'llama2',
          messages,
          stream: options.stream || false,
          options: {
            temperature: options.temperature,
            top_p: options.top_p,
            top_k: options.top_k,
            num_predict: options.num_predict,
            // その他のOllamaがサポートするオプション
            presence_penalty: options.presence_penalty,
            frequency_penalty: options.frequency_penalty,
            repeat_penalty: options.repeat_penalty,
            seed: options.seed,
            stop: options.stop,
          },
          format: options.format
        },
        responseType: options.stream ? 'stream' : 'json'
      });

      return {
        status: response.status,
        data: response.data
      };
    } catch (error: unknown) {
      // エラーを型安全に処理
      if (typeof error === 'object' && error !== null && 'response' in error) {
        const axiosError = error as any;
        console.error('Ollama API error details:', {
          status: axiosError.response?.status,
          statusText: axiosError.response?.statusText,
          data: axiosError.response?.data,
          headers: axiosError.response?.headers
        });
      } else {
        console.error('Ollama API error:', 
          error instanceof Error ? error.message : String(error)
        );
      }
      throw error;
    }
  }

  // Ollamaからモデル一覧を取得するメソッド
  async listModels(): Promise<BackendResponse> {
    try {
      const response = await axios({
        url: `${this.baseUrl}/api/tags`,
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
        console.error('Ollama API error details:', {
          status: axiosError.response?.status,
          statusText: axiosError.response?.statusText,
          data: axiosError.response?.data,
          headers: axiosError.response?.headers
        });
      } else {
        console.error('Ollama API error:', 
          error instanceof Error ? error.message : String(error)
        );
      }
      throw error;
    }
  }
}