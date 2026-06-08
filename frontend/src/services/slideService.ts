import { apiClient } from './client';

export interface SlideRequest {
  topic: string;
  doc_id?: string | null;
  n_slides?: number;
  grade_level?: string;
  difficulty?: string;
  language?: string;
  include_speaker_notes?: boolean;
  template_name?: string;
}

export interface SlideGenerateResponse {
  status: string;
  filename: string;
  file_path: string;
  download_url: string;
  slide_count: number;
  citations: any[];
}

export const slideService = {
  generateSlides: async (request: SlideRequest): Promise<SlideGenerateResponse> => {
    const response = await apiClient.post<SlideGenerateResponse>('/slides/generate', request);
    return response.data;
  },

  getDownloadUrl: (filename: string): string => {
    return `${apiClient.defaults.baseURL}/slides/download/${filename}`;
  }
};
