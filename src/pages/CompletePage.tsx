import { useEffect, useRef } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { AppHeader } from '../components/AppHeader';
import type { PageWithSpeechProps } from '../types/order';

type CompletePageProps = PageWithSpeechProps & {
  completionMessage?: string;
  onHome?: () => void;
};

export const CompletePage = ({ completionMessage: messageFromProps, onHome, speak }: CompletePageProps) => {
  const didAnnounceRef = useRef(false);
  const searchParams = new URLSearchParams(window.location.search);
  const completionMessage =
    messageFromProps || searchParams.get('response') || '주문이 완료되었어요! 곧 준비해드릴게요.';

  useEffect(() => {
    if (didAnnounceRef.current) return;
    didAnnounceRef.current = true;

    const timer = setTimeout(() => {
      speak(completionMessage);
    }, 400);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="voisk-screen-bg text-slate-950">
      <div className="mx-auto flex h-dvh w-full max-w-[440px] flex-col px-5 pb-6 pt-[max(24px,env(safe-area-inset-top))]">

        <AppHeader
          onBack={() => { window.history.back(); }}
          subtitle="주문 완료"
        />

        {/* 완료 아이콘 + 메시지 */}
        <div className="flex flex-1 flex-col items-center justify-center text-center" aria-live="polite" aria-atomic="true">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-blue-100 text-blue-700 shadow-[0_12px_40px_rgba(29,78,216,0.18)]">
            <CheckCircle2 aria-hidden="true" size={52} />
          </div>
          <p className="mt-6 text-3xl font-black leading-snug text-slate-950">주문이 완료되었어요!</p>
          <p aria-hidden="true" className="mt-1 text-base font-black text-slate-500">
            {completionMessage}
          </p>
        </div>

        {/* 처음으로 버튼 */}
        <button
          type="button"
          onClick={() => {
            if (onHome) {
              onHome();
              return;
            }
            window.location.href = '/';
          }}
          onFocus={() => speak('처음 화면으로 돌아가기 버튼')}
          aria-label="처음 화면으로 돌아가기"
          className="mt-6 flex min-h-16 w-full items-center justify-center rounded-lg bg-slate-950 text-xl font-black text-white shadow-[0_18px_40px_rgba(15,23,42,0.24)] focus:outline-none focus:ring-4 focus:ring-blue-300"
        >
          처음으로
        </button>
      </div>
    </div>
  );
};
