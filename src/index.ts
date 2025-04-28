import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { OpenAIBackend } from './backends/openai';
import { GeminiBackend } from './backends/gemini';
import { LLMBackend } from './backends/base';
import type { Message, ModelMap } from './types';
import { AxiosError } from 'axios';
import { handleGenerate } from './handlers/generate';
import { handleChat } from './handlers/chat';

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

// ルートの定義
app.post('/api/generate', handleGenerate(backends, modelMap));
app.post('/api/chat', handleChat(backends, modelMap));

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
