import type { CartItem, OptionItem } from '../types/menu';

export const OPTION_ITEMS: OptionItem[] = [
  {
    id: 'rice-small',
    group: '밥 양',
    label: '밥 적게',
    description: '밥 양을 적게 선택합니다.',
  },
  {
    id: 'rice-normal',
    group: '밥 양',
    label: '밥 보통',
    description: '밥 양을 보통으로 선택합니다.',
  },
  {
    id: 'rice-large',
    group: '밥 양',
    label: '밥 많이',
    description: '밥 양을 많이 선택합니다.',
  },
  {
    id: 'spice-mild',
    group: '맵기',
    label: '순한맛',
    description: '맵지 않게 조리합니다.',
  },
  {
    id: 'spice-normal',
    group: '맵기',
    label: '보통맛',
    description: '기본 맵기로 조리합니다.',
  },
  {
    id: 'spice-hot',
    group: '맵기',
    label: '매운맛',
    description: '맵게 조리합니다.',
  },
];

export const INITIAL_CART_ITEMS: CartItem[] = [
  {
    id: 'regular-menu',
    name: '일반 메뉴',
    optionSummary: '밥 보통, 보통맛',
    quantity: 1,
    price: 8000,
  },
  {
    id: 'special-menu',
    name: '특식 메뉴',
    optionSummary: '밥 많이, 순한맛',
    quantity: 1,
    price: 12000,
  },
];
