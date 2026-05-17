import { useState } from 'react';
import { ChevronLeft, Contrast, Minus, Plus, Type, Volume2 } from 'lucide-react';
import { useSwipeFocus } from '../hooks/useSwipeFocus';
import type { PageWithSpeechProps } from '../types/order';

export const AccessibilityPage = ({ speak }: PageWithSpeechProps) => {
  const [largeText, setLargeText] = useState(true);
  const [highContrast, setHighContrast] = useState(false);
  const [autoGuide, setAutoGuide] = useState(true);
  const [voiceSpeed, setVoiceSpeed] = useState(1);
  const { assignButtonRef, handleTouchEnd, handleTouchStart } = useSwipeFocus();
  let focusIndex = 0;

  const pageTone = highContrast ? 'bg-black text-white' : 'bg-slate-50 text-slate-950';
  const panelTone = highContrast ? 'border-white bg-black text-white' : 'border-slate-200 bg-white text-slate-950';
  const mutedText = highContrast ? 'text-slate-200' : 'text-slate-500';
  const focusRing = highContrast ? 'focus:ring-yellow-300' : 'focus:ring-sky-300';
  const titleSize = largeText ? 'text-4xl' : 'text-3xl';
  const labelSize = largeText ? 'text-2xl' : 'text-xl';

  const toggleSetting = (name: string, enabled: boolean, update: (value: boolean) => void) => {
    const nextValue = !enabled;
    update(nextValue);
    speak(`${name} ${nextValue ? '켜짐' : '꺼짐'}`);
  };

  const changeVoiceSpeed = (amount: 0.25 | -0.25) => {
    setVoiceSpeed((current) => {
      const next = Math.min(Math.max(current + amount, 0.5), 1.5);
      speak(`음성 속도 ${next.toFixed(2)}배`);
      return next;
    });
  };

  return (
    <main className={`min-h-dvh ${pageTone}`} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <div className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col px-5 pb-6 pt-[max(28px,env(safe-area-inset-top))]">
        <header className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className={`text-sm font-semibold ${highContrast ? 'text-yellow-200' : 'text-sky-700'}`}>접근성 설정</p>
            <h1 className={`mt-1 font-black leading-tight tracking-normal ${titleSize}`}>Voisk</h1>
          </div>
          <button
            type="button"
            ref={(button) => assignButtonRef(button, focusIndex++)}
            onClick={() => {
              window.location.href = '/';
            }}
            onFocus={() => speak('음성 주문 화면으로 돌아가기 버튼')}
            aria-label="음성 주문 화면으로 돌아가기"
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border ${panelTone} focus:outline-none focus:ring-4 ${focusRing}`}
          >
            <ChevronLeft aria-hidden="true" size={28} />
          </button>
        </header>

        <section aria-live="polite" aria-atomic="true" className={`mb-5 rounded-lg border p-4 ${panelTone}`}>
          <p className={`text-sm font-semibold ${mutedText}`}>설정 미리보기</p>
          <p className={`mt-2 font-black leading-snug ${labelSize}`}>선택한 설정에 맞춰 글자와 안내 방식이 바뀝니다.</p>
        </section>

        <section className="grid gap-3" aria-label="접근성 설정 목록">
          <button
            type="button"
            ref={(button) => assignButtonRef(button, focusIndex++)}
            onClick={() => toggleSetting('큰 글자', largeText, setLargeText)}
            onFocus={() => speak(`큰 글자 버튼, 현재 ${largeText ? '켜짐' : '꺼짐'}`)}
            aria-pressed={largeText}
            aria-label={`큰 글자, ${largeText ? '켜짐' : '꺼짐'}`}
            className={`flex min-h-20 w-full items-center justify-between gap-4 rounded-lg border-2 p-5 text-left shadow-sm focus:outline-none focus:ring-4 ${focusRing} ${
              largeText
                ? highContrast
                  ? 'border-yellow-300 bg-zinc-900'
                  : 'border-sky-700 bg-sky-100'
                : `${panelTone} ${highContrast ? 'border-white' : 'border-slate-300'}`
            }`}
          >
            <span>
              <span className={`block text-sm font-semibold ${mutedText}`}>글자 크기</span>
              <span className={`mt-1 block font-black ${labelSize}`}>큰 글자</span>
            </span>
            <Type aria-hidden="true" className="shrink-0" size={30} />
          </button>

          <button
            type="button"
            ref={(button) => assignButtonRef(button, focusIndex++)}
            onClick={() => toggleSetting('고대비 화면', highContrast, setHighContrast)}
            onFocus={() => speak(`고대비 화면 버튼, 현재 ${highContrast ? '켜짐' : '꺼짐'}`)}
            aria-pressed={highContrast}
            aria-label={`고대비 화면, ${highContrast ? '켜짐' : '꺼짐'}`}
            className={`flex min-h-20 w-full items-center justify-between gap-4 rounded-lg border-2 p-5 text-left shadow-sm focus:outline-none focus:ring-4 ${focusRing} ${
              highContrast ? 'border-yellow-300 bg-zinc-900' : 'border-slate-300 bg-white'
            }`}
          >
            <span>
              <span className={`block text-sm font-semibold ${mutedText}`}>화면 대비</span>
              <span className={`mt-1 block font-black ${labelSize}`}>고대비 화면</span>
            </span>
            <Contrast aria-hidden="true" className="shrink-0" size={30} />
          </button>

          <button
            type="button"
            ref={(button) => assignButtonRef(button, focusIndex++)}
            onClick={() => toggleSetting('자동 음성 안내', autoGuide, setAutoGuide)}
            onFocus={() => speak(`자동 음성 안내 버튼, 현재 ${autoGuide ? '켜짐' : '꺼짐'}`)}
            aria-pressed={autoGuide}
            aria-label={`자동 음성 안내, ${autoGuide ? '켜짐' : '꺼짐'}`}
            className={`flex min-h-20 w-full items-center justify-between gap-4 rounded-lg border-2 p-5 text-left shadow-sm focus:outline-none focus:ring-4 ${focusRing} ${
              autoGuide
                ? highContrast
                  ? 'border-yellow-300 bg-zinc-900'
                  : 'border-sky-700 bg-sky-100'
                : `${panelTone} ${highContrast ? 'border-white' : 'border-slate-300'}`
            }`}
          >
            <span>
              <span className={`block text-sm font-semibold ${mutedText}`}>음성 안내</span>
              <span className={`mt-1 block font-black ${labelSize}`}>자동 음성 안내</span>
            </span>
            <Volume2 aria-hidden="true" className="shrink-0" size={30} />
          </button>

          <section className={`rounded-lg border p-4 ${panelTone}`} aria-label="음성 속도 설정">
            <p className={`text-sm font-semibold ${mutedText}`}>음성 속도</p>
            <p className={`mt-1 font-black ${labelSize}`}>{voiceSpeed.toFixed(2)}배</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                ref={(button) => assignButtonRef(button, focusIndex++)}
                onClick={() => changeVoiceSpeed(-0.25)}
                onFocus={() => speak(`음성 속도 느리게 버튼, 현재 ${voiceSpeed.toFixed(2)}배`)}
                aria-label={`음성 속도 느리게, 현재 ${voiceSpeed.toFixed(2)}배`}
                className={`flex min-h-14 items-center justify-center rounded-lg border font-black focus:outline-none focus:ring-4 ${focusRing} ${panelTone}`}
              >
                <Minus aria-hidden="true" size={28} />
              </button>
              <button
                type="button"
                ref={(button) => assignButtonRef(button, focusIndex++)}
                onClick={() => changeVoiceSpeed(0.25)}
                onFocus={() => speak(`음성 속도 빠르게 버튼, 현재 ${voiceSpeed.toFixed(2)}배`)}
                aria-label={`음성 속도 빠르게, 현재 ${voiceSpeed.toFixed(2)}배`}
                className={`flex min-h-14 items-center justify-center rounded-lg border font-black focus:outline-none focus:ring-4 ${focusRing} ${panelTone}`}
              >
                <Plus aria-hidden="true" size={28} />
              </button>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
};
