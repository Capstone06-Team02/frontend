import { useRef, useState } from 'react';
import { AudioLines, Mic } from 'lucide-react';
import { sendOrderText } from '../api/order';
import { DEFAULT_MESSAGE } from '../constants/order';
import { useVoice } from '../hooks/useVoice';
import type { OrderApiResponse } from '../types/order';
import { normalizeOrderText } from '../utils/voice';

export const VoiceOrderPage = () => {
  const [response, setResponse] = useState<string>(DEFAULT_MESSAGE);
  const sessionIdRef = useRef<string | null>(null);
  const { isListening, text, speak, startListening } = useVoice();

  const continueConversation = (data: OrderApiResponse) => {
    setTimeout(() => {
      if (data.slotsComplete === false) {
        handleStart();
      } else if (data.slotsComplete === true && data.intent === 'ORDER') {
        handleStart();
      }
    }, 300);
  };

  const processOrder = async (input: string) => {
    try {
      const normalizedInput = normalizeOrderText(input);
      const data: OrderApiResponse = await sendOrderText(normalizedInput, sessionIdRef.current);
      const botMessage = data.response || '다시 한 번 말씀해주세요.';

      if (data.sessionId) {
        sessionIdRef.current = data.sessionId;
      }

      setResponse(botMessage);
      speak(botMessage, () => continueConversation(data));
    } catch (error) {
      console.error('에러 발생:', error);
      setResponse('서버와 연결할 수 없습니다.');
      speak('서버와 연결할 수 없습니다.');
    }
  };

  const handleStart = () => {
    startListening((transcript: string) => {
      processOrder(transcript);
    });
  };

  return (
    <main className="min-h-dvh bg-slate-50 text-slate-950">
      <div className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col px-5 pb-6 pt-[max(28px,env(safe-area-inset-top))]">
        <header className="mb-7">
          <h1 className="text-4xl font-black leading-tight tracking-normal">Voisk</h1>
        </header>

        <section
          aria-live="polite"
          aria-atomic="true"
          className="mb-8 rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
        >
          <p className="text-sm font-semibold text-slate-500">음성 안내</p>
          <p className="mt-2 min-h-24 text-2xl font-bold leading-snug">{response}</p>
        </section>

        <button
          type="button"
          onClick={handleStart}
          disabled={isListening}
          aria-label={isListening ? '음성 인식 중입니다' : '음성 주문 시작'}
          className={`relative mx-auto mb-8 flex h-52 w-52 shrink-0 items-center justify-center rounded-full transition duration-300 focus:outline-none focus:ring-4 focus:ring-sky-300 focus:ring-offset-4 ${
            isListening
              ? 'bg-rose-100 shadow-[0_0_40px_rgba(244,63,94,0.3)]'
              : 'bg-sky-200 shadow-xl active:scale-95'
          }`}
        >
          {isListening && <span className="absolute inset-0 rounded-full bg-rose-400 opacity-20 animate-ping" />}
          {isListening ? (
            <AudioLines aria-hidden="true" size={88} className="text-rose-700" />
          ) : (
            <Mic aria-hidden="true" size={88} className="text-sky-950" />
          )}
        </button>

        <section className="mt-auto rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">인식된 내용</p>
          <p className="mt-1 min-h-8 text-xl font-bold text-sky-900">
            {text ? `"${text}"` : '마이크 버튼을 누르고 말씀하세요'}
          </p>
        </section>
      </div>
    </main>
  );
};
