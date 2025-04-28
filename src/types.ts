export interface Message {
  role: string;
  content: string;
}

export interface GenerateRequest {
  model: string;
  messages: Message[];
  stream?: boolean;
  options?: Record<string, any>;
}

export interface ChatResponse {
  model: string;
  created_at: string;
  message: Message;
  done: boolean;
}

export interface ModelMapping {
  backend: 'openai' | 'gemini';
  model: string;
}

export interface ModelMap {
  [key: string]: ModelMapping;
}

export interface BackendResponse<T = any> {
  status: number;
  data: T;
}