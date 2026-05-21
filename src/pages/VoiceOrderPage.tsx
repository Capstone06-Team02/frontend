import { useRef, useState } from 'react';
import { AudioLines, Mic } from 'lucide-react';
import { sendOrderText } from '../api/order';
import { getCafeMenuIdByText, getCafeMenuName, RECOMMENDED_MENUS } from '../constants/cafe';
import { useVoice } from '../hooks/useVoice';
import type { OrderApiResponse } from '../types/order';
import { wantsRecommendation } from '../utils/cafeOrder';
import { normalizeOrderText } from '../utils/voice';

type VoiceFlowStep = 'idle' | 'recommendation';

const INITIAL_VOICE_GUIDE =
  '마이크를 켭니다. 마실 메뉴를 정하지 못하셨다면 추천해달라고 말씀해주세요. 도움이 필요하면 안내 다시 듣기, 도움말, 접근성 버튼을 사용할 수 있습니다.';

export const VoiceOrderPage = () => {
  const [hasActivated, setHasActivated] = useState(false);
  const [flowStep, setFlowStep] = useState<VoiceFlowStep>('idle');
  const [statusLabel, setStatusLabel] = useState('대기 중');
  const flowStepRef = useRef<VoiceFlowStep>('idle');
  const sessionIdRef = useRef<string | null>(null);
  const { isListening, speak, startListening } = useVoice();

  const updateFlowStep = (nextStep: VoiceFlowStep) => {
    flowStepRef.current = nextStep;
    setFlowStep(nextStep);
  };

  const continueConversation = (data: OrderApiResponse) => {
    setTimeout(() => {
      if (data.slotsComplete === false) {
        handleStart();
      } else if (data.slotsComplete === true && data.intent === 'ORDER') {
        handleStart();
      }
    }, 300);
  };

  const moveToOptions = (menuId: string) => {
    const menuName = getCafeMenuName(menuId);
    setStatusLabel('메뉴 선택 완료');
    speak(`${menuName}로 선택했습니다. 이제 옵션을 정해볼게요.`, () => {
      window.location.assign(`/options?menu=${menuId}`);
    });
  };

  const processOrder = async (input: string) => {
    const normalizedInput = normalizeOrderText(input);
    const selectedMenuId = getCafeMenuIdByText(normalizedInput);

    if (flowStepRef.current === 'recommendation' && selectedMenuId) {
      moveToOptions(selectedMenuId);
      return;
    }

    if (flowStepRef.current === 'recommendation' && !selectedMenuId) {
      const retryMessage = '슈크림 라떼 또는 말차 라떼 중에서 말씀해주세요.';
      setStatusLabel('추천 메뉴 선택 중');
      speak(retryMessage, handleStart);
      return;
    }

    if (wantsRecommendation(normalizedInput)) {
      const message = '추천 드리는 메뉴는 슈크림 라떼와 말차 라떼가 있어요. 슈크림 라떼 또는 말차 라떼라고 말씀해주세요.';
      updateFlowStep('recommendation');
      setStatusLabel('추천 메뉴 선택 중');
      speak(message, handleStart);
      return;
    }

    if (selectedMenuId) {
      moveToOptions(selectedMenuId);
      return;
    }

    try {
      const data: OrderApiResponse = await sendOrderText(normalizedInput, sessionIdRef.current);
      const botMessage = data.response || '다시 한 번 말씀해주세요.';

      if (data.sessionId) {
        sessionIdRef.current = data.sessionId;
      }

      setStatusLabel(data.slotsComplete ? '주문 내용 확인 중' : '추가 정보 확인 중');
      speak(botMessage, () => continueConversation(data));
    } catch (error) {
      console.error('에러 발생:', error);
      setStatusLabel('연결 오류');
      speak('서버와 연결할 수 없습니다.');
    }
  };

  const handleStart = () => {
    if (isListening) return;

    setStatusLabel(flowStepRef.current === 'recommendation' ? '추천 메뉴 듣는 중' : '음성 듣는 중');
    startListening((transcript: string) => {
      processOrder(transcript);
    });
  };

  const handleActivateVoiceOrder = () => {
    if (isListening) return;

    if (!hasActivated) {
      setHasActivated(true);
      speak(INITIAL_VOICE_GUIDE, handleStart);
      return;
    }

    handleStart();
  };

  const handleReplayGuide = () => {
    speak(INITIAL_VOICE_GUIDE);
  };

  return (
    <main
      className="min-h-dvh bg-[radial-gradient(circle_at_top,#eaf8ff_0%,#f8fbff_38%,#f4f0e8_100%)] text-slate-950"
      onClick={handleActivateVoiceOrder}
    >
      <div className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col px-5 pb-6 pt-[max(28px,env(safe-area-inset-top))]">
        <header>
          <div>
            <p className="text-sm font-black text-slate-500">Voice + Kiosk</p>
            <h1 className="text-4xl font-black leading-tight tracking-normal text-blue-700">Voisk</h1>
          </div>
        </header>

        <section className="mt-5 px-1">
          <p className="text-sm font-black text-slate-500">현재 단계</p>
          <p className="mt-1 text-xl font-black leading-snug text-slate-950">{statusLabel}</p>
        </section>

        <div className="flex flex-1 flex-col pb-4 pt-4">
          <div className="flex flex-1 items-center justify-center">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                handleActivateVoiceOrder();
              }}
              disabled={isListening}
              aria-label={isListening ? '음성 인식 중입니다' : '음성 주문 시작. 한 번 누르면 마이크가 켜집니다'}
              className={`relative mx-auto flex h-[17.5rem] w-[17.5rem] shrink-0 items-center justify-center rounded-full transition duration-300 focus:outline-none focus:ring-4 focus:ring-blue-300 focus:ring-offset-4 ${
                isListening
                  ? 'border-rose-200 bg-rose-100 shadow-[0_0_54px_rgba(244,63,94,0.36)]'
                  : 'bg-blue-700 shadow-[0_24px_70px_rgba(29,78,216,0.34)] active:scale-95'
              }`}
            >
              {isListening && <span className="absolute inset-0 rounded-full bg-rose-400 opacity-20 animate-ping" />}
              {isListening ? (
                <AudioLines aria-hidden="true" size={118} className="text-rose-700" />
              ) : (
                <Mic aria-hidden="true" size={118} className="text-white" />
              )}
            </button>
          </div>

          {flowStep === 'idle' && (
            <section aria-label="보조 기능" className="w-full px-1 py-1 text-slate-950">
              <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  handleReplayGuide();
                }}
                onFocus={() => speak('음성 안내 다시 듣기 버튼')}
                aria-label="음성 안내 다시 듣기"
                className="min-h-16 rounded-lg bg-slate-950 px-2 text-sm font-black text-white shadow-[0_12px_30px_rgba(15,23,42,0.16)] focus:outline-none focus:ring-4 focus:ring-blue-300"
              >
                안내 다시 듣기
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  window.location.href = '/help';
                }}
                onFocus={() => speak('도움말 화면으로 이동 버튼')}
                aria-label="도움말 화면으로 이동"
                className="min-h-16 rounded-lg bg-slate-950 px-2 text-sm font-black text-white shadow-[0_12px_30px_rgba(15,23,42,0.16)] focus:outline-none focus:ring-4 focus:ring-blue-300"
              >
                도움말
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  window.location.href = '/accessibility';
                }}
                onFocus={() => speak('접근성 설정으로 이동 버튼')}
                aria-label="접근성 설정으로 이동"
                className="min-h-16 rounded-lg bg-slate-950 px-2 text-sm font-black text-white shadow-[0_12px_30px_rgba(15,23,42,0.16)] focus:outline-none focus:ring-4 focus:ring-blue-300"
              >
                접근성
              </button>
              </div>
            </section>
          )}

          {flowStep === 'recommendation' && (
            <section className="grid w-full gap-3" aria-label="추천 메뉴 선택">
              {RECOMMENDED_MENUS.map((menu) => (
                <button
                  key={menu.id}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    moveToOptions(menu.id);
                  }}
                  onFocus={() => speak(`${menu.name}. ${menu.description}`)}
                  aria-label={`${menu.name}. ${menu.description}`}
                  className="min-h-20 rounded-lg bg-slate-950 px-5 py-4 text-left text-xl font-black text-white shadow-[0_14px_36px_rgba(15,23,42,0.18)] focus:outline-none focus:ring-4 focus:ring-blue-300"
                >
                  {menu.name}
                </button>
              ))}
            </section>
          )}
        </div>
      </div>
    </main>
  );
};
