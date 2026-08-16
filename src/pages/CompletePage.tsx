import { useEffect, useRef } from 'react';
import { CheckCircle2, Mic } from 'lucide-react';
import { AppHeader } from '../components/AppHeader';
import type { PageWithSpeechProps } from '../types/order';

type CompletePageProps = PageWithSpeechProps & {
  completionMessage?: string;
  guideMessage?: string;
  isListening?: boolean;
  onMicClick?: () => void;
  onHome?: () => void;
};

export const CompletePage = ({
  completionMessage: messageFromProps,
  guideMessage,
  isListening = false,
  onHome,
  onMicClick,
  speak,
}: CompletePageProps) => {
  const didAnnounceRef = useRef(false);
  const guideRef = useRef<HTMLParagraphElement>(null);
  const searchParams = new URLSearchParams(window.location.search);
  const completionMessage =
    messageFromProps || searchParams.get('response') || '주문이 완료되었어요! 곧 준비해드릴게요.';
  const replayMessage = guideMessage || completionMessage;

  useEffect(() => {
    if (didAnnounceRef.current) return;
    didAnnounceRef.current = true;

    const timer = setTimeout(() => {
      guideRef.current?.focus();
      speak(replayMessage);
    }, 400);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const replayGuide = () => {
    window.setTimeout(() => guideRef.current?.focus(), 50);
  };

  return (
    <div className="voisk-screen-bg text-ink">
      <div className="mx-auto flex h-dvh w-full max-w-[440px] flex-col px-5 pb-6 pt-[max(24px,env(safe-area-inset-top))]">

        <AppHeader
          onBack={() => { window.history.back(); }}
          subtitle="주문 완료"
        />

        <p ref={guideRef} tabIndex={-1} className="sr-only">
          {replayMessage}
        </p>

        {onMicClick && (
          <div className="mb-4 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onMicClick}
              aria-label="마이크"
              className={`flex min-h-14 items-center justify-center gap-2 rounded-xl px-4 text-xl font-black shadow-[0_12px_28px_rgba(15,23,42,0.16)] focus:outline-none focus:ring-4 focus:ring-focusring active:scale-[0.99] ${
                isListening ? 'bg-rose-100 text-rose-700' : 'bg-strong text-on-strong'
              }`}
            >
              <Mic aria-hidden="true" size={24} />
              마이크
            </button>
            <button
              type="button"
              onClick={replayGuide}
              aria-label="다시 듣기"
              className="flex min-h-14 items-center justify-center rounded-xl bg-strong px-4 text-xl font-black text-on-strong shadow-[0_12px_28px_rgba(15,23,42,0.16)] focus:outline-none focus:ring-4 focus:ring-focusring active:scale-[0.99]"
            >
              다시 듣기
            </button>
          </div>
        )}

        {/* 완료 아이콘 + 메시지 */}
        <div className="flex flex-1 flex-col items-center justify-center text-center" aria-live="polite" aria-atomic="true">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-surface text-accent shadow-[0_12px_40px_rgba(29,78,216,0.18)]">
            <CheckCircle2 aria-hidden="true" size={52} />
          </div>
          <p className="mt-6 text-3xl font-black leading-snug text-ink">주문이 완료되었어요!</p>
          <p aria-hidden="true" className="mt-1 text-base font-black text-muted">
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
          className="mt-6 flex min-h-16 w-full items-center justify-center rounded-lg bg-strong text-xl font-black text-on-strong shadow-[0_18px_40px_rgba(15,23,42,0.24)] focus:outline-none focus:ring-4 focus:ring-focusring"
        >
          처음으로
        </button>
      </div>
    </div>
  );
};
