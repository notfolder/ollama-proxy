import type { RequestHandler } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';
import type { LLMBackend } from '../backends/base';
import type { GenerateRequest, OllamaResponse } from '../types';
import type { ModelMap } from '../types';

export const handleGenerate = (
  backends: Record<string, LLMBackend>,
  modelMap: ModelMap
): RequestHandler<ParamsDictionary, any, GenerateRequest, ParsedQs> => {
  return async (req, res, next) => {
    try {
      const { 
        model, 
        prompt, 
        stream = false,
        system,
        template,
        context,
        format,
        options = {} 
      } = req.body;

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

      const response = await backend.generate({
        model: target.model,
        prompt,
        system,
        template,
        context,
        stream,
        format,
        options: {
          ...options,
          temperature: options.temperature ?? 0.7,
          top_p: options.top_p ?? 1,
          top_k: options.top_k ?? 40,
        }
      });
      
      res.status(response.status || 200);
      if (stream) {
        response.data.pipe(res);
      } else {
        const responseData = response.data || {};
        const ollamaResponse: OllamaResponse = {
          model: target.model,
          created_at: new Date().toISOString(),
          response: responseData.choices?.[0]?.message?.content || 
                   responseData.candidates?.[0]?.content || '',
          done: true,
          total_duration: 0,
          load_duration: 0,
          prompt_eval_count: 0,
          eval_count: 0
        };
        res.json(ollamaResponse);
      }

    } catch (error: unknown) {
      console.error('❌ エラー発生:', error);
      next(error);
    }
  };
};