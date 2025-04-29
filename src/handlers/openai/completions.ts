// filepath: /Users/notfolder/Documents/ollama-proxy/src/handlers/openai/completions.ts
import type { RequestHandler } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';
import type { LLMBackend } from '../../backends/base';
import type { 
  GenerateRequest, 
  OpenAICompletionResponse,
  ModelMap 
} from '../../types';
import { v4 as uuidv4 } from 'uuid';

export const handleOpenAICompletions = (
  backends: Record<string, LLMBackend>,
  modelMap: ModelMap
): RequestHandler<ParamsDictionary, any, GenerateRequest, ParsedQs> => {
  return async (req, res, next) => {
    try {
      const { 
        model, 
        prompt, 
        stream = false,
        options = {} 
      } = req.body;

      // バリデーション
      if (!prompt) {
        res.status(400).json({ error: 'Prompt is required' });
        return;
      }

      // モデル名マッチング
      const key = Object.keys(modelMap)
        .find(k => model.toLowerCase().startsWith(k));
      const target = key ? modelMap[key]
        : { backend: 'openai', model };  // デフォルトは OpenAI に流す

      const backend = backends[target.backend];
      if (!backend) {
        res.status(400).json({ error: 'Unsupported backend' });
        return;
      }

      // チャット形式に変換（システムメッセージとユーザーメッセージとして）
      const messages = [
        { role: 'user', content: prompt }
      ];

      const response = await backend.chat(messages, {
        ...options,
        model: target.model,
        stream
      });
      
      // OpenAI互換レスポンス用の共通ID
      const responseId = uuidv4();
      const timestamp = Math.floor(Date.now() / 1000);

      if (stream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        
        response.data.on('data', (chunk: Buffer) => {
          const lines = chunk.toString().split('\n').filter(line => line.trim());
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                res.write(`data: [DONE]\n\n`);
              } else {
                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content || 
                                  parsed.candidates?.[0]?.content || '';
                  
                  // OpenAI互換フォーマットでストリーミング
                  const streamResponse = {
                    id: responseId,
                    object: 'text_completion',
                    created: timestamp,
                    model: model,
                    choices: [{
                      text: content,
                      index: 0,
                      logprobs: null,
                      finish_reason: null
                    }]
                  };
                  res.write(`data: ${JSON.stringify(streamResponse)}\n\n`);
                } catch (e) {
                  console.error('Error parsing SSE data:', e);
                }
              }
            }
          }
        });

        response.data.on('end', () => {
          // ストリームの最後に finish_reason を含むチャンクを送信
          const finalChunk = {
            id: responseId,
            object: 'text_completion',
            created: timestamp,
            model: model,
            choices: [{
              text: '',
              index: 0,
              logprobs: null,
              finish_reason: 'stop'
            }]
          };
          res.write(`data: ${JSON.stringify(finalChunk)}\n\n`);
          res.write(`data: [DONE]\n\n`);
          res.end();
        });

        req.on('close', () => {
          response.data.destroy();
        });
      } else {
        const responseData = response.data || {};
        const content = responseData.choices?.[0]?.message?.content || 
                        responseData.candidates?.[0]?.content ||
                        responseData.response ||
                        '';

        // OpenAI互換フォーマットで返す
        const completionResponse: OpenAICompletionResponse = {
          id: responseId,
          object: 'text_completion',
          created: timestamp,
          model: model,
          choices: [{
            text: content,
            index: 0,
            logprobs: null,
            finish_reason: 'stop'
          }],
          usage: {
            prompt_tokens: prompt.length / 4, // 簡易的なトークン計算
            completion_tokens: content.length / 4, // 簡易的なトークン計算
            total_tokens: (prompt.length + content.length) / 4 // 簡易的なトークン計算
          }
        };

        res.json(completionResponse);
      }

    } catch (error: unknown) {
      console.error('❌ エラー発生:', error);
      next(error);
    }
  };
};