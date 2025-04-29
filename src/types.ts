export interface Message {
  role: string;
  content: string;
  images?: string[];
}

export interface OllamaResponse {
  model: string;
  created_at: string;
  response?: string;       // generate用
  message?: Message;       // chat用
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
  context?: number[];
}

export interface GenerateRequest {
  model: string;
  prompt: string;
  system?: string;
  template?: string;
  context?: number[];
  stream?: boolean;
  raw?: boolean;
  format?: {
    type: string;
    properties?: Record<string, any>;
    required?: string[];
  };
  options?: {
    num_predict?: number;
    top_k?: number;
    top_p?: number;
    temperature?: number;
    presence_penalty?: number;
    frequency_penalty?: number;
    repeat_penalty?: number;
    seed?: number;
    stop?: string[];
    mirostat?: number;
    mirostat_eta?: number;
    mirostat_tau?: number;
    num_ctx?: number;
    num_gqa?: number;
    num_gpu?: number;
    num_thread?: number;
  };
}

export interface ChatRequest {
  model: string;
  messages: Message[];
  stream?: boolean;
  format?: {
    type: string;
    properties?: Record<string, any>;
    required?: string[];
  };
  options?: {
    num_predict?: number;
    top_k?: number;
    top_p?: number;
    temperature?: number;
    presence_penalty?: number;
    frequency_penalty?: number;
    repeat_penalty?: number;
    seed?: number;
    stop?: string[];
    num_ctx?: number;
    num_gqa?: number;
    num_gpu?: number;
    num_thread?: number;
  };
}

export interface ModelInfo {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    format: string;
    family: string;
    families?: string[];
    parameter_size: string;
    quantization_level: string;
  };
  modelfile?: string;
  template?: string;
  license?: string;
  system?: string;
}

export interface ModelMap {
  [key: string]: {
    backend: 'openai' | 'gemini' | 'ollama';
    model: string;
  };
}

export interface BackendResponse<T = any> {
  status: number;
  data: T;
}

// OpenAI互換レスポンス型
export interface OpenAICompletionChoice {
  text: string;
  index: number;
  logprobs: null;
  finish_reason: string;
}

export interface OpenAICompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: OpenAICompletionChoice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface OpenAIChatChoice {
  index: number;
  message: Message;
  finish_reason: string;
}

export interface OpenAIChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: OpenAIChatChoice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface OpenAIChatStreamChoice {
  delta: Partial<Message>;
  index: number;
  finish_reason: string | null;
}

export interface OpenAIChatStreamResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: OpenAIChatStreamChoice[];
}

export interface OpenAIModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
  permission: any[];
  root: string;
  parent: null;
}

export interface OpenAIModelsResponse {
  object: string;
  data: OpenAIModel[];
}