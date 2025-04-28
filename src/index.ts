import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { OpenAIBackend } from './backends/openai';
import { GeminiBackend } from './backends/gemini';
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
  handleModelTags,  // 追加
  handleModelShow   // 追加
} from './handlers/models';

const app = express();
app.use(express.json());

// リクエストのデバッグ用ミドルウェア
app.use((req: Request, res: Response, next: NextFunction) => {
  // undefinedの場合は空オブジェクトとして扱う
  const safeBody = req.body || {};
  console.log('📨 リクエスト受信:', {
    method: req.method,
    path: req.path,
    query: req.query,
    body: JSON.parse(JSON.stringify(safeBody)),
    headers: req.headers
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
      body: JSON.parse(JSON.stringify(safeBody))
    });
    return originalJson.call(this, body);
  };
  next();
});

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
app.post('/api/create', (req: Request, res: Response) => {
  res.status(501).json({ error: 'Not implemented' });
});

// モデル関連のエンドポイント
app.get('/api/models', handleListModels(backends, modelMap));
app.post('/api/models/:model', handleModelOperation(backends, modelMap));
app.post('/api/models/:model/copy', handleModelCopy(backends, modelMap));
app.delete('/api/models/:model', handleModelDelete(backends, modelMap));
app.get('/api/tags', handleModelTags(modelMap));  // 追加
app.post('/api/show', handleModelShow(backends, modelMap));  // 追加

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
