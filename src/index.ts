import express from 'express';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';
import { OpenAIBackend } from './backends/openai';
import { GeminiBackend } from './backends/gemini';
import { LLMBackend } from './backends/base';
import { GenerateRequest, Message, ChatResponse } from './types';
import { AxiosError } from 'axios';

interface RequestBody {
  model: string;
  prompt: string;
  stream?: boolean;
  options?: Record<string, any>;
}

interface ChatRequestBody {
  model: string;
  messages: Message[];
  stream?: boolean;
  options?: Record<string, any>;
}

interface ModelMapping {
  backend: 'openai' | 'gemini';
  model: string;
}

interface ModelMap {
  [key: string]: ModelMapping;
}

const app = express();
app.use(express.json());

// ── バックエンドインスタンスを初期化 ──
const backends: Record<string, LLMBackend> = {
  openai: new OpenAIBackend(process.env.OPENAI_API_KEY || ''),
  gemini: new GeminiBackend(
    process.env.GCP_PROJECT_ID || '',
    process.env.GCP_LOCATION || '',
    process.env.GCP_ACCESS_TOKEN || ''
  )
};

// ── モデル名からバックエンド & 実際のモデル名へのマッピング ──
const modelMap: ModelMap = {
  llama2: { backend: 'openai', model: 'gpt-4' },
  codellama: { backend: 'gemini', model: 'chat-bison@001' },
};

type GenerateRequestHandler = RequestHandler<
  ParamsDictionary,
  any,
  RequestBody,
  ParsedQs
>;

const handleGenerate: GenerateRequestHandler = async (req, res, next) => {
  try {
    const { model, prompt, stream = true, options = {} } = req.body;

    // モデル名マッチング
    const key = Object.keys(modelMap)
      .find(k => model.toLowerCase().startsWith(k));
    const target = key ? modelMap[key]
      : { backend: 'openai', model };  // デフォルトは OpenAI に流す

    const request: GenerateRequest = {
      model: target.model,
      messages: [{ role: 'user', content: prompt }],
      stream,
      options
    };

    const backend = backends[target.backend];
    if (!backend) {
      res.status(400).json({ error: 'Unsupported backend' });
      return;
    }

    const response = await backend.generate(request);
    
    res.status(response.status);
    if (stream) {
      response.data.pipe(res);
    } else {
      res.json(response.data);
    }

  } catch (error: unknown) {
    next(error);
  }
};

type ChatRequestHandler = RequestHandler<
  ParamsDictionary,
  any,
  ChatRequestBody,
  ParsedQs
>;

const handleChat: ChatRequestHandler = async (req, res, next) => {
  try {
    const { model, messages, stream = false, options = {} } = req.body;

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
    next(error);
  }
};

// ルートの定義
app.post('/api/generate', handleGenerate);
app.post('/api/chat', handleChat);

// その他のエンドポイント
app.post('/api/create', (req: Request, res: Response) => {
  res.status(501).json({ error: 'Not implemented' });
});

app.get('/api/models', (req: Request, res: Response) => {
  res.status(501).json({ error: 'Not implemented' });
});

app.post('/api/models/:model', (req: Request, res: Response) => {
  res.status(501).json({ error: 'Not implemented' });
});

app.post('/api/models/:model/copy', (req: Request, res: Response) => {
  res.status(501).json({ error: 'Not implemented' });
});

app.delete('/api/models/:model', (req: Request, res: Response) => {
  res.status(501).json({ error: 'Not implemented' });
});

app.post('/api/pull', (req: Request, res: Response) => {
  res.status(501).json({ error: 'Not implemented' });
});

app.post('/api/push', (req: Request, res: Response) => {
  res.status(501).json({ error: 'Not implemented' });
});

app.post('/api/embeddings', (req: Request, res: Response) => {
  res.status(501).json({ error: 'Not implemented' });
});

app.get('/api/ps', (req: Request, res: Response) => {
  res.status(501).json({ error: 'Not implemented' });
});

app.get('/api/version', (req: Request, res: Response) => {
  res.status(501).json({ error: 'Not implemented' });
});

// エラーハンドリングミドルウェア
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err);
  const error = err as AxiosError;
  const status = error.response?.status || 500;
  const data = error.response?.data || error.message || 'Unknown error';
  res.status(status).json({ error: data });
});

const PORT = process.env.PORT || 11434;
app.listen(PORT, () => {
  console.log(`Ollama プロトコル互換サーバー (stubs) running on port ${PORT}`);
});
