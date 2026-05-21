export type CafeMenuId = 'cream-latte' | 'matcha-latte';

export type CafeOptionState = {
  temperature: '아이스' | '핫';
  ice: '적게' | '보통';
  size: '보통 사이즈' | '큰 사이즈';
};

export const RECOMMENDED_MENUS = [
  {
    id: 'cream-latte' as const,
    name: '슈크림 라떼',
    description: '부드러운 슈크림과 진한 라떼가 어울리는 추천 메뉴입니다.',
  },
  {
    id: 'matcha-latte' as const,
    name: '말차 라떼',
    description: '쌉싸름한 말차와 우유가 어울리는 추천 메뉴입니다.',
  },
];

export const DEFAULT_CAFE_OPTIONS: CafeOptionState = {
  temperature: '아이스',
  ice: '보통',
  size: '보통 사이즈',
};

export const getCafeMenuName = (menuId: string | null) =>
  RECOMMENDED_MENUS.find((menu) => menu.id === menuId)?.name || '슈크림 라떼';

export const getCafeMenuIdByText = (text: string): CafeMenuId | null => {
  if (text.includes('슈크림')) return 'cream-latte';
  if (text.includes('말차')) return 'matcha-latte';
  return null;
};
