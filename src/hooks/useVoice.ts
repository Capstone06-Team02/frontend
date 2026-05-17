import { useState } from 'react';

type VoiceRecognitionResult = {
  transcript: string;
};

type VoiceRecognitionEvent = {
  results: {
    [resultIndex: number]: {
      [alternativeIndex: number]: VoiceRecognitionResult;
    };
  };
};

type VoiceRecognitionErrorEvent = {
  error: string;
};

type VoiceRecognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: VoiceRecognitionEvent) => void) | null;
  onerror: ((event: VoiceRecognitionErrorEvent) => void) | null;
  start: () => void;
  stop: () => void;
};

type VoiceRecognitionConstructor = new () => VoiceRecognition;

declare global {
  interface Window {
    SpeechRecognition?: VoiceRecognitionConstructor;
    webkitSpeechRecognition?: VoiceRecognitionConstructor;
  }
}

export const useVoice = () => {
  const [isListening, setIsListening] = useState(false);
  const [text, setText] = useState<string>('');

  // 1. 음성 출력 TTS (누락되었던 부분 추가)
  const speak = (message: string, onEnd?: () => void) => {
    window.speechSynthesis.cancel(); // 이전 음성 중단

    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = 'ko-KR';
    utterance.rate = 1.0;

    utterance.onend = () => {
      if (onEnd) onEnd();
    };

    window.speechSynthesis.speak(utterance);
  };

  // 2. 음성 인식 STT
  const startListening = (onResult: (transcript: string) => void) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("지원하지 않는 브라우저입니다.");

    const recognition = new SpeechRecognition();
    recognition.lang = 'ko-KR';
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onstart = () => {
      setIsListening(true);
      setText(""); 
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onresult = (event: VoiceRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      console.log("STT 결과 도달:", transcript);
      setText(transcript);
      onResult(transcript);
    };

    recognition.onerror = (e: VoiceRecognitionErrorEvent) => {
      console.error("STT 에러:", e.error);
      setIsListening(false);
    };

    try {
      recognition.stop();
      setTimeout(() => recognition.start(), 100); 
    } catch {
      recognition.start();
    }
  };

  // 이제 speak가 정의되었으므로 오류가 사라집니다.
  return { isListening, text, speak, startListening };
};
