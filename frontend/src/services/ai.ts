// src/services/ai.ts
import api from './api'; // 1. 引入封装好的 api 实例，而不是原生 axios

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  // _system:string
}

export interface AIDiaryResponse {
  title: string;
  dateStart: string;
  dateEnd: string;
  location: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  transportation: string;
  content: string;
}

export const sendChatMessage = async (messages: ChatMessage[]) => {
  const response = await api.post('/ai/chat', { messages }, {
    timeout: 60000
  });
  return response.data;
};

export const generateDiaryDraft  = async (prompt: string):Promise<AIDiaryResponse> => {
  const response = await api.post('/ai/generate-diary', { prompt }, {
    timeout: 60000
  });
  return response.data;
};
