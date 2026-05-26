export type OrderApiResponse = {
  sessionId?: string;
  intent?: string;
  price?: {
    menuPrice?: number;
    optionExtraPrice?: number;
    totalPrice?: number;
    unitPrice?: number;
  } | null;
  response?: string;
  slots?: {
    items?: OrderItem[];
    menu?: string | null;
    optionSlots?: OptionSlot[];
    quantity?: number | null;
    [key: string]: unknown;
  };
  slotsComplete?: boolean;
  quickReplies?: string[];
};

export type OptionCandidate = {
  available?: boolean;
  defaultQuantity?: number | null;
  defaultSelected?: boolean;
  extraPrice?: number;
  maxQuantity?: number | null;
  name: string;
  optionItemId?: number;
  selected?: boolean;
  value?: string;
};

export type OptionSlot = {
  candidates?: OptionCandidate[];
  defaultSelected?: boolean | null;
  maxSelect?: number;
  minSelect?: number;
  name?: string;
  optionGroupId?: number;
  parentOptionItemId?: number | null;
  required?: boolean;
  selected?: string | null;
  selectedOption?: string | null;
};

export type OrderItem = {
  menu?: string | null;
  menuPrice?: number;
  optionExtraPrice?: number;
  optionSlots?: OptionSlot[];
  quantity?: number | null;
  totalPrice?: number;
  unitPrice?: number;
};

export type CategoryInfo = {
  categoryId: number;
  depth: number;
  name: string;
};

export type OptionItemInfo = {
  aliases?: string[];
  defaultQuantity?: number;
  extraPrice: number;
  isAvailable: boolean;
  isDefault: boolean;
  maxQuantity?: number;
  name: string;
  optionItemId: number;
};

export type OptionGroupInfo = {
  aliases?: string[];
  isAvailable: boolean;
  isRequired: boolean;
  maxSelect: number;
  minSelect: number;
  name: string;
  optionGroupId: number;
  optionItems: OptionItemInfo[];
  parentOptionItemId?: number | null;
};

export type MenuInfo = {
  category: CategoryInfo;
  description: string;
  isAvailable: boolean;
  menuId: number;
  name: string;
  optionGroups: OptionGroupInfo[];
  price: number;
};

export type MenuCacheResponse = {
  cachedAt: string;
  menuCount: number;
  menus: MenuInfo[];
  restaurantId: number;
  restaurantName: string;
};

export type RecommendationInfo = {
  category: string;
  menuId: number;
  name: string;
  price: number;
  score: number;
};

export type RecommendApiResponse = {
  recommendations: RecommendationInfo[];
  ttsText: string;
};

export type Speak = (message: string, onEnd?: () => void) => void;

export type PageWithSpeechProps = {
  speak: Speak;
};
