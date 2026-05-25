export type MenuRecommendation = {
  menuId: number;
  name: string;
  price: number;
  category: string;
  score: number;
};

export type RecommendResponse = {
  recommendations: MenuRecommendation[];
  ttsText?: string;
};
