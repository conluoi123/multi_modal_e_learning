import { apiClient } from './client';

export interface QuizRequest {
  topic: string;
  n_questions?: number;
  difficulty?: 'basic' | 'standard' | 'advanced';
  doc_id?: string | null;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}

export interface QuizResponse {
  questions: QuizQuestion[];
  citations: string[];
}

export const quizService = {
  generateQuiz: async (request: QuizRequest): Promise<QuizResponse> => {
    const response = await apiClient.post<QuizResponse>('/quiz/generate', request);
    return response.data;
  },
};
