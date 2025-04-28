import type { RequestHandler } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';
import type { LLMBackend } from '../backends/base';
import type { Message, ChatResponse } from '../types';
import type { ModelMap } from '../types';

interface ChatRequestBody {
  model: string;
  messages: Message[];
  stream?: boolean;
  options?: Record<string, any>;
}

export const handleChat = (
  backends: Record<string, LLMBackend>,
  modelMap: ModelMap
): RequestHandler<ParamsDictionary, any, ChatRequestBody, ParsedQs> => {
  return async (req, res, next) => {
    try {
      const { model, messages, stream = false, options = {} } = req.body;

      console.log('💬 チャットリクエスト処理開始:', {
        model,
        messageCount: messages.length,
        stream,
        options
      });

      // バリデーション
      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        res.status(400).json({ error: 'Messages array is required and must not be empty' });
        return;
      }

      // メッセージ形式のバリデーション
      const invalidMessage = messages.find(msg => !msg.role || !msg.content);
      if (invalidMessage) {
        res.status(400).json({ error: 'Each message must have role and content' });
        return;
      }

      // モデル名マッチング
      const key = Object.keys(modelMap)
        .find(k => model.toLowerCase().startsWith(k));
      const target = key ? modelMap[key]
        : { backend: 'openai', model };  // デフォルトは OpenAI に流す

      console.log('🎯 バックエンド選択:', {
        requestedModel: model,
        matchedKey: key,
        targetBackend: target.backend,
        targetModel: target.model
      });

      const backend = backends[target.backend];
      if (!backend) {
        res.status(400).json({ error: 'Unsupported backend' });
        return;
      }

      const response = await backend.chat(messages, {
        ...options,
        model: target.model,
        stream
      });
      
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
                res.write('data: {"done": true}\n\n');
              } else {
                try {
                  const parsed = JSON.parse(data);
                  const chatResponse: ChatResponse = {
                    model: target.model,
                    created_at: new Date().toISOString(),
                    message: {
                      role: 'assistant',
                      content: parsed.choices?.[0]?.delta?.content || parsed.candidates?.[0]?.content || ''
                    },
                    done: false
                  };
                  res.write(`data: ${JSON.stringify(chatResponse)}\n\n`);
                } catch (e) {
                  console.error('Error parsing SSE data:', e);
                }
              }
            }
          }
        });

        response.data.on('end', () => {
          res.end();
        });

        req.on('close', () => {
          response.data.destroy();
        });
      } else {
        const responseData = response.data;
        const content = responseData.choices?.[0]?.message?.content || 
                       responseData.candidates?.[0]?.content ||
                       '';

        console.log('✅ レスポンス生成完了:', {
          model: target.model,
          contentLength: content.length
        });

        const chatResponse: ChatResponse = {
          model: target.model,
          created_at: new Date().toISOString(),
          message: {
            role: 'assistant',
            content
          },
          done: true
        };

        res.json(chatResponse);
      }

    } catch (error: unknown) {
      console.error('❌ エラー発生:', error);
      next(error);
    }
  };
};