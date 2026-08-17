import { useState } from 'react';
import { Contrast, Minus, Plus, Type, Volume2 } from 'lucide-react';
import { AppHeader } from '../components/AppHeader';
import { useAccessibility } from '../hooks/useAccessibility';
import type { PageWithSpeechProps } from '../types/order';

// 켜진 항목은 채우고, 꺼진 항목은 테두리만 남긴다. 색 차이만으로 구분하지
// 않아야 색을 구별하기 어려운 사용자도 상태를 알 수 있다.
const TOGGLE_BASE =
  'flex min-h-0 w-full items-center justify-between gap-4 rounded-lg border-[3px] border-line px-4 py-3 text-left shadow-sm focus:outline-none focus:ring-4 focus:ring-focusring';
const TOGGLE_ON = 'bg-strong text-on-strong';
const TOGGLE_OFF = 'bg-surface text-ink';
const PANEL = 'rounded-lg border-[3px] border-line bg-surface px-4 py-3 text-ink';

export const AccessibilityPage = ({ speak }: PageWithSpeechProps) => {
  const { highContrast, largeText, setHighContrast, setLargeText } = useAccessibility();
  const [autoGuide, setAutoGuide] = useState(true);
  const [voiceSpeed, setVoiceSpeed] = useState(1);

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
    <div className="h-[calc(100dvh+96px)] overflow-hidden bg-page text-ink">
      <div className="mx-auto flex h-dvh w-full max-w-[440px] flex-col px-5 pb-4 pt-[max(24px,env(safe-area-inset-top))]">
        <AppHeader
          onBack={() => {
            window.location.href = '/';
          }}
          subtitle="접근성 설정"
        />

        <section aria-live="polite" aria-atomic="true" className={`mb-3 ${PANEL}`}>
          <p className="text-base font-black text-muted">설정 미리보기</p>
          <p className="text-xl font-black leading-snug">
            선택한 설정에 맞춰 글자와 안내 방식이 바뀝니다.
          </p>
        </section>

        <section className="grid flex-1 gap-2" aria-label="접근성 설정 목록">
          <button
            type="button"
            onClick={() => {
              window.location.href = '/voice';
            }}
            onFocus={() => speak('음성 안내 목소리 선택 화면으로 이동 버튼')}
            aria-label="음성 안내 목소리 선택 화면으로 이동"
            className={`${TOGGLE_BASE} ${TOGGLE_OFF}`}
          >
            <span>
              <span className="block text-base font-black text-muted">목소리</span>
              <span className="mt-1 block text-xl font-black">음성 안내 목소리</span>
            </span>
            <Volume2 aria-hidden="true" className="shrink-0" size={30} />
          </button>

          <button
            type="button"
            onClick={() => toggleSetting('큰 글자', largeText, setLargeText)}
            onFocus={() => speak(`큰 글자 버튼, 현재 ${largeText ? '켜짐' : '꺼짐'}`)}
            aria-pressed={largeText}
            aria-label={`큰 글자 ${largeText ? '켜짐' : '꺼짐'}`}
            className={`${TOGGLE_BASE} ${largeText ? TOGGLE_ON : TOGGLE_OFF}`}
          >
            <span>
              <span
                className={`block text-base font-black ${largeText ? 'text-on-strong' : 'text-muted'}`}
              >
                글자 크기
              </span>
              <span className="mt-1 block text-xl font-black">큰 글자</span>
            </span>
            <Type aria-hidden="true" className="shrink-0" size={30} />
          </button>

          <button
            type="button"
            onClick={() => toggleSetting('고대비 화면', highContrast, setHighContrast)}
            onFocus={() => speak(`고대비 화면 버튼, 현재 ${highContrast ? '켜짐' : '꺼짐'}`)}
            aria-pressed={highContrast}
            aria-label={`고대비 화면 ${highContrast ? '켜짐' : '꺼짐'}`}
            className={`${TOGGLE_BASE} ${highContrast ? TOGGLE_ON : TOGGLE_OFF}`}
          >
            <span>
              <span
                className={`block text-base font-black ${highContrast ? 'text-on-strong' : 'text-muted'}`}
              >
                화면 대비
              </span>
              <span className="mt-1 block text-xl font-black">고대비 화면</span>
            </span>
            <Contrast aria-hidden="true" className="shrink-0" size={30} />
          </button>

          <button
            type="button"
            onClick={() => toggleSetting('자동 음성 안내', autoGuide, setAutoGuide)}
            onFocus={() => speak(`자동 음성 안내 버튼, 현재 ${autoGuide ? '켜짐' : '꺼짐'}`)}
            aria-pressed={autoGuide}
            aria-label={`자동 음성 안내 ${autoGuide ? '켜짐' : '꺼짐'}`}
            className={`${TOGGLE_BASE} ${autoGuide ? TOGGLE_ON : TOGGLE_OFF}`}
          >
            <span>
              <span
                className={`block text-base font-black ${autoGuide ? 'text-on-strong' : 'text-muted'}`}
              >
                음성 안내
              </span>
              <span className="mt-1 block text-xl font-black">자동 음성 안내</span>
            </span>
            <Volume2 aria-hidden="true" className="shrink-0" size={30} />
          </button>

          <section className={PANEL} aria-label="음성 속도 설정">
            <p className="text-base font-black text-muted">음성 속도</p>
            <p className="mt-1 text-xl font-black">{voiceSpeed.toFixed(2)}배</p>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => changeVoiceSpeed(-0.25)}
                onFocus={() => speak(`음성 속도 느리게 버튼, 현재 ${voiceSpeed.toFixed(2)}배`)}
                aria-label={`음성 속도 느리게 현재 ${voiceSpeed.toFixed(2)}배`}
                className="flex min-h-12 items-center justify-center rounded-lg border-[3px] border-line bg-surface font-black text-ink focus:outline-none focus:ring-4 focus:ring-focusring"
              >
                <Minus aria-hidden="true" size={28} />
              </button>
              <button
                type="button"
                onClick={() => changeVoiceSpeed(0.25)}
                onFocus={() => speak(`음성 속도 빠르게 버튼, 현재 ${voiceSpeed.toFixed(2)}배`)}
                aria-label={`음성 속도 빠르게 현재 ${voiceSpeed.toFixed(2)}배`}
                className="flex min-h-12 items-center justify-center rounded-lg border-[3px] border-line bg-surface font-black text-ink focus:outline-none focus:ring-4 focus:ring-focusring"
              >
                <Plus aria-hidden="true" size={28} />
              </button>
            </div>
          </section>
        </section>
      </div>
    </div>
  );
};
