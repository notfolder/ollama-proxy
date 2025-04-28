import type { RequestHandler } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';
import type { LLMBackend } from '../backends/base';
import type { ModelMap } from '../types';

export const handleListModels = (
  backends: Record<string, LLMBackend>,
  modelMap: ModelMap
): RequestHandler<ParamsDictionary, any, any, ParsedQs> => {
  return async (req, res) => {
    try {
      console.log('📋 モデル一覧取得開始');
      
      // 現在利用可能なモデルの一覧を返す
      const models = Object.entries(modelMap).map(([key, mapping]) => ({
        name: key,
        ...mapping
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
      console.log('✅ モデル情報取得完了:', {
        name: key,
        backend: modelInfo.backend,
        model: modelInfo.model
      });
      
      res.json({
        name: key,
        ...modelInfo
      });
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

export const handleModelTags = (
  modelMap: ModelMap
): RequestHandler<ParamsDictionary, any, any, ParsedQs> => {
  return async (req, res) => {
    try {
      console.log('🏷️ モデルタグ一覧取得開始');
      
      // 現在は利用可能なモデル名をタグとして返す
      const tags = Object.keys(modelMap).map(key => ({
        name: key,
        tag: 'latest'  // 現在は全てlatestタグとする
      }));
      
      console.log('✅ モデルタグ一覧取得完了:', { tagCount: tags.length });
      res.json({ tags });
    } catch (error) {
      console.error('❌ モデルタグ一覧取得エラー:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
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
      
      // モデルの詳細情報を返す
      // 現在は基本的な情報のみ
      const details = {
        name: key,
        model_type: modelInfo.backend,
        backend_model: modelInfo.model,
        modified_at: new Date().toISOString(),
        size: 0,  // 現在は0固定
        digest: '',  // 現在は空文字固定
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
      
      res.json(details);
    } catch (error) {
      console.error('❌ モデル詳細情報取得エラー:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};