import { ChevronLeft, Mic } from 'lucide-react';
import { getCafeMenuName } from '../constants/cafe';
import { useVoice } from '../hooks/useVoice';
import type { PageWithSpeechProps } from '../types/order';
import { readCafeOptions, summarizeCafeOrder } from '../utils/cafeOrder';

export const ConfirmPage = ({ speak }: PageWithSpeechProps) => {
  const searchParams = new URLSearchParams(window.location.search);
  const menuId = searchParams.get('menu') || 'cream-latte';
  const menuName = getCafeMenuName(menuId);
  const options = readCafeOptions(searchParams);
  const summary = summarizeCafeOrder(menuName, options);
  const { isListening, startListening } = useVoice();

  const completeOrder = () => {
    window.location.href = `/complete?menu=${menuId}`;
  };

  const startConfirmVoiceInput = () => {
    if (isListening) return;

    speak(`${summary} 맞나요? 맞으면 네 맞습니다 라고 말씀해주세요.`, () => {
      startListening((transcript) => {
        if (transcript.includes('네') || transcript.includes('맞') || transcript.includes('응')) {
          speak('주문이 완료되었어요.', completeOrder);
          return;
        }

        speak('다시 확인해주세요. 맞으면 네 맞습니다 라고 말씀해주세요.');
      });
    });
  };

  return (
    <main className="min-h-dvh bg-[radial-gradient(circle_at_top,#eef6ff_0%,#f8fbff_42%,#f4f0e8_100%)] text-slate-950">
      <div className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col px-5 pb-5 pt-[max(24px,env(safe-area-inset-top))]">
        <header className="mb-6 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black text-slate-500">최종 확인</p>
            <h1 className="text-3xl font-black leading-tight tracking-normal text-blue-700">Voisk</h1>
          </div>
          <button
            type="button"
            onClick={() => {
              window.location.href = `/options?menu=${menuId}`;
            }}
            onFocus={() => speak('옵션 선택 화면으로 돌아가기 버튼')}
            aria-label="옵션 선택 화면으로 돌아가기"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-white shadow-[0_12px_30px_rgba(15,23,42,0.16)] focus:outline-none focus:ring-4 focus:ring-blue-300"
          >
            <ChevronLeft aria-hidden="true" size={28} />
          </button>
        </header>

        <section aria-label="주문 내용" className="flex flex-1 flex-col justify-center">
          <p className="text-sm font-black text-slate-500">주문 내용</p>
          <p className="mt-2 text-5xl font-black leading-tight text-slate-950">{summary}</p>
        </section>

        <button
          type="button"
          onClick={startConfirmVoiceInput}
          disabled={isListening}
          aria-label="음성으로 주문 확인하기"
          className={`mt-5 flex min-h-16 w-full items-center justify-center gap-3 rounded-lg text-xl font-black shadow-[0_18px_45px_rgba(29,78,216,0.22)] focus:outline-none focus:ring-4 focus:ring-blue-300 ${
            isListening ? 'bg-rose-100 text-rose-800' : 'bg-blue-700 text-white'
          }`}
        >
          <Mic aria-hidden="true" size={26} />
          {isListening ? '듣는 중' : '음성으로 확인'}
        </button>

        <button
          type="button"
          onClick={() => {
            speak('주문이 완료되었어요.', completeOrder);
          }}
          onFocus={() => speak('네 맞습니다 버튼')}
          aria-label="네 맞습니다"
          className="mt-3 flex min-h-16 w-full items-center justify-center rounded-lg bg-slate-950 text-xl font-black text-white shadow-[0_18px_40px_rgba(15,23,42,0.24)] focus:outline-none focus:ring-4 focus:ring-blue-300"
        >
          네 맞습니다
        </button>
      </div>
    </main>
  );
};
