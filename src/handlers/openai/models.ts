// filepath: /Users/notfolder/Documents/ollama-proxy/src/handlers/openai/models.ts
import type { RequestHandler } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';
import type { LLMBackend } from '../../backends/base';
import type { 
  OpenAIModelsResponse,
  OpenAIModel,
  ModelMap 
} from '../../types';

export const handleOpenAIModels = (
  backends: Record<string, LLMBackend>,
  modelMap: ModelMap
): RequestHandler<ParamsDictionary, any, any, ParsedQs> => {
  return async (req, res) => {
    try {
      // モデルマップからOpenAI互換形式のモデル情報を作成
      const models: OpenAIModel[] = Object.entries(modelMap).map(([key, mapping]) => ({
        id: key,
        object: 'model',
        created: Math.floor(Date.now() / 1000),
        owned_by: 'organization-owner',
        permission: [],
        root: key,
        parent: null
      }));

      // OpenAI互換フォーマットで返す
      const response: OpenAIModelsResponse = {
        object: 'list',
        data: models
      };
      
      res.json(response);
    } catch (error) {
      console.error('❌ モデル一覧取得エラー:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};