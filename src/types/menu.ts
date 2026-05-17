export type OptionItem = {
  id: string;
  group: string;
  label: string;
  description: string;
};

export type CartItem = {
  id: string;
  name: string;
  optionSummary: string;
  quantity: number;
  price: number;
};
