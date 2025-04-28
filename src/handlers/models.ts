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
      // 現在利用可能なモデルの一覧を返す
      const models = Object.entries(modelMap).map(([key, mapping]) => ({
        name: key,
        ...mapping
      }));
      
      res.json({ models });
    } catch (error) {
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
      // モデル名マッチング
      const key = Object.keys(modelMap)
        .find(k => model.toLowerCase().startsWith(k));
      
      if (!key) {
        res.status(404).json({ error: 'Model not found' });
        return;
      }
      
      const modelInfo = modelMap[key];
      res.json({
        name: key,
        ...modelInfo
      });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};

export const handleModelCopy = (
  backends: Record<string, LLMBackend>,
  modelMap: ModelMap
): RequestHandler<ModelParams, any, any, ParsedQs> => {
  return async (req, res) => {
    res.status(501).json({ error: 'Not implemented' });
  };
};

export const handleModelDelete = (
  backends: Record<string, LLMBackend>,
  modelMap: ModelMap
): RequestHandler<ModelParams, any, any, ParsedQs> => {
  return async (req, res) => {
    res.status(501).json({ error: 'Not implemented' });
  };
};