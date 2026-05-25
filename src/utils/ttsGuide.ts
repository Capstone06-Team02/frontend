/*import { formatPrice } from './format';

export const buildMenuFocusGuide = (menuName: string, price: number): string =>
  `${menuName}, ${formatPrice(price)}`;

export const buildQuantityStepGuide = (menuName: string): string =>
  `${menuName} 선택하셨습니다. 몇 개 드릴까요?`;

export const buildQuantityConfirmGuide = (totalPrice: number): string =>
  `총 ${formatPrice(totalPrice)} 확인`;

export const buildOrderConfirmGuide = (
  menuName: string,
  quantity: number,
  totalPrice: number,
): string => `주문 내용을 확인할게요. ${menuName} ${quantity}개, 총 ${formatPrice(totalPrice)} 맞으시죠?`;

export const buildRequiredOptionGuide = (
  optionName: string,
  choices: string[],
): string => {
  const visibleChoices = choices.filter(Boolean);
  if (visibleChoices.length === 2) {
    return `${visibleChoices.join(', ')}를 선택해주세요`;
  }

  const normalizedOptionName = optionName || '옵션';
  return `${normalizedOptionName}를 선택해주세요. ${visibleChoices.join(', ')}가 있습니다`;
};

export const buildCustomOptionGuide = (optionNames: string[]): string =>
  `커스텀 가능한 옵션은 ${optionNames.filter(Boolean).join(', ')}입니다. 어떤 옵션을 변경하시겠어요? 없으면 확인을 선택해주세요`;

export const buildOptionSelectedGuide = (
  optionName: string,
  selectedValue: string,
): string => `${selectedValue} ${optionName || '옵션'} 선택하셨습니다`;

export const isCustomOptionStep = (quickReplies: string[]): boolean =>
  quickReplies.includes('확인');
*/