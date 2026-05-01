import { useState } from 'react';

export const useVoice = () => {
  const [isListening, setIsListening] = useState(false);
  const [text, setText] = useState<string>('');

  // 음성 출력 TTS
  const speak = (message: string, onEnd?: () => void) => {
  // 이전 음성이 남아있다면 확실히 종료
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(message);
  utterance.lang = 'ko-KR';
  utterance.rate = 1.0; // 속도 조절 (기본값 1)
  
  utterance.onstart = () => console.log("음성 출력 시작: ", message); // 로그로 확인용
  utterance.onend = () => {
    if (onEnd) onEnd();
  };
  
  utterance.onerror = (e) => console.error("TTS 에러 발생:", e); // 에러 확인용

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