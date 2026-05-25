export type CafeMenuId = 'cream-latte' | 'matcha-latte' | 'iced-americano' | 'cafe-latte';

export type CafeOptionState = {
  temperature: '아이스' | '핫';
  size: '보통 사이즈' | '큰 사이즈';
  ice: '적게' | '보통';
  sweetness: '보통 당도' | '덜 달게';
  shot: '기본' | '샷 추가';
  cupType: '일회용 컵' | '개인 컵';
};

export const FIRST_RECOMMENDED_MENUS = [
  { id: 'cream-latte' as CafeMenuId, name: '슈크림 라떼' },
  { id: 'matcha-latte' as CafeMenuId, name: '말차 라떼' },
];

export const SECOND_RECOMMENDED_MENUS = [
  { id: 'cafe-latte' as CafeMenuId, name: '카페 라떼' },
  { id: 'iced-americano' as CafeMenuId, name: '아이스 아메리카노' },
];

export const ALL_MENUS = [...FIRST_RECOMMENDED_MENUS, ...SECOND_RECOMMENDED_MENUS];

/** @deprecated ALL_MENUS 사용 권장 */
export const RECOMMENDED_MENUS = ALL_MENUS;

export const DEFAULT_CAFE_OPTIONS: CafeOptionState = {
  temperature: '아이스',
  size: '보통 사이즈',
  ice: '보통',
  sweetness: '보통 당도',
  shot: '기본',
  cupType: '일회용 컵',
};

export const getCafeMenuName = (menuId: string | null): string =>
  ALL_MENUS.find((m) => m.id === menuId)?.name ?? '슈크림 라떼';

export const getCafeMenuIdByText = (text: string): CafeMenuId | null => {
  if (text.includes('슈크림')) return 'cream-latte';
  if (text.includes('말차')) return 'matcha-latte';
  if (text.includes('아메리카노') || text.includes('아아')) return 'iced-americano';
  if (
    text.includes('카페라떼') ||
    text.includes('카페 라떼') ||
    (text.includes('라떼') && !text.includes('말차') && !text.includes('슈크림'))
  )
    return 'cafe-latte';
  return null;
};
