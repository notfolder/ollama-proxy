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
    try {
      // APIキーチェック
      if (!this.apiKey) {
        throw new Error('OpenAI API key is not set. Please set OPENAI_API_KEY in your environment variables.');
      }

      // モデル名のバリデーション - モデル名がない場合はデフォルトを使用
      let modelName = request.model;
      if (!modelName) {
        console.warn('Model name is not specified for OpenAI. Using default model: gpt-3.5-turbo');
        modelName = 'gpt-3.5-turbo';
      }

      // モデル名がgpt-で始まらない場合、適切な形式に変換を試みる
      if (!modelName.startsWith('gpt-')) {
        // gpt4.1-nanoのようなフォーマットをgpt-4.1-nanoに変換
        if (modelName.match(/^gpt[0-9]/i)) {
          const correctedName = 'gpt-' + modelName.substring(3);
          console.log(`Converting model name "${modelName}" to "${correctedName}"`);
          modelName = correctedName;
        }
      }
      
      console.log(`OpenAI generate request: model=${modelName}, streaming=${request.stream}`);

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

      // OpenAIがサポートしているオプションのみを抽出
      const supportedOptions: Record<string, any> = {
        temperature: request.options?.temperature,
        top_p: request.options?.top_p,
        // num_predictをmax_tokensとして使用
        presence_penalty: request.options?.presence_penalty,
        frequency_penalty: request.options?.frequency_penalty,
        stop: request.options?.stop,
      };
      
      // num_predictをmax_tokensに変換（オプションで直接指定された場合）
      if (request.options?.num_predict !== undefined) {
        supportedOptions.max_tokens = request.options.num_predict;
      }

      // undefinedの値を持つプロパティを削除
      const cleanOptions = Object.entries(supportedOptions)
        .filter(([_, value]) => value !== undefined)
        .reduce((obj, [key, value]) => {
          obj[key] = value;
          return obj;
        }, {} as Record<string, any>);

      console.log('Sending request to OpenAI with options:', cleanOptions);

      const response = await axios({
        url: `${this.baseUrl}/chat/completions`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        data: {
          model: modelName,
          messages,
          stream: request.stream,
          ...cleanOptions
        },
        responseType: request.stream ? 'stream' : 'json'
      });

      return {
        status: response.status,
        data: response.data
      };
    } catch (error: unknown) {
      // エラーハンドリング
      if (typeof error === 'object' && error !== null && 'response' in error) {
        const axiosError = error as any;
        console.error('OpenAI API error details:', {
          status: axiosError.response?.status,
          statusText: axiosError.response?.statusText,
          data: axiosError.response?.data,
          headers: axiosError.response?.headers
        });
        
        // エラーの詳細を追加ログ出力
        if (axiosError.response?.status === 400) {
          const errorMessage = axiosError.response?.data?.error?.message || 'Unknown error';
          console.error(`OpenAI 400エラー: ${errorMessage}`);
          
          if (errorMessage.includes('top_k')) {
            console.error('注意: top_kパラメータはOpenAIでサポートされていません。');
          }
        }
      } else {
        console.error('OpenAI API error:', 
          error instanceof Error ? error.message : String(error)
        );
      }
      throw error;
    }
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

      // APIから取得したモデル一覧から「gpt-」で始まるモデルのみをフィルタリング
      const gptModels = response.data.data.filter((model: any) => 
        model.id.startsWith('gpt-')
      );
      
      console.log(`OpenAI: 「gpt-」で始まる${gptModels.length}個のモデルを取得しました`);
      
      // フィルタリングしたモデルのみを含むレスポンスを返す
      return {
        status: response.status,
        data: {
          object: response.data.object,
          data: gptModels
        }
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