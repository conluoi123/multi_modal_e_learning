import { apiClient } from './client';

export interface UserSettings {
  display_name: string;
  avatar_seed: string;
  role_label: string;
  api_base_url: string;
  default_document_scope: 'all' | 'latest';
  default_slide_theme: 'academic' | 'corporate' | 'minimal';
  default_quiz_difficulty: 'basic' | 'standard' | 'advanced';
  default_quiz_count: number;
  save_chat_history: boolean;
  auto_select_latest_document: boolean;
}

export const settingsService = {
  getSettings: async (): Promise<UserSettings> => {
    const response = await apiClient.get<UserSettings>('/settings');
    return response.data;
  },

  updateSettings: async (settings: UserSettings): Promise<UserSettings> => {
    const response = await apiClient.put<UserSettings>('/settings', settings);
    return response.data;
  },
};
