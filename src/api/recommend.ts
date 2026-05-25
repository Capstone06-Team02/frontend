import { apiClient } from './client';
import type { RecommendResponse } from '../types/recommend';

const DEFAULT_STORE_ID = Number(import.meta.env.VITE_STORE_ID ?? 1);

export const requestRecommendations = async (
  text: string,
  storeId = DEFAULT_STORE_ID,
): Promise<RecommendResponse> => {
  const response = await apiClient.post<RecommendResponse>('/api/recommend', {
    text,
    storeId,
  });

  return {
    recommendations: response.data.recommendations ?? [],
    ttsText: response.data.ttsText,
  };
};
