import { DEFAULT_CAFE_OPTIONS, type CafeOptionState } from '../constants/cafe';

export const wantsRecommendation = (text: string) =>
  text.includes('추천') ||
  text.includes('정하지') ||
  text.includes('못 정') ||
  text.includes('메뉴 없어') ||
  text.includes('아무거나') ||
  text.includes('뭐 마실') ||
  text.includes('골라');

export const parseCafeOptions = (text: string, currentOptions: CafeOptionState = DEFAULT_CAFE_OPTIONS): CafeOptionState => {
  const options = { ...currentOptions };

  if (text.includes('따뜻') || text.includes('핫')) {
    options.temperature = '핫';
  }

  if (text.includes('아이스') || text.includes('차갑')) {
    options.temperature = '아이스';
  }

  if (text.includes('얼음') && (text.includes('적게') || text.includes('조금') || text.includes('덜'))) {
    options.ice = '적게';
  }

  if (text.includes('얼음') && (text.includes('보통') || text.includes('일반'))) {
    options.ice = '보통';
  }

  if (text.includes('큰') || text.includes('크게') || text.includes('라지') || text.includes('대')) {
    options.size = '큰 사이즈';
  }

  if (text.includes('보통 사이즈') || text.includes('일반 사이즈') || text.includes('중간')) {
    options.size = '보통 사이즈';
  }

  return options;
};

export const encodeCafeOptions = (options: CafeOptionState) =>
  new URLSearchParams({
    temperature: options.temperature,
    ice: options.ice,
    size: options.size,
  }).toString();

export const readCafeOptions = (searchParams: URLSearchParams): CafeOptionState => ({
  temperature: searchParams.get('temperature') === '핫' ? '핫' : '아이스',
  ice: searchParams.get('ice') === '적게' ? '적게' : '보통',
  size: searchParams.get('size') === '큰 사이즈' ? '큰 사이즈' : '보통 사이즈',
});

export const summarizeCafeOrder = (menuName: string, options: CafeOptionState) =>
  `${menuName} ${options.temperature}, 얼음 ${options.ice}, ${options.size}`;
