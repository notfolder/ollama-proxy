import axios from 'axios';
import { LLMBackend } from './base';
import { GenerateRequest, BackendResponse, Message } from '../types';

export class GeminiBackend extends LLMBackend {
  private readonly projectId: string;
  private readonly location: string;
  private readonly accessToken: string;

  constructor(projectId: string, location: string, accessToken: string) {
    super();
    this.projectId = projectId;
    this.location = location;
    this.accessToken = accessToken;
  }

  async generate(request: GenerateRequest): Promise<BackendResponse> {
    const endpoint = 
      `https://us-central1-aiplatform.googleapis.com/v1/` +
      `projects/${this.projectId}/` +
      `locations/${this.location}/` +
      `publishers/google/models/${request.model}:generateMessage`;

    const response = await axios({
      url: endpoint,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        prompt: { messages: request.messages },
        temperature: request.options?.temperature ?? 0.7,
      },
      responseType: request.stream ? 'stream' : 'json'
    });

    return {
      status: response.status,
      data: response.data
    };
  }

  async chat(messages: Message[], options: Record<string, any> = {}): Promise<BackendResponse> {
    const endpoint = 
      `https://us-central1-aiplatform.googleapis.com/v1/` +
      `projects/${this.projectId}/` +
      `locations/${this.location}/` +
      `publishers/google/models/${options.model || 'chat-bison@001'}:generateMessage`;

    const response = await axios({
      url: endpoint,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        prompt: { messages },
        temperature: options.temperature ?? 0.7,
        ...options
      },
      responseType: options.stream ? 'stream' : 'json'
    });

    return {
      status: response.status,
      data: response.data
    };
  }
}