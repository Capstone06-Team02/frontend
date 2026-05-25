import { DEFAULT_CAFE_OPTIONS, type CafeOptionState } from '../constants/cafe';

export const wantsRecommendation = (text: string) =>
  text.includes('추천') ||
  text.includes('정하지') ||
  text.includes('못 정') ||
  text.includes('메뉴 없어') ||
  text.includes('아무거나') ||
  text.includes('뭐 마실') ||
  text.includes('골라');

export const wantsAlternativeRecommendation = (text: string) =>
  text.includes('추천') ||
  (text.includes('다른') && (text.includes('메뉴') || text.includes('추천'))) ||
  text.includes('다른거') ||
  text.includes('다른 걸') ||
  (text.includes('또') && text.includes('추천')) ||
  (text.includes('다음') && text.includes('메뉴')) ||
  text.includes('더 보여') ||
  text.includes('더 추천');

export const wantsMenuDescription = (text: string) =>
  text.includes('설명') ||
  text.includes('어떤 메뉴') ||
  text.includes('뭐야') ||
  text.includes('뭔가요') ||
  text.includes('소개');

export const parseCafeOptions = (
  text: string,
  currentOptions: CafeOptionState = DEFAULT_CAFE_OPTIONS,
): CafeOptionState => {
  const options = { ...currentOptions };

  // 온도
  if (text.includes('따뜻') || text.includes('핫') || text.includes('뜨겁')) {
    options.temperature = '핫';
  }
  if (text.includes('아이스') || text.includes('차갑') || text.includes('시원')) {
    options.temperature = '아이스';
  }

  // 컵 사이즈
  if (
    text.includes('큰') ||
    text.includes('크게') ||
    text.includes('라지') ||
    text.includes('large') ||
    (text.includes('사이즈') && text.includes('크'))
  ) {
    options.size = '큰 사이즈';
  }
  if (
    text.includes('보통 사이즈') ||
    text.includes('일반 사이즈') ||
    text.includes('중간') ||
    text.includes('레귤러') ||
    text.includes('medium')
  ) {
    options.size = '보통 사이즈';
  }

  // 얼음 양
  if (
    text.includes('얼음') &&
    (text.includes('적게') ||
      text.includes('조금') ||
      text.includes('덜') ||
      text.includes('없이') ||
      text.includes('빼'))
  ) {
    options.ice = '적게';
  }
  if (
    text.includes('얼음') &&
    (text.includes('보통') || text.includes('일반') || text.includes('그대로'))
  ) {
    options.ice = '보통';
  }

  // 당도
  if (
    text.includes('덜 달') ||
    text.includes('덜달') ||
    text.includes('달지 않') ||
    text.includes('당도 낮') ||
    text.includes('시럽 적') ||
    text.includes('설탕 적') ||
    text.includes('덜 달게')
  ) {
    options.sweetness = '덜 달게';
  }
  if (text.includes('보통 당도') || text.includes('달게') || text.includes('당도 보통')) {
    options.sweetness = '보통 당도';
  }

  // 샷
  if (
    text.includes('샷 추가') ||
    text.includes('샷추가') ||
    text.includes('에스프레소 추가') ||
    text.includes('샷 하나') ||
    text.includes('진하게')
  ) {
    options.shot = '샷 추가';
  }
  if (text.includes('기본 샷') || text.includes('샷 기본') || text.includes('샷 없')) {
    options.shot = '기본';
  }

  // 컵 종류
  if (
    text.includes('개인 컵') ||
    text.includes('텀블러') ||
    text.includes('내 컵') ||
    text.includes('머그')
  ) {
    options.cupType = '개인 컵';
  }
  if (text.includes('일회용') || text.includes('테이크아웃')) {
    options.cupType = '일회용 컵';
  }

  return options;
};

export const encodeCafeOptions = (options: CafeOptionState) =>
  new URLSearchParams({
    temperature: options.temperature,
    size: options.size,
    ice: options.ice,
    sweetness: options.sweetness,
    shot: options.shot,
    cupType: options.cupType,
  }).toString();

export const readCafeOptions = (searchParams: URLSearchParams): CafeOptionState => ({
  temperature: searchParams.get('temperature') === '핫' ? '핫' : '아이스',
  size: searchParams.get('size') === '큰 사이즈' ? '큰 사이즈' : '보통 사이즈',
  ice: searchParams.get('ice') === '적게' ? '적게' : '보통',
  sweetness: searchParams.get('sweetness') === '덜 달게' ? '덜 달게' : '보통 당도',
  shot: searchParams.get('shot') === '샷 추가' ? '샷 추가' : '기본',
  cupType: searchParams.get('cupType') === '개인 컵' ? '개인 컵' : '일회용 컵',
});

/**
 * 화면 표시 + TTS 요약.
 * 기본값이 아닌 추가 옵션만 뒤에 붙임 → 간결한 기본 표시.
 */
export const summarizeCafeOrder = (menuName: string, options: CafeOptionState): string => {
  const base = `${menuName} ${options.temperature}, ${options.size}, 얼음 ${options.ice}`;
  const extras: string[] = [];
  if (options.sweetness !== '보통 당도') extras.push(options.sweetness);
  if (options.shot !== '기본') extras.push(options.shot);
  if (options.cupType !== '일회용 컵') extras.push(options.cupType);
  return extras.length ? `${base}, ${extras.join(', ')}` : base;
};
