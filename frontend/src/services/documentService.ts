import { apiClient } from './client';

export interface DocumentInfo {
  doc_id: string;
  filename: string;
  chunk_count: number;
}

export interface DocumentsResponse {
  documents: DocumentInfo[];
}

export interface IngestResponse {
  status: string;
  doc_id: string;
  filename: string;
  total_pages: number;
  total_chunks_saved: number;
  duplicate: boolean;
}

export interface DocumentDeleteResponse {
  status: string;
  doc_id: string;
  deleted_chunks: number;
  deleted_files: string[];
}

export const documentService = {
  getDocuments: async (): Promise<DocumentsResponse> => {
    const response = await apiClient.get<DocumentsResponse>('/documents');
    return response.data;
  },

  uploadDocument: async (file: File): Promise<IngestResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiClient.post<IngestResponse>('/ingest', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  deleteDocument: async (docId: string): Promise<DocumentDeleteResponse> => {
    const response = await apiClient.delete<DocumentDeleteResponse>(`/documents/${docId}`);
    return response.data;
  },
};
