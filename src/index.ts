import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { OpenAIBackend } from './backends/openai';
import { GeminiBackend } from './backends/gemini';
import { OllamaBackend } from './backends/ollama';
import { LLMBackend } from './backends/base';
import type { Message, ModelMap, OpenAIModelsResponse } from './types';
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

// モデルマッピングを自動的に構築する関数
async function buildModelMap(): Promise<ModelMap> {
  const dynamicModelMap: ModelMap = {};
  
  // 各バックエンドからモデル一覧を取得して処理
  try {
    // OpenAIモデルを取得
    try {
      const openaiRes = await backends.openai.listModels();
      if (openaiRes.status === 200) {
        const models = (openaiRes.data as OpenAIModelsResponse).data;
        for (const model of models) {
          // モデル名をエイリアスとして使用（可能な限り短くする）
          const modelName = model.id;
          const alias = modelName.replace(/^gpt-/, ''); // 例: gpt-4-turbo -> 4-turbo
          dynamicModelMap[alias] = { backend: 'openai', model: modelName };
          
          // サポートされている主要モデルに標準的なエイリアスを追加
          if (modelName.includes('gpt-4')) {
            dynamicModelMap.gpt4 = { backend: 'openai', model: modelName };
          } else if (modelName.includes('gpt-3.5-turbo')) {
            dynamicModelMap.gpt35 = { backend: 'openai', model: modelName };
          }
        }
      }
    } catch (error) {
      console.error('OpenAIモデル取得エラー:', error);
    }
    
    // Geminiモデルを取得
    try {
      const geminiRes = await backends.gemini.listModels();
      if (geminiRes.status === 200) {
        const models = geminiRes.data.models || [];
        for (const model of models) {
          // モデル名をエイリアスとして使用
          const modelName = model.name.split('/').pop() || model.name;
          dynamicModelMap[modelName] = { backend: 'gemini', model: model.name };
          
          // gemini-proとgemini-proなどの基本モデルに短いエイリアスを追加
          if (modelName === 'gemini-pro') {
            dynamicModelMap.gemini = { backend: 'gemini', model: model.name };
          }
        }
      }
    } catch (error) {
      console.error('Geminiモデル取得エラー:', error);
    }
    
    // Ollamaモデルを取得
    try {
      const ollamaRes = await backends.ollama.listModels();
      if (ollamaRes.status === 200) {
        // Ollamaの/api/tagsエンドポイントのレスポンス形式に合わせて取得
        const models = ollamaRes.data.models || [];
        
        if (Array.isArray(models)) {
          for (const model of models) {
            // Ollamaのレスポンスからモデル名を取得
            const modelName = model.name || '';
            if (!modelName) continue;
            
            dynamicModelMap[modelName] = { backend: 'ollama', model: modelName };
            
            // 一般的なモデルには短いエイリアスも追加
            if (modelName.startsWith('llama2')) {
              dynamicModelMap.llama = { backend: 'ollama', model: modelName };
            } else if (modelName.startsWith('mistral')) {
              dynamicModelMap.mistral = { backend: 'ollama', model: modelName };
            } else if (modelName.startsWith('mixtral')) {
              dynamicModelMap.mixtral = { backend: 'ollama', model: modelName };
            }
          }
        } else {
          // 'models'が配列でない場合、レスポンスの形式は異なる可能性がある
          // Ollamaの応答形式を確認してログに出力
          console.log('Ollamaの応答形式:', ollamaRes.data);
          
          // 応答が{models: [{name: '...'}, ...]}ではなく、単に[{name: '...'}, ...]の形式の場合
          const tagsArray = Array.isArray(ollamaRes.data) ? ollamaRes.data : [];
          
          for (const tag of tagsArray) {
            const modelName = tag.name || '';
            if (!modelName) continue;
            
            dynamicModelMap[modelName] = { backend: 'ollama', model: modelName };
            
            // 一般的なモデルには短いエイリアスも追加
            if (modelName.startsWith('llama2')) {
              dynamicModelMap.llama = { backend: 'ollama', model: modelName };
            } else if (modelName.startsWith('mistral')) {
              dynamicModelMap.mistral = { backend: 'ollama', model: modelName };
            } else if (modelName.startsWith('mixtral')) {
              dynamicModelMap.mixtral = { backend: 'ollama', model: modelName };
            }
          }
        }
      }
    } catch (error) {
      console.error('Ollamaモデル取得エラー:', error);
    }
    
    console.log('動的モデルマッピング生成完了:', dynamicModelMap);
    return dynamicModelMap;
  } catch (error) {
    console.error('モデルマッピング構築エラー:', error);
    // エラーが発生した場合はデフォルトのマッピングを返す
    return {
      openai: { backend: 'openai', model: 'gpt-4-turbo' },
      gemini: { backend: 'gemini', model: 'gemini-pro' },
      llama2: { backend: 'ollama', model: 'llama2' },
      mistral: { backend: 'ollama', model: 'mistral' },
      mixtral: { backend: 'ollama', model: 'mixtral' }
    };
  }
}

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

// 起動時にモデルマップを自動的に構築する
(async () => {
  console.log('各バックエンドからモデル情報を取得中...');
  try {
    const dynamicModelMap = await buildModelMap();
    // 既存のモデルマップをクリアして動的に生成したマッピングで上書き
    Object.keys(modelMap).forEach(key => delete modelMap[key]);
    Object.assign(modelMap, dynamicModelMap);
    console.log('モデルマッピングを自動的に構築しました:', modelMap);
  } catch (error) {
    console.error('モデルマッピングの自動構築に失敗しました:', error);
    console.log('デフォルトのモデルマッピングを使用します:', modelMap);
  }
  
  // サーバーを起動
  app.listen(PORT, () => {
    console.log(`Ollama プロトコル互換サーバー running on port ${PORT}`);
  });
})();
