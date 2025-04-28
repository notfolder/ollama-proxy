export interface Message {
  role: string;
  content: string;
}

export interface GenerateRequest {
  model: string;
  messages: Message[];
  stream: boolean;
  options?: Record<string, any>;
}

export interface ChatResponse {
  model: string;
  created_at: string;
  message: Message;
  done: boolean;
}

export interface BackendResponse {
  status: number;
  data: any;
}