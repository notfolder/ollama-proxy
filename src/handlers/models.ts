import type { RequestHandler } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';
import type { LLMBackend } from '../backends/base';
import type { ModelInfo, ModelMap } from '../types';

export const handleListModels = (
  backends: Record<string, LLMBackend>,
  modelMap: ModelMap
): RequestHandler<ParamsDictionary, any, any, ParsedQs> => {
  return async (req, res) => {
    try {
      console.log('📋 モデル一覧取得開始');
      
      // 利用可能なモデルの一覧をOllama形式で返す
      const models = Object.entries(modelMap).map(([key, mapping]): ModelInfo => ({
        name: key,
        modified_at: new Date().toISOString(),
        size: 0,
        digest: '',
        details: {
          format: 'unknown',
          family: mapping.backend,
          parameter_size: 'unknown',
          quantization_level: 'unknown'
        }
      }));
      
      console.log('✅ モデル一覧取得完了:', { modelCount: models.length });
      res.json({ models });
    } catch (error) {
      console.error('❌ モデル一覧取得エラー:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};

interface ModelParams extends ParamsDictionary {
  model: string;
}

export const handleModelOperation = (
  backends: Record<string, LLMBackend>,
  modelMap: ModelMap
): RequestHandler<ModelParams, any, any, ParsedQs> => {
  return async (req, res) => {
    const { model } = req.params;
    
    try {
      console.log('🔍 モデル情報取得:', { requestedModel: model });
      
      // モデル名マッチング
      const key = Object.keys(modelMap)
        .find(k => model.toLowerCase().startsWith(k));
      
      if (!key) {
        console.log('⚠️ モデルが見つかりません:', { requestedModel: model });
        res.status(404).json({ error: 'Model not found' });
        return;
      }
      
      const modelInfo = modelMap[key];

      // Ollama形式のレスポンス
      const response: ModelInfo = {
        name: key,
        modified_at: new Date().toISOString(),
        size: 0,
        digest: '',
        details: {
          format: 'unknown',
          family: modelInfo.backend,
          parameter_size: 'unknown',
          quantization_level: 'unknown'
        }
      };

      console.log('✅ モデル情報取得完了:', {
        name: key,
        backend: modelInfo.backend,
        model: modelInfo.model
      });
      
      res.json(response);
    } catch (error) {
      console.error('❌ モデル情報取得エラー:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};

export const handleModelCopy = (
  backends: Record<string, LLMBackend>,
  modelMap: ModelMap
): RequestHandler<ModelParams, any, any, ParsedQs> => {
  return async (req, res) => {
    const { model } = req.params;
    console.log('⚠️ モデルコピー未実装:', { requestedModel: model });
    res.status(501).json({ error: 'Not implemented' });
  };
};

export const handleModelDelete = (
  backends: Record<string, LLMBackend>,
  modelMap: ModelMap
): RequestHandler<ModelParams, any, any, ParsedQs> => {
  return async (req, res) => {
    const { model } = req.params;
    console.log('⚠️ モデル削除未実装:', { requestedModel: model });
    res.status(501).json({ error: 'Not implemented' });
  };
};

interface ShowModelRequestBody {
  name: string;
  system?: boolean;
}

export const handleModelShow = (
  backends: Record<string, LLMBackend>,
  modelMap: ModelMap
): RequestHandler<ParamsDictionary, any, ShowModelRequestBody, ParsedQs> => {
  return async (req, res) => {
    const { name, system = false } = req.body;
    
    try {
      console.log('🔍 モデル詳細情報取得:', { 
        requestedModel: name,
        system
      });
      
      // モデル名マッチング
      const key = Object.keys(modelMap)
        .find(k => name.toLowerCase().startsWith(k));
      
      if (!key) {
        console.log('⚠️ モデルが見つかりません:', { requestedModel: name });
        res.status(404).json({ error: 'Model not found' });
        return;
      }
      
      const modelInfo = modelMap[key];

      // Ollama形式のレスポンス
      const response: ModelInfo = {
        name: key,
        modified_at: new Date().toISOString(),
        size: 0,
        digest: '',
        details: {
          format: 'unknown',
          family: modelInfo.backend,
          parameter_size: 'unknown',
          quantization_level: 'unknown'
        }
      };

      console.log('✅ モデル詳細情報取得完了:', {
        name: key,
        modelType: modelInfo.backend
      });
      
      res.json(response);
    } catch (error) {
      console.error('❌ モデル詳細情報取得エラー:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};

export const handleModelTags = (
  modelMap: ModelMap
): RequestHandler<ParamsDictionary, any, any, ParsedQs> => {
  return async (req, res) => {
    try {
      console.log('🏷️ モデルタグ一覧取得開始');
      
      // モデルとタグの一覧を作成
      const models = Object.entries(modelMap).map(([modelName, info]): ModelInfo => ({
        name: modelName,
        modified_at: new Date().toISOString(),
        size: 0,
        digest: '',
        details: {
          format: 'unknown',
          family: info.backend,
          parameter_size: 'unknown',
          quantization_level: 'unknown'
        }
      }));
      
      console.log('✅ モデルタグ一覧取得完了:', { 
        modelCount: models.length,
        models: models
      });

      // Ollama形式のレスポンス
      res.json({ models });
    } catch (error) {
      console.error('❌ モデルタグ一覧取得エラー:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};