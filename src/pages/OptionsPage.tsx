import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Check, ChevronLeft, Mic } from 'lucide-react';
import { DEFAULT_CAFE_OPTIONS, getCafeMenuName, type CafeOptionState } from '../constants/cafe';
import { useVoice } from '../hooks/useVoice';
import type { PageWithSpeechProps } from '../types/order';
import { encodeCafeOptions, parseCafeOptions, summarizeCafeOrder } from '../utils/cafeOrder';

export const OptionsPage = ({ speak }: PageWithSpeechProps) => {
  const searchParams = new URLSearchParams(window.location.search);
  const menuId = searchParams.get('menu') || 'cream-latte';
  const menuName = getCafeMenuName(menuId);
  const [options, setOptions] = useState<CafeOptionState>(DEFAULT_CAFE_OPTIONS);
  const didAnnounceRef = useRef(false);
  const { isListening, startListening } = useVoice();

  const goToConfirm = (nextOptions = options) => {
    window.location.assign(`/confirm?menu=${menuId}&${encodeCafeOptions(nextOptions)}`);
  };

  const startOptionVoiceInput = () => {
    if (isListening) return;

    speak('옵션을 말씀해주세요. 예를 들어 얼음은 적게, 컵 사이즈는 큰 걸로 주세요 라고 말할 수 있습니다.', () => {
      startListening((transcript) => {
        const parsedOptions = parseCafeOptions(transcript, options);
        const summary = summarizeCafeOrder(menuName, parsedOptions);
        setOptions(parsedOptions);
        speak(`${summary}로 반영했습니다. 최종 확인 화면으로 이동합니다.`, () => goToConfirm(parsedOptions));
      });
    });
  };

  const updateOption = <Key extends keyof CafeOptionState>(key: Key, value: CafeOptionState[Key]) => {
    const nextOptions = { ...options, [key]: value };
    setOptions(nextOptions);
    speak(`${value} 선택`);
  };

  const currentSummary = summarizeCafeOrder(menuName, options);

  useEffect(() => {
    if (didAnnounceRef.current) return;

    didAnnounceRef.current = true;
    speak(
      `현재 선택은 ${currentSummary}입니다. 여기서 어떤 걸 바꿔드릴까요? 음성으로 말씀하시거나 손으로도 조작하실 수 있어요. 한 번 스와이프하면 온도부터 시작해요.`,
    );
  }, [currentSummary, speak]);

  return (
    <main className="min-h-dvh bg-[radial-gradient(circle_at_top,#eef6ff_0%,#f8fbff_42%,#f4f0e8_100%)] text-slate-950">
      <div className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col px-5 pb-5 pt-[max(24px,env(safe-area-inset-top))]">
        <header className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black text-slate-500">옵션 선택</p>
            <h1 className="text-3xl font-black leading-tight tracking-normal text-blue-700">{menuName}</h1>
          </div>
          <button
            type="button"
            onClick={() => {
              window.location.href = '/';
            }}
            onFocus={() => speak('음성 주문 화면으로 돌아가기 버튼')}
            aria-label="음성 주문 화면으로 돌아가기"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-white shadow-[0_12px_30px_rgba(15,23,42,0.16)] focus:outline-none focus:ring-4 focus:ring-blue-300"
          >
            <ChevronLeft aria-hidden="true" size={28} />
          </button>
        </header>

        <section aria-label="선택된 옵션" className="mb-4">
          <p className="text-sm font-black text-slate-500">현재 선택</p>
          <p className="mt-1 text-2xl font-black leading-tight text-slate-950">{currentSummary}</p>
        </section>

        <button
          type="button"
          onClick={startOptionVoiceInput}
          disabled={isListening}
          aria-label="옵션을 음성으로 말하기"
          className={`mb-4 flex min-h-24 w-full items-center justify-center gap-4 rounded-lg text-2xl font-black shadow-[0_24px_60px_rgba(29,78,216,0.3)] focus:outline-none focus:ring-4 focus:ring-blue-300 ${
            isListening ? 'bg-rose-100 text-rose-800' : 'bg-blue-700 text-white'
          }`}
        >
          <Mic aria-hidden="true" size={34} />
          {isListening ? '옵션 듣는 중' : '옵션 말하기'}
        </button>

        <section className="grid flex-1 content-start gap-3" aria-label="직접 선택 옵션">
          <p className="text-sm font-black text-slate-500">직접 선택</p>
          <OptionGroup title="온도">
            <OptionButton
              label="아이스"
              selected={options.temperature === '아이스'}
              onClick={() => updateOption('temperature', '아이스')}
            />
            <OptionButton
              label="핫"
              selected={options.temperature === '핫'}
              onClick={() => updateOption('temperature', '핫')}
            />
          </OptionGroup>

          <OptionGroup title="얼음 양">
            <OptionButton label="얼음 보통" selected={options.ice === '보통'} onClick={() => updateOption('ice', '보통')} />
            <OptionButton label="얼음 적게" selected={options.ice === '적게'} onClick={() => updateOption('ice', '적게')} />
          </OptionGroup>

          <OptionGroup title="컵 사이즈">
            <OptionButton
              label="보통 사이즈"
              selected={options.size === '보통 사이즈'}
              onClick={() => updateOption('size', '보통 사이즈')}
            />
            <OptionButton
              label="큰 사이즈"
              selected={options.size === '큰 사이즈'}
              onClick={() => updateOption('size', '큰 사이즈')}
            />
          </OptionGroup>
        </section>

        <button
          type="button"
          onClick={() => {
            speak(`${currentSummary}로 확인하겠습니다.`, () => goToConfirm());
          }}
          onFocus={() => speak('선택한 옵션으로 확인하기 버튼')}
          aria-label="선택한 옵션으로 확인하기"
          className="mt-4 flex min-h-16 w-full items-center justify-center rounded-lg bg-slate-950 text-xl font-black text-white shadow-[0_18px_40px_rgba(15,23,42,0.24)] focus:outline-none focus:ring-4 focus:ring-blue-300"
        >
          선택 완료
        </button>
      </div>
    </main>
  );
};

type OptionGroupProps = {
  children: ReactNode;
  title: string;
};

const OptionGroup = ({ children, title }: OptionGroupProps) => (
  <section>
    <p className="mb-2 text-sm font-black text-slate-500">{title}</p>
    <div className="grid grid-cols-2 gap-2">{children}</div>
  </section>
);

type OptionButtonProps = {
  label: string;
  onClick: () => void;
  selected: boolean;
};

const OptionButton = ({ label, onClick, selected }: OptionButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={selected}
    aria-label={`${label}${selected ? ', 선택됨' : ''}`}
    className={`flex min-h-16 items-center justify-center gap-2 rounded-lg text-base font-black shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-300 ${
      selected ? 'bg-blue-700 text-white shadow-[0_12px_30px_rgba(29,78,216,0.22)]' : 'bg-white/80 text-slate-950'
    }`}
  >
    {selected && <Check aria-hidden="true" size={20} />}
    {label}
  </button>
);
