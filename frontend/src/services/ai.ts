// src/services/ai.ts
import api from './api'; // 1. 引入封装好的 api 实例，而不是原生 axios

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  // _system:string
}

export const sendChatMessage = async (messages: ChatMessage[]) => {
  // 2. 使用 api.post
  // api.ts 的 baseURL 是 '/api'
  // ai.py 的路由是 prefix='/ai' + '/chat'
  // 最终请求 URL 会自动拼接为: /api/ai/chat
  const response = await api.post('/ai/chat', { messages }, {
    timeout: 60000
  });
  return response.data;
};
