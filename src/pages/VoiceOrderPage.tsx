import { useRef, useState } from 'react';
import { AudioLines, HelpCircle, Mic } from 'lucide-react';
import { sendOrderText } from '../api/order';
import { DEFAULT_MESSAGE } from '../constants/order';
import { useVoice } from '../hooks/useVoice';
import type { OrderApiResponse } from '../types/order';
import { normalizeOrderText } from '../utils/voice';

export const VoiceOrderPage = () => {
  const [response, setResponse] = useState<string>(DEFAULT_MESSAGE);
  const [hasActivated, setHasActivated] = useState(false);
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
    if (isListening) return;

    startListening((transcript: string) => {
      processOrder(transcript);
    });
  };

  const handleActivateVoiceOrder = () => {
    if (isListening) return;

    if (!hasActivated) {
      setHasActivated(true);
      speak('화면을 터치하셨습니다. 마이크를 켭니다. 원하시는 메뉴를 말씀해주세요.', handleStart);
      return;
    }

    handleStart();
  };

  return (
    <main className="min-h-dvh bg-[#f7fbff] text-slate-950" onClick={handleActivateVoiceOrder}>
      <div className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col px-5 pb-6 pt-[max(28px,env(safe-area-inset-top))]">
        <header className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-sky-700">NFC 음성 주문</p>
            <h1 className="text-4xl font-black leading-tight tracking-normal">Voisk</h1>
          </div>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              window.location.href = '/help';
            }}
            aria-label="도움말 화면으로 이동"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-sky-100 bg-white shadow-sm focus:outline-none focus:ring-4 focus:ring-sky-300"
          >
            <HelpCircle aria-hidden="true" size={28} />
          </button>
        </header>

        <div className="flex flex-1 flex-col items-center justify-center pb-10">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              handleActivateVoiceOrder();
            }}
            disabled={isListening}
            aria-label={isListening ? '음성 인식 중입니다' : '음성 주문 시작. 한 번 누르면 마이크가 켜집니다'}
            className={`relative mx-auto flex h-[17rem] w-[17rem] shrink-0 items-center justify-center rounded-full border transition duration-300 focus:outline-none focus:ring-4 focus:ring-sky-300 focus:ring-offset-4 ${
              isListening
                ? 'border-rose-200 bg-rose-100 shadow-[0_0_48px_rgba(244,63,94,0.35)]'
                : 'border-sky-100 bg-sky-200 shadow-[0_18px_55px_rgba(14,116,144,0.22)] active:scale-95'
            }`}
          >
            {!isListening && <span className="absolute inset-5 rounded-full border border-white/70"></span>}
            {isListening && <span className="absolute inset-0 rounded-full bg-rose-400 opacity-20 animate-ping" />}
            {isListening ? (
              <AudioLines aria-hidden="true" size={118} className="text-rose-700" />
            ) : (
              <Mic aria-hidden="true" size={118} className="text-sky-950" />
            )}
          </button>

          <section
            aria-live="polite"
            aria-atomic="true"
            className="mt-12 w-full rounded-lg border border-sky-100 bg-white px-5 py-4 shadow-[0_12px_35px_rgba(15,23,42,0.08)]"
          >
            <p className="text-lg font-black leading-snug text-slate-950">
              {text ? `인식된 내용: "${text}"` : '화면 중앙을 한번 터치하면 마이크가 켜집니다.'}
            </p>
            <p className="mt-2 text-lg font-black leading-snug text-slate-950">
              {text ? response : '원하시는 메뉴를 편하게 말씀해주세요'}
            </p>
          </section>
        </div>
      </div>
    </main>
  );
};
