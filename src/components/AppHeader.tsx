import { ChevronLeft } from 'lucide-react';

type AppHeaderProps = {
  hideBack?: boolean;
  onBack?: () => void;
  subtitle?: string;
  tone?: 'contrast' | 'dark' | 'light';
};

export const AppHeader = ({
  hideBack = false,
  onBack = () => window.history.back(),
  subtitle,
  tone = 'dark',
}: AppHeaderProps) => {
  const isLight = tone === 'light';
  const isContrast = tone === 'contrast';
  const buttonClass = isContrast
    ? 'text-white focus:ring-yellow-300'
    : isLight
    ? 'text-sky-700 focus:ring-sky-300'
    : 'text-blue-700 focus:ring-blue-300';
  const titleClass = isContrast ? 'text-white' : isLight ? 'text-slate-950' : 'text-blue-700';
  const subtitleClass = isContrast ? 'text-yellow-200' : isLight ? 'text-sky-700' : 'text-slate-500';

  return (
    <div className="mb-4 grid grid-cols-[3rem_1fr_3rem] items-start gap-3">
      {hideBack ? (
        <div aria-hidden="true" className="h-12 w-12" />
      ) : (
        <button
          type="button"
          onClick={onBack}
          aria-label="이전 화면으로 이동"
          className={`flex h-12 w-12 items-center justify-center rounded-xl bg-transparent focus:outline-none focus:ring-4 ${buttonClass}`}
        >
          <ChevronLeft aria-hidden="true" size={34} strokeWidth={3} />
        </button>
      )}

      <div className="min-w-0 text-center">
        <div className={`text-4xl font-black leading-tight tracking-normal ${titleClass}`}>Voisk</div>
        {subtitle && (
          <p aria-hidden="true" className={`truncate text-sm font-black ${subtitleClass}`}>
            {subtitle}
          </p>
        )}
      </div>

      <div aria-hidden="true" className="h-12 w-12" />
    </div>
  );
};
