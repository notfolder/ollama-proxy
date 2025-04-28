import type { RequestHandler } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';
import type { LLMBackend } from '../backends/base';
import type { GenerateRequest } from '../types';
import type { ModelMap } from '../types';

interface RequestBody {
  model: string;
  prompt: string;
  stream?: boolean;
  options?: Record<string, any>;
}

export const handleGenerate = (
  backends: Record<string, LLMBackend>,
  modelMap: ModelMap
): RequestHandler<ParamsDictionary, any, RequestBody, ParsedQs> => {
  return async (req, res, next) => {
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
};