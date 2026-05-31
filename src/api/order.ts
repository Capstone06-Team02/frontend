import { apiClient } from './client';
import type {
  HintRecommendResponse,
  MenuCacheResponse,
  MenuOptionalOptionsResponse,
  OrderApiResponse,
  OrderOptionSelectionRequest,
  OrderOptionSelectionResponse,
  RecommendApiResponse,
  RecommendHintListResponse,
  RequiredOptionSummaryResponse,
} from '../types/order';

const DEFAULT_RESTAURANT_ID = Number(
  import.meta.env.VITE_RESTAURANT_ID ?? import.meta.env.VITE_STORE_ID ?? 1,
);

export const getDefaultRestaurantId = () => DEFAULT_RESTAURANT_ID;

export const cacheRestaurantMenus = async (
  restaurantId = DEFAULT_RESTAURANT_ID,
): Promise<MenuCacheResponse> => {
  const response = await apiClient.post<MenuCacheResponse>(
    `/api/order/restaurants/${restaurantId}/menus/cache`,
  );
  return response.data;
};

export const sendOrderText = async (
  text: string,
  sessionId: string | null,
  restaurantId = DEFAULT_RESTAURANT_ID,
): Promise<OrderApiResponse> => {
  const payload: { input: string; restaurantId: number; sessionId?: string } = {
    input: text,
    restaurantId,
  };

  if (sessionId) {
    payload.sessionId = sessionId;
  }

  const response = await apiClient.post<OrderApiResponse>('/api/order/speak', payload);
  return response.data;
};

export const fetchRecommendations = async (
  text: string,
  storeId = DEFAULT_RESTAURANT_ID,
): Promise<RecommendApiResponse> => {
  const response = await apiClient.post<RecommendApiResponse>('/api/recommend', {
    text,
    storeId,
  });
  return response.data;
};

export const fetchRecommendHints = async (
  storeId = DEFAULT_RESTAURANT_ID,
): Promise<RecommendHintListResponse> => {
  const response = await apiClient.get<RecommendHintListResponse>('/api/recommend/hints', {
    params: { storeId },
  });
  return response.data;
};

export const fetchRecommendationsByHint = async (
  hintId: number,
): Promise<HintRecommendResponse> => {
  const response = await apiClient.post<HintRecommendResponse>(`/api/recommend/hints/${hintId}`);
  return response.data;
};

export const fetchRequiredOptionSummary = async (
  sessionId: string,
  menuId: number,
): Promise<RequiredOptionSummaryResponse> => {
  const response = await apiClient.post<RequiredOptionSummaryResponse>(
    '/api/order/required-option-summary',
    { sessionId, menuId },
  );
  return response.data;
};

export const fetchMenuOptionalOptions = async (
  menuId: number,
): Promise<MenuOptionalOptionsResponse> => {
  const response = await apiClient.get<MenuOptionalOptionsResponse>(
    `/api/order/menus/${menuId}/optional-options`,
  );
  return response.data;
};

export const selectOrderOption = async (
  payload: OrderOptionSelectionRequest,
): Promise<OrderOptionSelectionResponse> => {
  const response = await apiClient.post<OrderOptionSelectionResponse>(
    '/api/order/option-selection',
    payload,
  );
  return response.data;
};
