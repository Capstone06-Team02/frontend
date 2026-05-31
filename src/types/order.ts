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
  category?: string;
  menuId: number;
  name: string;
  price: number;
  score?: number;
};

export type RecommendApiResponse = {
  recommendations: RecommendationInfo[];
  ttsText: string;
};

export type RecommendHint = {
  hintId: number;
  label: string;
};

export type RecommendHintListResponse = {
  hints: RecommendHint[];
};

export type HintRecommendResponse = {
  menus: RecommendationInfo[];
  ttsText: string;
};

export type OptionalOptionItem = {
  defaultQuantity?: number;
  defaultSelected?: boolean;
  extraPrice: number;
  optionItemId: number;
  optionItemName: string;
};

export type OptionalOptionGroup = {
  optionGroupId: number;
  optionGroupName: string;
  optionItems: OptionalOptionItem[];
};

export type MenuOptionalOptionsResponse = {
  menuId: number;
  menuName: string;
  optionGroups: OptionalOptionGroup[];
};

export type SelectedRequiredOption = {
  optionGroupName: string;
  optionItemName: string;
};

export type RequiredOptionSummaryResponse = {
  menuId: number;
  menuName: string;
  message: string;
  selectedRequiredOptions: SelectedRequiredOption[];
  unitPrice: number;
};

export type OrderOptionSelectionRequest = {
  menuId: number;
  optionGroupId: number;
  optionItemId: number;
  sessionId: string;
};

export type OrderOptionSelectionResponse = {
  extraPrice: number;
  menuId: number;
  optionGroupId: number;
  optionGroupName: string;
  selectedOptionItemId: number;
  selectedOptionItemName: string;
  sessionId: string;
};

export type Speak = (message: string, onEnd?: () => void) => void;

export type PageWithSpeechProps = {
  speak: Speak;
};
