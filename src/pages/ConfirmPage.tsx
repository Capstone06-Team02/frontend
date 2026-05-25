import { useEffect, useRef } from 'react';
import { Mic } from 'lucide-react';
import { AppHeader } from '../components/AppHeader';
import { getCafeMenuName } from '../constants/cafe';
import { useVoice } from '../hooks/useVoice';
import type { PageWithSpeechProps } from '../types/order';
import { encodeCafeOptions, readCafeOptions, summarizeCafeOrder } from '../utils/cafeOrder';

export const ConfirmPage = ({ speak }: PageWithSpeechProps) => {
  const searchParams = new URLSearchParams(window.location.search);
  const menuId = searchParams.get('menu') || 'cream-latte';
  const menuName = searchParams.get('name') || getCafeMenuName(menuId);
  const menuParams = new URLSearchParams({
    menu: menuId,
    name: menuName,
  });
  const options = readCafeOptions(searchParams);
  const summary = summarizeCafeOrder(menuName, options);
  const { isListening, startListening } = useVoice();
  const didAnnounceRef = useRef(false);

  // options URL 파라미터를 유지해서 complete 페이지로 전달
  const completeOrder = () => {
    window.location.href = `/complete?${menuParams.toString()}&${encodeCafeOptions(options)}`;
  };

  // 뒤로가기: 선택했던 options를 URL에 담아 복원 + 수정 모드 플래그
  const goBackToOptions = () => {
    window.location.href = `/options?${menuParams.toString()}&${encodeCafeOptions(options)}&returnFromConfirm=true`;
  };

  const listenForConfirm = () => {
    if (isListening) return;

    startListening((transcript) => {
      if (
        transcript.includes('네') ||
        transcript.includes('맞') ||
        transcript.includes('응') ||
        transcript.includes('확인') ||
        transcript.includes('좋아')
      ) {
        completeOrder();
        return;
      }

      if (transcript.includes('수정') || transcript.includes('변경') || transcript.includes('취소')) {
        speak('옵션 화면으로 돌아갈게요.', goBackToOptions);
        return;
      }

      if (transcript.includes('다시') || transcript.includes('아니')) {
        replayAndListen();
        return;
      }

      // 인식했지만 의도가 불명확할 때
      speak('맞으시면 맞습니다, 수정하고 싶으시면 수정, 다시 듣고 싶으시면 다시 라고 말씀해주세요.', listenForConfirm);
    });
  };

  const replayAndListen = () => {
    speak(`${summary}. 주문 내용이 맞으시면 맞습니다 라고 말씀해주세요.`, listenForConfirm);
  };

  // 페이지 진입 즉시 주문 내용 안내 + 자동으로 음성 듣기 시작
  useEffect(() => {
    if (didAnnounceRef.current) return;
    didAnnounceRef.current = true;

    const timer = setTimeout(() => {
      speak(
        `주문 내역 확인해드릴게요. ${summary}. 수정하고 싶으시면 수정, 다시 듣고 싶으시면 다시, 이대로 주문하고 싶으시면 맞습니다 라고 말씀해주세요.`,
        listenForConfirm,
      );
    }, 400);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-[calc(100dvh+96px)] bg-[radial-gradient(circle_at_top,#eef6ff_0%,#f8fbff_42%,#f4f0e8_100%)] text-slate-950">
      <div className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col px-5 pb-5 pt-[max(24px,env(safe-area-inset-top))]">
        <AppHeader
          onBack={goBackToOptions}
          subtitle="최종 확인"
        />

        {/* 스크린 리더용 상태 알림 */}
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {isListening ? '음성을 듣고 있습니다' : ''}
        </div>

        <section aria-label="주문 내용" className="flex flex-1 flex-col justify-center">
          <p className="text-sm font-black text-slate-500">주문 내용</p>
          <div className="mt-3 flex flex-col gap-2">
            {summary.split(', ').map((part, i) => (
              <p
                key={i}
                className={
                  i === 0
                    ? 'text-4xl font-black leading-tight text-slate-950'
                    : 'text-2xl font-black leading-tight text-slate-500'
                }
              >
                {part}
              </p>
            ))}
          </div>
        </section>

        {/* 다시 듣기 버튼 (retry 용도) */}
        <button
          type="button"
          onClick={replayAndListen}
          disabled={isListening}
          onFocus={() => speak('주문 내용 다시 듣기 버튼')}
          aria-label={isListening ? '음성 인식 중입니다' : '주문 내용 다시 듣기'}
          className={`mt-5 flex min-h-16 w-full items-center justify-center gap-3 rounded-lg text-xl font-black shadow-[0_18px_45px_rgba(29,78,216,0.22)] focus:outline-none focus:ring-4 focus:ring-blue-300 ${
            isListening ? 'bg-rose-100 text-rose-800' : 'bg-blue-700 text-white'
          }`}
        >
          <Mic aria-hidden="true" size={26} />
          {isListening ? '듣는 중' : '수정 / 다시'}
        </button>

        <button
          type="button"
          onClick={completeOrder}
          onFocus={() => speak('맞습니다. 주문 확정 버튼')}
          aria-label="맞습니다. 주문을 확정합니다"
          className="mt-3 flex min-h-16 w-full items-center justify-center rounded-lg bg-slate-950 text-xl font-black text-white shadow-[0_18px_40px_rgba(15,23,42,0.24)] focus:outline-none focus:ring-4 focus:ring-blue-300"
        >
          맞습니다
        </button>
      </div>
    </div>
  );
};
