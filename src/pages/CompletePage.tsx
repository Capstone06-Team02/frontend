import { CheckCircle2 } from 'lucide-react';
import { getCafeMenuName } from '../constants/cafe';
import type { PageWithSpeechProps } from '../types/order';

export const CompletePage = ({ speak }: PageWithSpeechProps) => {
  const searchParams = new URLSearchParams(window.location.search);
  const menuName = getCafeMenuName(searchParams.get('menu'));

  return (
    <main className="min-h-dvh bg-[radial-gradient(circle_at_top,#eaf8ff_0%,#f8fbff_42%,#f4f0e8_100%)] text-slate-950">
      <div className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col justify-center px-5 py-6">
        <section
          aria-live="polite"
          aria-atomic="true"
          className="rounded-lg border border-slate-900 bg-slate-950 p-6 text-center text-white shadow-[0_28px_80px_rgba(15,23,42,0.26)]"
        >
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-cyan-100 text-cyan-800">
            <CheckCircle2 aria-hidden="true" size={46} />
          </div>
          <p className="mt-5 text-sm font-black text-cyan-200">주문 완료</p>
          <h1 className="mt-3 text-4xl font-black leading-tight">주문이 완료되었어요</h1>
          <p className="mt-5 rounded-lg bg-white/10 px-4 py-3 text-xl font-black text-white">{menuName}를 준비할게요.</p>
        </section>

        <button
          type="button"
          onClick={() => {
            window.location.href = '/';
          }}
          onFocus={() => speak('처음 화면으로 돌아가기 버튼')}
          aria-label="처음 화면으로 돌아가기"
          className="mt-5 flex min-h-16 w-full items-center justify-center rounded-lg bg-cyan-700 text-xl font-black text-white shadow-[0_18px_45px_rgba(8,145,178,0.24)] focus:outline-none focus:ring-4 focus:ring-cyan-300"
        >
          처음으로
        </button>
      </div>
    </main>
  );
};
