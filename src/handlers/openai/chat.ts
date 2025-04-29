// filepath: /Users/notfolder/Documents/ollama-proxy/src/handlers/openai/chat.ts
import type { RequestHandler } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';
import type { LLMBackend } from '../../backends/base';
import type { 
  Message, 
  ChatRequest, 
  OpenAIChatResponse,
  OpenAIChatStreamResponse,
  ModelMap 
} from '../../types';
import { v4 as uuidv4 } from 'uuid';

export const handleOpenAIChat = (
  backends: Record<string, LLMBackend>,
  modelMap: ModelMap
): RequestHandler<ParamsDictionary, any, ChatRequest, ParsedQs> => {
  return async (req, res, next) => {
    try {
      const { 
        model, 
        messages, 
        stream = false, 
        format,
        options = {} 
      } = req.body;

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

      const backend = backends[target.backend];
      if (!backend) {
        res.status(400).json({ error: 'Unsupported backend' });
        return;
      }

      const response = await backend.chat(messages, {
        ...options,
        model: target.model,
        stream,
        format
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
                  const streamResponse: OpenAIChatStreamResponse = {
                    id: responseId,
                    object: 'chat.completion.chunk',
                    created: timestamp,
                    model: model,
                    choices: [{
                      index: 0,
                      delta: {
                        content: content,
                      },
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
          const finalChunk: OpenAIChatStreamResponse = {
            id: responseId,
            object: 'chat.completion.chunk',
            created: timestamp,
            model: model,
            choices: [{
              index: 0,
              delta: {},
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
                        '';

        // OpenAI互換フォーマットで返す
        const chatResponse: OpenAIChatResponse = {
          id: responseId,
          object: 'chat.completion',
          created: timestamp,
          model: model,
          choices: [{
            index: 0,
            message: {
              role: 'assistant',
              content: content
            },
            finish_reason: 'stop'
          }],
          usage: {
            prompt_tokens: messages.reduce((acc, msg) => acc + msg.content.length, 0) / 4, // 簡易的なトークン計算
            completion_tokens: content.length / 4, // 簡易的なトークン計算
            total_tokens: (messages.reduce((acc, msg) => acc + msg.content.length, 0) + content.length) / 4 // 簡易的なトークン計算
          }
        };

        res.json(chatResponse);
      }

    } catch (error: unknown) {
      console.error('❌ エラー発生:', error);
      next(error);
    }
  };
};