import { apiClient } from './client';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  citations?: string[];
}

export interface ChatRequest {
  question: string;
  conversation_id?: string | null;
  doc_id?: string | null;
}

export interface ChatResponse {
  conversation_id: string;
  answer: string;
  citations: string[];
  history: ChatMessage[];
}

export interface VoiceChatResponse {
  transcribed_text: string;
  conversation_id: string;
  answer: string;
  citations: string[];
  history: ChatMessage[];
}

export interface ChatHistoryResponse {
  conversation_id: string;
  history: ChatMessage[];
  message_count: number;
}

export interface ConversationInfo {
  conversation_id: string;
  title: string;
  updated_at: string;
}

export const chatService = {
  sendMessage: async (request: ChatRequest): Promise<ChatResponse> => {
    const response = await apiClient.post<ChatResponse>('/chat', request);
    return response.data;
  },

  sendVoice: async (file: File, conversationId?: string, docId?: string): Promise<VoiceChatResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    if (conversationId) formData.append('conversation_id', conversationId);
    if (docId) formData.append('doc_id', docId);

    const response = await apiClient.post<VoiceChatResponse>('/chat/voice', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getHistory: async (conversationId: string): Promise<ChatHistoryResponse> => {
    const response = await apiClient.get<ChatHistoryResponse>(`/chat/${conversationId}/history`);
    return response.data;
  },

  getConversations: async (): Promise<ConversationInfo[]> => {
    const response = await apiClient.get<ConversationInfo[]>('/chat/conversations');
    return response.data;
  },

  clearHistory: async (conversationId: string): Promise<void> => {
    await apiClient.delete(`/chat/${conversationId}`);
  },

  streamMessage: async (
    request: ChatRequest,
    onChunk: (text: string) => void,
    onEnd: (citations: string[], conversationId: string) => void,
    onError: (err: any) => void
  ): Promise<void> => {
    try {
      const response = await fetch('/api/v1/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');

      if (!reader) {
        throw new Error('No readable stream available');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        // The chunk might contain multiple "data: {...}\n\n" lines
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '').trim();
            if (!dataStr) continue;
            
            try {
              const data = JSON.parse(dataStr);
              if (data.type === 'chunk') {
                onChunk(data.content);
              } else if (data.type === 'end') {
                onEnd(data.citations || [], data.conversation_id);
              }
            } catch (e) {
              console.error("Error parsing stream chunk:", e, dataStr);
            }
          }
        }
      }
    } catch (err) {
      onError(err);
    }
  },
};
