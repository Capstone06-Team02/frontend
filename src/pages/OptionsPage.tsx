import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Check, Mic } from 'lucide-react';
import { AppHeader } from '../components/AppHeader';
import { DEFAULT_CAFE_OPTIONS, getCafeMenuName, type CafeOptionState } from '../constants/cafe';
import { useVoice } from '../hooks/useVoice';
import type { PageWithSpeechProps } from '../types/order';
import {
  encodeCafeOptions,
  parseCafeOptions,
  summarizeCafeOrder,
} from '../utils/cafeOrder';

/** 음성 피드백용 표시 레이블 */
const VOICE_LABEL: Record<string, string> = {
  아이스: '아이스',
  핫: '핫',
  '보통 사이즈': '보통 사이즈',
  '큰 사이즈': '큰 사이즈',
  적게: '얼음 적게',
  보통: '얼음 보통',
  '보통 당도': '보통 당도',
  '덜 달게': '덜 달게',
  기본: '기본 샷',
  '샷 추가': '샷 추가',
  '일회용 컵': '일회용 컵',
  '개인 컵': '개인 컵',
};

const isCompletionCommand = (text: string) =>
  text.includes('선택 완료') ||
  text.includes('완료') ||
  (text.includes('다') && text.includes('됐')) ||
  text.includes('주문할게') ||
  text.includes('이걸로') ||
  text.includes('확인해');

export const OptionsPage = ({ speak }: PageWithSpeechProps) => {
  const searchParams = new URLSearchParams(window.location.search);
  const menuId = searchParams.get('menu') || 'cream-latte';
  const menuName = searchParams.get('name') || getCafeMenuName(menuId);
  const menuParams = new URLSearchParams({
    menu: menuId,
    name: menuName,
  });

  // 뒤로가기 시 선택값 복원
  const initialOptions: CafeOptionState = {
    temperature:
      (searchParams.get('temperature') as CafeOptionState['temperature']) ||
      DEFAULT_CAFE_OPTIONS.temperature,
    size:
      (searchParams.get('size') as CafeOptionState['size']) || DEFAULT_CAFE_OPTIONS.size,
    ice: (searchParams.get('ice') as CafeOptionState['ice']) || DEFAULT_CAFE_OPTIONS.ice,
    sweetness:
      (searchParams.get('sweetness') as CafeOptionState['sweetness']) ||
      DEFAULT_CAFE_OPTIONS.sweetness,
    shot: (searchParams.get('shot') as CafeOptionState['shot']) || DEFAULT_CAFE_OPTIONS.shot,
    cupType:
      (searchParams.get('cupType') as CafeOptionState['cupType']) || DEFAULT_CAFE_OPTIONS.cupType,
  };

  const returnFromConfirm = searchParams.get('returnFromConfirm') === 'true';

  const [options, setOptions] = useState<CafeOptionState>(initialOptions);
  const optionsRef = useRef<CafeOptionState>(initialOptions); // 클로저 stale 방지
  const didAnnounceRef = useRef(false);
  const continuousActiveRef = useRef(false); // 항상 켜진 마이크 세션 추적

  const { isListening, startListening, startContinuousListening, stopListening } = useVoice();

  // options 상태가 바뀔 때마다 ref도 동기화
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const goToConfirm = (nextOptions = optionsRef.current) => {
    window.location.assign(`/confirm?${menuParams.toString()}&${encodeCafeOptions(nextOptions)}`);
  };

  // ── 항상 켜진 마이크 결과 처리 ────────────────────────────────────────────
  const handleVoiceResult = (transcript: string) => {
    // "선택 완료" 명령 감지
    if (isCompletionCommand(transcript)) {
      stopListening();
      continuousActiveRef.current = false;
      speak('네 알겠습니다.', () => goToConfirm());
      return;
    }

    // 옵션 파싱
    const parsed = parseCafeOptions(transcript, optionsRef.current);
    const changed = JSON.stringify(parsed) !== JSON.stringify(optionsRef.current);

    if (changed) {
      stopListening();
      optionsRef.current = parsed;
      setOptions(parsed);
      speak('반영했습니다.', () => {
        if (continuousActiveRef.current) {
          startContinuousListening(handleVoiceResult);
        }
      });
    }
    // 변화 없으면 연속 루프가 자동으로 계속 돌아감
  };

  // 항상 켜진 마이크 시작
  const startAlwaysOnMic = () => {
    continuousActiveRef.current = true;
    startContinuousListening(handleVoiceResult);
  };

  // ── 초기 안내 ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (didAnnounceRef.current) return;
    didAnnounceRef.current = true;

    const timer = setTimeout(() => {
      if (returnFromConfirm) {
        const currentSummaryText = summarizeCafeOrder(menuName, initialOptions);
        speak(
          `현재 선택하신 옵션은 ${currentSummaryText}입니다. 어떤 걸 수정하시겠어요?`,
          startAlwaysOnMic,
        );
      } else {
        speak(
          '현재 기본 옵션은 아이스, 컵 사이즈 보통, 얼음 양 보통이에요. 이외에도 추가로 3개의 옵션이 더 있어요. 옵션을 전부 듣고 싶으면 옵션이라고 말씀해주세요. 빠르게 확인하고 싶으시면 손으로 스와이프하시면서 변경하셔도 되고 옵션 확인 후 음성으로도 변경이 가능해요. 선택을 다 하셨다면 마지막엔 완료 라고 말씀하시면 돼요.',
          startAlwaysOnMic,
        );
      }
    }, 400);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 페이지 언마운트 시 마이크 정리
  useEffect(() => {
    return () => {
      continuousActiveRef.current = false;
      stopListening();
    };
  }, [stopListening]);

  // ── 버튼으로 옵션 선택 시: 마이크 중단 → TTS → 재시작 ──────────────────
  const updateOption = <Key extends keyof CafeOptionState>(
    key: Key,
    value: CafeOptionState[Key],
  ) => {
    stopListening(); // 터치 중엔 마이크 끔
    const nextOptions = { ...optionsRef.current, [key]: value };
    optionsRef.current = nextOptions;
    setOptions(nextOptions);
    const label = VOICE_LABEL[value as string] ?? String(value);
    speak(label, () => {
      if (continuousActiveRef.current) {
        startContinuousListening(handleVoiceResult);
      }
    });
  };

  // ── 음성으로 옵션 한 번에 말하기 버튼 ────────────────────────────────────
  const startOptionVoiceInput = () => {
    if (isListening) return;
    stopListening();
    continuousActiveRef.current = false; // 이 세션 중엔 항상켜진 마이크 비활성

    speak('옵션을 말씀해주세요. 예를 들어 얼음은 적게, 큰 사이즈로 주세요 라고 말할 수 있어요.', () => {
      startListening((transcript) => {
        if (isCompletionCommand(transcript)) {
          speak('네 알겠습니다.', () => goToConfirm());
          return;
        }
        const parsed = parseCafeOptions(transcript, optionsRef.current);
        optionsRef.current = parsed;
        setOptions(parsed);
        speak('반영했습니다.', () => {
          // 완료 버튼 안내 후 항상 켜진 마이크 재시작
          startAlwaysOnMic();
        });
      });
    });
  };

  const currentSummary = summarizeCafeOrder(menuName, options);

  return (
    <div className="min-h-[calc(100dvh+96px)] bg-[radial-gradient(circle_at_top,#eef6ff_0%,#f8fbff_42%,#f4f0e8_100%)] text-slate-950">
      <div className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col px-5 pb-5 pt-[max(24px,env(safe-area-inset-top))]">
        <AppHeader
          onBack={() => {
            stopListening();
            continuousActiveRef.current = false;
            window.location.href = '/';
          }}
          subtitle={menuName}
        />

        {/* 스크린 리더용 상태 알림 */}
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {isListening ? '음성을 듣고 있습니다' : ''}
        </div>

        <section aria-label="현재 선택" className="mb-4">
          <p className="text-sm font-black text-slate-500">현재 선택</p>
          <p className="mt-1 text-2xl font-black leading-tight text-slate-950">{currentSummary}</p>
        </section>

        {/* 직접 선택 영역 — 순서: 온도 → 컵 사이즈 → 얼음 양 → 당도 → 샷 → 컵 종류 */}
        <section className="grid flex-1 content-start gap-3" aria-label="직접 선택 옵션">
          <p className="text-sm font-black text-slate-500">직접 선택</p>

          <OptionGroup title="온도">
            <OptionButton
              label="아이스"
              selected={options.temperature === '아이스'}
              onClick={() => updateOption('temperature', '아이스')}
              onFocus={() => speak(`아이스${options.temperature === '아이스' ? ', 현재 선택됨' : ''}`)}
            />
            <OptionButton
              label="핫"
              selected={options.temperature === '핫'}
              onClick={() => updateOption('temperature', '핫')}
              onFocus={() => speak(`핫${options.temperature === '핫' ? ', 현재 선택됨' : ''}`)}
            />
          </OptionGroup>

          <OptionGroup title="컵 사이즈">
            <OptionButton
              label="보통 사이즈"
              selected={options.size === '보통 사이즈'}
              onClick={() => updateOption('size', '보통 사이즈')}
              onFocus={() => speak(`보통 사이즈${options.size === '보통 사이즈' ? ', 현재 선택됨' : ''}`)}
            />
            <OptionButton
              label="큰 사이즈"
              selected={options.size === '큰 사이즈'}
              onClick={() => updateOption('size', '큰 사이즈')}
              onFocus={() => speak(`큰 사이즈${options.size === '큰 사이즈' ? ', 현재 선택됨' : ''}`)}
            />
          </OptionGroup>

          <OptionGroup title="얼음 양">
            <OptionButton
              label="얼음 보통"
              selected={options.ice === '보통'}
              onClick={() => updateOption('ice', '보통')}
              onFocus={() => speak(`얼음 보통${options.ice === '보통' ? ', 현재 선택됨' : ''}`)}
            />
            <OptionButton
              label="얼음 적게"
              selected={options.ice === '적게'}
              onClick={() => updateOption('ice', '적게')}
              onFocus={() => speak(`얼음 적게${options.ice === '적게' ? ', 현재 선택됨' : ''}`)}
            />
          </OptionGroup>

          <OptionGroup title="당도">
            <OptionButton
              label="보통 당도"
              selected={options.sweetness === '보통 당도'}
              onClick={() => updateOption('sweetness', '보통 당도')}
              onFocus={() => speak(`보통 당도${options.sweetness === '보통 당도' ? ', 현재 선택됨' : ''}`)}
            />
            <OptionButton
              label="덜 달게"
              selected={options.sweetness === '덜 달게'}
              onClick={() => updateOption('sweetness', '덜 달게')}
              onFocus={() => speak(`덜 달게${options.sweetness === '덜 달게' ? ', 현재 선택됨' : ''}`)}
            />
          </OptionGroup>

          <OptionGroup title="샷">
            <OptionButton
              label="기본 샷"
              selected={options.shot === '기본'}
              onClick={() => updateOption('shot', '기본')}
              onFocus={() => speak(`기본 샷${options.shot === '기본' ? ', 현재 선택됨' : ''}`)}
            />
            <OptionButton
              label="샷 추가"
              selected={options.shot === '샷 추가'}
              onClick={() => updateOption('shot', '샷 추가')}
              onFocus={() => speak(`샷 추가${options.shot === '샷 추가' ? ', 현재 선택됨' : ''}`)}
            />
          </OptionGroup>

          <OptionGroup title="컵 종류">
            <OptionButton
              label="일회용 컵"
              selected={options.cupType === '일회용 컵'}
              onClick={() => updateOption('cupType', '일회용 컵')}
              onFocus={() => speak(`일회용 컵${options.cupType === '일회용 컵' ? ', 현재 선택됨' : ''}`)}
            />
            <OptionButton
              label="개인 컵"
              selected={options.cupType === '개인 컵'}
              onClick={() => updateOption('cupType', '개인 컵')}
              onFocus={() => speak(`개인 컵${options.cupType === '개인 컵' ? ', 현재 선택됨' : ''}`)}
            />
          </OptionGroup>
        </section>

        {/* 하단 액션 영역: 마이크(왼쪽 원형) + 선택 완료(오른쪽) */}
        <div className="mt-4 flex items-center gap-3">
          {/* 마이크 버튼 — 하단 고정 (모든 화면 통일) */}
          <button
            type="button"
            onClick={startOptionVoiceInput}
            disabled={isListening}
            aria-label={isListening ? '음성 인식 중입니다' : '옵션을 음성으로 말하기'}
            className={`relative flex h-20 w-20 shrink-0 touch-manipulation items-center justify-center rounded-full transition duration-300 focus:outline-none focus:ring-4 focus:ring-blue-300 focus:ring-offset-2 ${
              isListening
                ? 'bg-rose-100 shadow-[0_0_44px_rgba(244,63,94,0.26)]'
                : 'bg-blue-700 shadow-[0_18px_45px_rgba(29,78,216,0.3)] active:scale-[0.99]'
            }`}
          >
            {isListening && (
              <span className="absolute inset-0 rounded-full bg-rose-400 opacity-10 animate-ping" />
            )}
            <Mic
              aria-hidden="true"
              size={36}
              className={isListening ? 'text-rose-700' : 'text-white'}
            />
          </button>

          {/* 선택 완료 버튼 */}
          <button
            type="button"
            onClick={() => {
              stopListening();
              continuousActiveRef.current = false;
              speak('네 알겠습니다.', () => goToConfirm());
            }}
            onFocus={() => speak('선택 완료 버튼. 주문 내역 확인으로 이동합니다')}
            aria-label="선택 완료. 주문 내역 확인으로 이동"
            className="flex min-h-20 flex-1 items-center justify-center rounded-lg bg-slate-950 text-xl font-black text-white shadow-[0_18px_40px_rgba(15,23,42,0.24)] focus:outline-none focus:ring-4 focus:ring-blue-300"
          >
            선택 완료
          </button>
        </div>
      </div>
    </div>
  );
};

// ── 서브 컴포넌트 ─────────────────────────────────────────────────────────────

type OptionGroupProps = { children: ReactNode; title: string };

const OptionGroup = ({ children, title }: OptionGroupProps) => (
  <section>
    <p className="mb-2 text-sm font-black text-slate-500">{title}</p>
    <div className="grid grid-cols-2 gap-2">{children}</div>
  </section>
);

type OptionButtonProps = {
  label: string;
  onClick: () => void;
  onFocus?: () => void;
  selected: boolean;
};

const OptionButton = ({ label, onClick, onFocus, selected }: OptionButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    onFocus={onFocus}
    aria-pressed={selected}
    aria-label={`${label}${selected ? ' 현재 선택됨' : ''}`}
    className={`flex min-h-16 items-center justify-center gap-2 rounded-lg text-base font-black shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-300 ${
      selected
        ? 'bg-blue-700 text-white shadow-[0_12px_30px_rgba(29,78,216,0.22)]'
        : 'bg-white/80 text-slate-950'
    }`}
  >
    {selected && <Check aria-hidden="true" size={20} />}
    {label}
  </button>
);
