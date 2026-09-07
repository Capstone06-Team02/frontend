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
  CartConfirmResponse,
  CartMenusResponse,
  RequiredOptionSummaryResponse,
  SignatureMenusResponse,
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

/**
 * 매장의 시그니처 메뉴 목록. 사전에 지정된 값을 그대로 내려주므로 빠르고
 * 결과가 매번 같다. 예전에는 추천 API(LLM)에 문장을 보내 받아왔는데
 * 응답이 6초 걸리고 간헐적으로 빈 결과가 왔다.
 */
export const fetchSignatureMenus = async (
  restaurantId = DEFAULT_RESTAURANT_ID,
): Promise<SignatureMenusResponse> => {
  const response = await apiClient.get<SignatureMenusResponse>(
    `/api/order/stores/${restaurantId}/menus/signatures`,
  );
  return response.data;
};

export const sendOrderText = async (
  text: string,
  sessionId: string | null,
  restaurantId = DEFAULT_RESTAURANT_ID,
  cartId: string | null = null,
): Promise<OrderApiResponse> => {
  const payload: {
    input: string;
    restaurantId: number;
    sessionId?: string;
    cartId?: string;
  } = {
    input: text,
    restaurantId,
  };

  if (sessionId) {
    payload.sessionId = sessionId;
  }

  // cartId를 함께 보내면 지금 담고 있는 주문에 이어서 붙는다.
  // sessionId 없이 cartId만 보내면 같은 장바구니에 새 메뉴를 시작한다.
  if (cartId) {
    payload.cartId = cartId;
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

/** 장바구니에 담긴 메뉴 목록 */
export const fetchCartMenus = async (cartId: string): Promise<CartMenusResponse> => {
  const response = await apiClient.get<CartMenusResponse>(`/api/order/carts/${cartId}/menus`);
  return response.data;
};

/** 장바구니 전체를 최종 주문으로 확정한다. */
export const confirmCart = async (cartId: string): Promise<CartConfirmResponse> => {
  const response = await apiClient.post<CartConfirmResponse>(`/api/order/carts/${cartId}/confirm`);
  return response.data;
};

/** 장바구니에서 메뉴 하나를 뺀다. */
export const removeCartSession = async (cartId: string, sessionId: string): Promise<void> => {
  await apiClient.delete(`/api/order/carts/${cartId}/sessions/${sessionId}`);
};
