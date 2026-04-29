import { useState } from 'react';

export const useVoice = () => {
  const [isListening, setIsListening] = useState(false);
  const [text, setText] = useState<string>('');

  // 음성 출력 (TTS)
  const speak = (message: string, onEnd?: () => void) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = 'ko-KR';
    utterance.onend = () => {
      if (onEnd) onEnd();
    };
    window.speechSynthesis.speak(utterance);
  };

  // 음성 인식 (STT)
  const startListening = (onResult: (transcript: string) => void) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("지원하지 않는 브라우저입니다.");

    const recognition = new SpeechRecognition();
    recognition.lang = 'ko-KR';
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setText(transcript);
      onResult(transcript); // 인식된 결과를 콜백으로 전달
    };
    recognition.start();
  };

  return { isListening, text, speak, startListening };
};