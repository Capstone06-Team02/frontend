import { useCallback, useEffect, useRef, useState } from 'react';

type VoiceRecognitionResult = {
  transcript: string;
};

type VoiceRecognitionEvent = {
  results: {
    length: number;
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
  abort?: () => void;
};

type VoiceRecognitionConstructor = new () => VoiceRecognition;

const VOICE_STORAGE_KEY = 'voisk:selectedVoiceURI';
const VOICE_RATE_KEY = 'voisk:speechRate';

const findStoredVoice = () => {
  const selectedVoiceURI = window.localStorage.getItem(VOICE_STORAGE_KEY);
  const voices = window.speechSynthesis.getVoices();
  return voices.find((voice) => voice.voiceURI === selectedVoiceURI);
};

const getStoredRate = () => {
  const rate = window.localStorage.getItem(VOICE_RATE_KEY);
  return rate ? parseFloat(rate) : 1.0;
};

declare global {
  interface Window {
    SpeechRecognition?: VoiceRecognitionConstructor;
    webkitSpeechRecognition?: VoiceRecognitionConstructor;
  }
}

export const useVoice = () => {
  const [isListening, setIsListening] = useState(false);
  const [text, setText] = useState<string>('');

  const speakRef = useRef<(message: string, onEnd?: () => void) => void>(() => {});
  // 연속 청취 루프 활성화 여부
  const continuousActiveRef = useRef(false);
  const pressRecognitionRef = useRef<VoiceRecognition | null>(null);
  const pressTranscriptRef = useRef('');
  const pressResultHandlerRef = useRef<((transcript: string) => void) | null>(null);

  // ─── 1. TTS ────────────────────────────────────────────────────────────────
  const speak = useCallback((message: string, onEnd?: () => void) => {
    window.speechSynthesis.cancel();

    // VoiceOver 테스트 중에는 앱 자체 TTS를 꺼서 음성이 겹치지 않게 둔다.
    void message;
    void findStoredVoice;
    void getStoredRate;
    if (onEnd) window.setTimeout(onEnd, 0);

    // const utterance = new SpeechSynthesisUtterance(message);
    // const selectedVoice = findStoredVoice();
    // if (selectedVoice) utterance.voice = selectedVoice;
    //
    // utterance.lang = 'ko-KR';
    // utterance.rate = getStoredRate();
    //
    // // iOS Safari에서 긴 문장 TTS가 멈추는 버그 방지
    // const resumeInterval = setInterval(() => {
    //   if (!window.speechSynthesis.speaking) {
    //     clearInterval(resumeInterval);
    //     return;
    //   }
    //   window.speechSynthesis.resume();
    // }, 5000);
    //
    // utterance.onend = () => {
    //   clearInterval(resumeInterval);
    //   if (onEnd) onEnd();
    // };
    //
    // window.speechSynthesis.speak(utterance);
  }, []);

  useEffect(() => {
    speakRef.current = speak;
  }, [speak]);

  // ─── 2. 단일 STT ───────────────────────────────────────────────────────────
  const startListening = useCallback((onResult: (transcript: string) => void) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      speakRef.current('이 브라우저는 음성 인식을 지원하지 않아요.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ko-KR';
    recognition.interimResults = false;
    recognition.continuous = false;

    let gotResult = false;

    recognition.onstart = () => {
      setIsListening(true);
      setText('');
    };

    recognition.onend = () => {
      setIsListening(false);
      if (!gotResult) {
        speakRef.current('인식하지 못했어요. 다시 말씀해주세요.');
      }
    };

    recognition.onresult = (event: VoiceRecognitionEvent) => {
      gotResult = true;
      const transcript = event.results[0][0].transcript;
      console.log('STT 결과:', transcript);
      setText(transcript);
      onResult(transcript);
    };

    recognition.onerror = (e: VoiceRecognitionErrorEvent) => {
      console.error('STT 에러:', e.error);
      gotResult = true;
      setIsListening(false);
      if (e.error !== 'aborted' && e.error !== 'no-speech') {
        speakRef.current('마이크 연결을 확인해주세요.');
      } else if (e.error === 'no-speech') {
        speakRef.current('말씀을 듣지 못했어요. 다시 말씀해주세요.');
      }
    };

    try {
      recognition.stop();
      setTimeout(() => recognition.start(), 100);
    } catch {
      recognition.start();
    }
  }, []);

  // ─── 3. 토글형 STT ────────────────────────────────────────────────────────
  const startToggleListening = useCallback((onResult: (transcript: string) => void) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      speakRef.current('이 브라우저는 음성 인식을 지원하지 않아요.');
      return;
    }

    window.speechSynthesis.cancel();
    pressRecognitionRef.current?.abort?.();
    pressTranscriptRef.current = '';
    pressResultHandlerRef.current = onResult;

    const recognition = new SpeechRecognition();
    recognition.lang = 'ko-KR';
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onstart = () => {
      setIsListening(true);
      setText('');
    };

    recognition.onresult = (event: VoiceRecognitionEvent) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join(' ')
        .trim();
      pressTranscriptRef.current = transcript;
      setText(transcript);
    };

    recognition.onerror = (e: VoiceRecognitionErrorEvent) => {
      console.error('토글 STT 에러:', e.error);
      setIsListening(false);
      pressRecognitionRef.current = null;
      if (e.error !== 'aborted' && e.error !== 'no-speech') {
        speakRef.current('마이크 연결을 확인해주세요.');
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      pressRecognitionRef.current = null;
      const transcript = pressTranscriptRef.current.trim();
      pressTranscriptRef.current = '';

      if (transcript) {
        pressResultHandlerRef.current?.(transcript);
      } else {
        speakRef.current('말씀을 듣지 못했어요. 다시 말씀해주세요.');
      }
    };

    pressRecognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      pressRecognitionRef.current = null;
      setIsListening(false);
    }
  }, []);

  const stopToggleListening = useCallback(() => {
    pressRecognitionRef.current?.stop();
  }, []);

  // ─── 4. 연속 청취 STT (루프) ───────────────────────────────────────────────
  /**
   * 말씀하실 때마다 onResult를 반복 호출합니다.
   * stopListening()을 호출하거나 timeoutMs가 지나면 중단됩니다.
   * timeoutMs 미지정 시 stopListening() 호출 전까지 무한 반복합니다.
   */
  const startContinuousListening = useCallback(
    (onResult: (transcript: string) => void, onTimeout?: () => void, timeoutMs?: number) => {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        speakRef.current('이 브라우저는 음성 인식을 지원하지 않아요.');
        return;
      }

      continuousActiveRef.current = true;

      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      if (timeoutMs) {
        timeoutId = setTimeout(() => {
          if (continuousActiveRef.current) {
            continuousActiveRef.current = false;
            setIsListening(false);
            onTimeout?.();
          }
        }, timeoutMs);
      }

      const listenOnce = () => {
        if (!continuousActiveRef.current) {
          setIsListening(false);
          if (timeoutId) clearTimeout(timeoutId);
          return;
        }

        // TTS가 재생 중이면 끝날 때까지 대기
        if (window.speechSynthesis.speaking) {
          setTimeout(listenOnce, 300);
          return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'ko-KR';
        recognition.interimResults = false;
        recognition.continuous = false;

        recognition.onstart = () => setIsListening(true);

        recognition.onend = () => {
          // 루프가 살아있으면 자동 재시작
          if (continuousActiveRef.current) {
            setTimeout(listenOnce, 200);
          } else {
            setIsListening(false);
            if (timeoutId) clearTimeout(timeoutId);
          }
        };

        recognition.onresult = (event: VoiceRecognitionEvent) => {
          const transcript = event.results[0][0].transcript;
          console.log('연속 STT 결과:', transcript);
          setText(transcript);
          onResult(transcript);
          // onend 후 루프 재시작
        };

        recognition.onerror = (e: VoiceRecognitionErrorEvent) => {
          // no-speech, aborted는 무시하고 onend에서 재시작
          if (e.error !== 'no-speech' && e.error !== 'aborted') {
            console.error('연속 STT 에러:', e.error);
          }
        };

        try {
          recognition.start();
        } catch {
          // ignore
        }
      };

      listenOnce();
    },
    [],
  );

  // ─── 5. 청취 중단 ──────────────────────────────────────────────────────────
  const stopListening = useCallback(() => {
    continuousActiveRef.current = false;
    pressRecognitionRef.current?.abort?.();
    pressRecognitionRef.current = null;
    setIsListening(false);
  }, []);

  return {
    isListening,
    text,
    speak,
    startListening,
    startToggleListening,
    stopToggleListening,
    startContinuousListening,
    stopListening,
  };
};
