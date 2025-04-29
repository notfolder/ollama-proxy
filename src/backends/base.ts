import { GenerateRequest, BackendResponse, Message } from '../types';

export abstract class LLMBackend {
  abstract generate(request: GenerateRequest): Promise<BackendResponse>;
  abstract chat(messages: Message[], options?: Record<string, any>): Promise<BackendResponse>;
  abstract listModels(): Promise<BackendResponse>;
}