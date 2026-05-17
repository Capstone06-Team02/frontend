export const normalizeOrderText = (rawText: string) => {
  const trimmedText = rawText.trim();

  if (trimmedText === '44' || trimmedText === '내' || trimmedText === '데') {
    return '네';
  }

  const numberMap: { [key: string]: string } = {
    한: '1',
    두: '2',
    세: '3',
    네: '4',
    다섯: '5',
    여섯: '6',
    일곱: '7',
    여덟: '8',
    아홉: '9',
    열: '10',
  };

  let converted = trimmedText.replace(
    /(한|두|세|네|다섯|여섯|일곱|여덟|아홉|열)\s*개/g,
    (match) => `${numberMap[match.replace(/\s*개/g, '')]}개`,
  );

  converted = converted.replace(/(\d)\s*(개)/g, '$1$2');

  if (/^\d+개$/.test(converted.trim())) {
    converted = `${converted.trim()} 주세요`;
  }

  return converted;
};
