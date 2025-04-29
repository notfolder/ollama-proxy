import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { OpenAIBackend } from './backends/openai';
import { GeminiBackend } from './backends/gemini';
import { OllamaBackend } from './backends/ollama';
import { LLMBackend } from './backends/base';
import type { Message, ModelMap } from './types';
import { AxiosError } from 'axios';
import { handleGenerate } from './handlers/generate';
import { handleChat } from './handlers/chat';
import { 
  handleListModels, 
  handleModelOperation, 
  handleModelCopy, 
  handleModelDelete,
  handleModelTags,
  handleModelShow
} from './handlers/models';
// OpenAI互換ハンドラーをインポート
import { handleOpenAIChat } from './handlers/openai/chat';
import { handleOpenAICompletions } from './handlers/openai/completions';
import { handleOpenAIModels } from './handlers/openai/models';

const app = express();
app.use(express.json());

// リクエストのデバッグ用ミドルウェア
app.use((req: Request, res: Response, next: NextFunction) => {
  // undefinedの場合は空オブジェクトとして扱う
  const safeBody = req.body || {};
  console.log('📨 リクエスト受信:', {
    method: req.method,
    path: req.path,
    // query: req.query,
    // body: JSON.parse(JSON.stringify(safeBody))
  });
  next();
});

// レスポンスのデバッグ用ミドルウェア
app.use((req: Request, res: Response, next: NextFunction) => {
  const originalJson = res.json;
  res.json = function(body) {
    // undefinedの場合は空オブジェクトとして扱う
    const safeBody = body || {};
    console.log('📤 レスポンス送信:', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      // body: JSON.parse(JSON.stringify(safeBody))
    });
    return originalJson.call(this, body);
  };
  next();
});

// ── バックエンドインスタンスを初期化 ──
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
const GEMINI_BASE_URL = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta';
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

// ── バックエンドインスタンスを初期化 ──
const backends: Record<string, LLMBackend> = {
  openai: new OpenAIBackend(process.env.OPENAI_API_KEY || '', OPENAI_BASE_URL),
  gemini: new GeminiBackend(process.env.GCP_ACCESS_TOKEN || '', GEMINI_BASE_URL),
  ollama: new OllamaBackend(OLLAMA_BASE_URL)
};

// ── モデル名からバックエンド & 実際のモデル名へのマッピング ──
const modelMap: ModelMap = {
  openai: { backend: 'openai', model: 'gpt-4.1-mini' },
  gemini: { backend: 'gemini', model: 'gemini-pro' },
  llama2: { backend: 'ollama', model: 'llama2' },
  mistral: { backend: 'ollama', model: 'mistral' },
  mixtral: { backend: 'ollama', model: 'mixtral' },
};

// OpenAI互換エンドポイント
app.post('/v1/chat/completions', handleOpenAIChat(backends, modelMap));
app.post('/v1/completions', handleOpenAICompletions(backends, modelMap));
app.get('/v1/models', handleOpenAIModels(backends, modelMap));

// Ollamaオリジナルエンドポイント
app.post('/api/generate', handleGenerate(backends, modelMap));
app.post('/api/chat', handleChat(backends, modelMap));
app.post('/api/create', (req: Request, res: Response) => {
  res.status(501).json({ error: 'Not implemented' });
});

// モデル関連のエンドポイント
app.get('/api/models', handleListModels(backends, modelMap));
app.post('/api/models/:model', handleModelOperation(backends, modelMap));
app.post('/api/models/:model/copy', handleModelCopy(backends, modelMap));
app.delete('/api/models/:model', handleModelDelete(backends, modelMap));
app.get('/api/tags', handleModelTags(modelMap));
app.post('/api/show', handleModelShow(backends, modelMap));

// その他のエンドポイント
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

// // エラーハンドリングミドルウェア
// app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
//   console.error(err);
//   const error = err as AxiosError;
//   const status = error.response?.status || 500;
//   const data = error.response?.data || error.message || 'Unknown error';
//   res.status(status).json({ error: data });
// });

const PORT = process.env.PORT || 11434;
app.listen(PORT, () => {
  console.log(`Ollama プロトコル互換サーバー (stubs) running on port ${PORT}`);
});
