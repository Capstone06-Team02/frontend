import { ChevronLeft } from 'lucide-react';

type AppHeaderProps = {
  hideBack?: boolean;
  onBack?: () => void;
  subtitle?: string;
};

export const AppHeader = ({
  hideBack = false,
  onBack = () => window.history.back(),
  subtitle,
}: AppHeaderProps) => (
  // 색은 전부 토큰(accent/muted/focusring)을 쓴다. 고대비 모드로 바뀌면
  // src/index.css의 변수만 갈리므로 여기에 분기가 필요 없다.
  <div className="mb-4 grid grid-cols-[3rem_1fr_3rem] items-start gap-3">
    {hideBack ? (
      <div aria-hidden="true" className="h-12 w-12" />
    ) : (
      <button
        type="button"
        onClick={onBack}
        aria-label="이전 화면으로 이동"
        className="flex h-12 w-12 items-center justify-center rounded-xl bg-transparent text-accent focus:outline-none focus:ring-4 focus:ring-focusring"
      >
        <ChevronLeft aria-hidden="true" size={34} strokeWidth={3} />
      </button>
    )}

    <div aria-hidden="true" className="min-w-0 text-center">
      <div className="text-4xl font-black leading-tight tracking-normal text-accent">Voisk</div>
      {subtitle && (
        // truncate를 쓰지 않는다. 큰 글자 모드에서 부제가 잘려 저시력
        // 사용자가 현재 화면을 알 수 없게 되기 때문이다.
        <p className="break-keep text-base font-black leading-snug text-muted">{subtitle}</p>
      )}
    </div>

    <div aria-hidden="true" className="h-12 w-12" />
  </div>
);
