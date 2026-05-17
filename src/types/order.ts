export type OrderApiResponse = {
  sessionId?: string;
  intent?: string;
  response?: string;
  slotsComplete?: boolean;
};

export type Speak = (message: string, onEnd?: () => void) => void;

export type PageWithSpeechProps = {
  speak: Speak;
};
