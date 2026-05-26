import { useEffect, useRef, useState, type RefObject } from 'react';
import { BookOpen, Coffee, Lightbulb, Mic } from 'lucide-react';
import { AppHeader } from '../components/AppHeader';
import { CompletePage } from './CompletePage';
import {
  cacheRestaurantMenus,
  fetchRecommendations,
  getDefaultRestaurantId,
  sendOrderText,
} from '../api/order';
import { useVoice } from '../hooks/useVoice';
import type { MenuCacheResponse, MenuInfo, OrderApiResponse } from '../types/order';
import { wantsRecommendation } from '../utils/cafeOrder';
import { formatPrice } from '../utils/format';
import { normalizeOrderText } from '../utils/voice';

type ScreenMode = 'home' | 'menu-board' | 'order-dialog';
type DialogStep = 'menu' | 'quantity' | 'option' | 'confirm' | 'complete' | 'continue';
type ViewSnapshot = {
  lastResponse: OrderApiResponse | null;
  mode: ScreenMode;
  sessionId: string | null;
};
type SubmitOrderOptions = {
  preserveInput?: boolean;
};

type VoiceControlsProps = {
  disabled?: boolean;
  guideRef?: RefObject<HTMLElement | null>;
  isListening: boolean;
  micRef?: RefObject<HTMLButtonElement | null>;
  onMicClick: () => void;
};

type HomeAction = {
  description: string;
  icon: typeof BookOpen;
  label: string;
  speechInput: string;
};

const RESTAURANT_ID = getDefaultRestaurantId();

const HOME_ACTIONS: HomeAction[] = [
  {
    label: '메뉴판',
    speechInput: '메뉴판 보여줘',
    description: '현재 주문 가능한 전체 메뉴를 확인합니다.',
    icon: BookOpen,
  },
  {
    label: '메뉴 추천',
    speechInput: '메뉴 추천',
    description: '사용자 취향에 맞게 메뉴를 추천해드립니다.',
    icon: Lightbulb,
  },
  {
    label: '즉시 주문',
    speechInput: '메뉴 주문',
    description: '메뉴를 즉시 음성으로 주문하실 수 있습니다.',
    icon: Coffee,
  },
];

const getReplies = (data: OrderApiResponse | null) => data?.quickReplies?.filter(Boolean) ?? [];

const getQuickReplyVoiceOverLabel = (reply: string) => {
  if (reply === '핫') return '뜨겁게';
  if (reply === '아이스') return '차갑게';
  return reply;
};

const shouldStartFreshSession = (input: string) =>
  wantsRecommendation(input) || input.includes('메뉴 주문') || input.includes('처음');

const isFinalCompleteResponse = (data: OrderApiResponse) => {
  const response = data.response ?? '';
  return (
    data.intent === 'CONFIRM' &&
    getReplies(data).length === 0 &&
    (response.includes('주문 완료') || response.includes('완료되었습니다') || response.includes('나올게요'))
  );
};

const getDialogStep = (data: OrderApiResponse | null): DialogStep => {
  const replies = getReplies(data);
  const response = data?.response ?? '';
  const hasMenu = Boolean(data?.slots?.menu);
  const hasQuantity = Boolean(data?.slots?.quantity);
  const hasOptionSlots = Boolean(data?.slots?.optionSlots?.length);
  const onlyConfirmReplies =
    replies.length > 0 &&
    replies.every((reply) => ['네', '아니요', '아니오', '맞습니다', '확인'].includes(reply));

  if (data && isFinalCompleteResponse(data)) return 'complete';
  if (!hasMenu) return 'menu';
  if (!hasQuantity) return 'quantity';
  if (
    hasOptionSlots ||
    response.includes('옵션') ||
    response.includes('온도') ||
    response.includes('사이즈') ||
    response.includes('당도') ||
    response.includes('얼음')
  ) return 'option';
  if (onlyConfirmReplies || data?.slotsComplete) return 'confirm';
  return 'continue';
};

const STEP_TITLE: Record<DialogStep, string> = {
  menu: '메뉴 선택',
  quantity: '수량 선택',
  option: '옵션 선택',
  confirm: '주문 확인',
  complete: '주문 완료',
  continue: '주문 진행',
};

const getSelectedOptionLabels = (data: OrderApiResponse | null) =>
  data?.slots?.optionSlots
    ?.map((slot) => {
      const selectedCandidates = slot.candidates
        ?.filter((candidate) => candidate.selected)
        .map((candidate) =>
          candidate.defaultQuantity && candidate.defaultQuantity > 1
            ? `${candidate.name} ${candidate.defaultQuantity}개`
            : candidate.name,
        ) ?? [];
      const selected = selectedCandidates.length > 0 ? selectedCandidates.join(', ') : slot.selected;
      return selected ? `${slot.name} ${selected}` : null;
    })
    .filter(Boolean) ?? [];

const VoiceControls = ({ disabled = false, guideRef, isListening, micRef, onMicClick }: VoiceControlsProps) => {
  const replayGuide = () => {
    window.setTimeout(() => guideRef?.current?.focus(), 50);
  };

  return (
    <div className="mb-4 grid grid-cols-2 gap-3">
      <button
        ref={micRef}
        type="button"
        onClick={onMicClick}
        disabled={disabled}
        aria-label="마이크"
        className={`flex min-h-14 items-center justify-center gap-2 rounded-xl px-4 text-xl font-black shadow-[0_12px_28px_rgba(15,23,42,0.16)] focus:outline-none focus:ring-4 focus:ring-blue-300 active:scale-[0.99] ${
          isListening
            ? 'bg-rose-100 text-rose-700'
            : 'bg-blue-700 text-white'
        }`}
      >
        <Mic aria-hidden="true" size={24} />
        마이크
      </button>
      <button
        type="button"
        onClick={replayGuide}
        aria-label="다시 듣기"
        className="flex min-h-14 items-center justify-center rounded-xl bg-slate-950 px-4 text-xl font-black text-white shadow-[0_12px_28px_rgba(15,23,42,0.16)] focus:outline-none focus:ring-4 focus:ring-blue-300 active:scale-[0.99]"
      >
        다시 듣기
      </button>
    </div>
  );
};

export const VoiceOrderPage = () => {
  const [mode, setMode] = useState<ScreenMode>('home');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [menuCache, setMenuCache] = useState<MenuCacheResponse | null>(null);
  const [lastResponse, setLastResponse] = useState<OrderApiResponse | null>(null);
  const [completeResponse, setCompleteResponse] = useState<OrderApiResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReplyLocked, setIsReplyLocked] = useState(false);
  // const [micAnnouncement, setMicAnnouncement] = useState('');
  // 수량 단계 카운터: 사용자가 +/- 로 조정 중인 임시 값. 확인 누르면 백엔드 전송.
  const [quantityDraft, setQuantityDraft] = useState(1);

  const unlockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasInitializedMicRef = useRef(false);   // 마이크 권한 최초 요청 여부
  const micInitializedRef = useRef(false);       // announcement 활성화 여부
  const firstReplyRef = useRef<HTMLButtonElement>(null);
  const micButtonRef = useRef<HTMLButtonElement>(null);
  const currentSelectionRef = useRef<HTMLDivElement>(null);
  const homeGuideRef = useRef<HTMLParagraphElement>(null);
  const responseGuideRef = useRef<HTMLParagraphElement>(null);
  const viewHistoryRef = useRef<ViewSnapshot[]>([]);

  const { isListening, speak, startToggleListening, stopToggleListening } = useVoice();

  // ── 마이크 상태 announcement: 실제로 켜진/꺼진 후에만 읽힘 ──────────────────
  useEffect(() => {
    if (!micInitializedRef.current) {
      if (isListening) micInitializedRef.current = true;
      return;
    }
    // setMicAnnouncement(isListening ? '마이크 켜짐' : '마이크 꺼짐');
  }, [isListening]);

  // ── 수량 선택 화면: 메뉴명 카드에 포커스 ────────────────────────────────────
  const dialogStep = getDialogStep(lastResponse);
  const quickReplies = lastResponse?.quickReplies?.filter(Boolean) ?? [];
  const selectedMenu = lastResponse?.slots?.menu;
  const selectedQuantity = lastResponse?.slots?.quantity;
  const totalPrice = lastResponse?.price?.totalPrice;
  const hasManyReplies = quickReplies.length >= 4;
  const hasDenseReplies = quickReplies.length >= 5;
  const hasCrowdedReplies = quickReplies.length >= 6;
  const responseGuideText = lastResponse?.response
    ? `${lastResponse.response}${
        dialogStep === 'quantity' ? ' 수량 먼저 고르신 후 뒤에 옵션 커스텀 도와드릴게요.' : ''
      }`
    : '';

  useEffect(() => {
    if (mode !== 'order-dialog') return;
    if (dialogStep === 'quantity' && currentSelectionRef.current) {
      // 수량 단계 진입: 카운터를 1로 초기화
      setQuantityDraft(1);
    }
  }, [mode, dialogStep]);

  // ── 추천 메뉴 화면: 잠금 해제 후 첫 번째 버튼에 포커스 ──────────────────────
  useEffect(() => {
    if (mode !== 'order-dialog') return;
    if (
      !isReplyLocked &&
      !lastResponse?.response &&
      quickReplies.length > 0 &&
      dialogStep !== 'quantity' &&
      dialogStep !== 'menu'
    ) {
      const timer = setTimeout(() => firstReplyRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [mode, isReplyLocked, lastResponse?.response, quickReplies.length, dialogStep]);

  useEffect(() => {
    if (mode !== 'order-dialog' || !lastResponse?.response) return;
    const timer = setTimeout(() => responseGuideRef.current?.focus(), 350);
    return () => clearTimeout(timer);
  }, [mode, lastResponse?.response]);

  useEffect(() => {
    if (mode !== 'menu-board' || !menuCache) return;
    const timer = setTimeout(() => responseGuideRef.current?.focus(), 350);
    return () => clearTimeout(timer);
  }, [mode, menuCache]);

  useEffect(() => {
    if (mode !== 'home') return;
    const timer = setTimeout(() => homeGuideRef.current?.focus(), 350);
    return () => clearTimeout(timer);
  }, [mode]);

  // ── 메뉴 캐시 ────────────────────────────────────────────────────────────────
  const ensureMenuCache = async () => {
    if (menuCache) return menuCache;
    const data = await cacheRestaurantMenus(RESTAURANT_ID);
    setMenuCache(data);
    return data;
  };

  // ── 수량 카운터 (수량 단계 전용) ────────────────────────────────────────────
  // 백엔드는 그대로 "${n}개 주세요" 텍스트를 받음 → 흐름·로직 변경 0건.
  const QUANTITY_MIN = 1;
  const QUANTITY_MAX = 99;

  /** 현재 메뉴의 1잔당 가격을 백엔드 응답에서 추출 */
  const getMenuUnitPrice = (): number | null => {
    const price = lastResponse?.price;
    if (!price) return null;
    // 옵션 선택 전이므로 menuPrice 우선, 없으면 unitPrice
    return price.menuPrice ?? price.unitPrice ?? null;
  };

  const decrementQuantity = () => {
    setQuantityDraft((current) => {
      const next = Math.max(QUANTITY_MIN, current - 1);
      if (next !== current) speak(`${next}개`);
      return next;
    });
  };

  const incrementQuantity = () => {
    setQuantityDraft((current) => {
      const next = Math.min(QUANTITY_MAX, current + 1);
      if (next !== current) speak(`${next}개`);
      return next;
    });
  };

  const confirmQuantity = () => {
    if (isSubmitting) return;
    speak(`${quantityDraft}개로 확인했습니다.`, () => {
      submitOrderText(`${quantityDraft}개 주세요`);
    });
  };

  // ── TTS + 잠금 ───────────────────────────────────────────────────────────────
  const speakAndUnlock = (message?: string) => {
    if (unlockTimerRef.current) clearTimeout(unlockTimerRef.current);
    setIsReplyLocked(true);
    unlockTimerRef.current = setTimeout(() => setIsReplyLocked(false), 2400);

    if (!message) return;

    speak(message, () => {
      if (unlockTimerRef.current) clearTimeout(unlockTimerRef.current);
      unlockTimerRef.current = setTimeout(() => setIsReplyLocked(false), 500);
    });
  };

  const showRecommendations = async (input: string) => {
    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      await ensureMenuCache();
      const data = await fetchRecommendations(input, RESTAURANT_ID);
      const replies = data.recommendations.map((menu) => menu.name).filter(Boolean);

      pushCurrentView();
      setSessionId(null);
      setMode('order-dialog');
      setLastResponse({
        intent: 'RECOMMEND',
        quickReplies: replies,
        response: data.ttsText,
        slots: {
          menu: null,
          optionSlots: [],
          quantity: null,
        },
        slotsComplete: false,
      });
      speakAndUnlock(data.ttsText);
    } catch (error) {
      console.error('추천 API 호출 실패:', error);
      speak('추천 메뉴를 불러오지 못했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── 주문 완료 이동 ───────────────────────────────────────────────────────────
  // ── 이전 화면 기록/복원 ─────────────────────────────────────────────────────
  const pushCurrentView = () => {
    const snapshot: ViewSnapshot = { mode, sessionId, lastResponse };
    const previous = viewHistoryRef.current.at(-1);
    if (
      previous?.mode === snapshot.mode &&
      previous?.sessionId === snapshot.sessionId &&
      previous?.lastResponse === snapshot.lastResponse
    ) {
      return;
    }
    viewHistoryRef.current = [...viewHistoryRef.current, snapshot].slice(-12);
  };

  const goHome = () => {
    viewHistoryRef.current = [];
    setMode('home');
    setLastResponse(null);
    setCompleteResponse(null);
    setSessionId(null);
  };

  const goBack = () => {
    if (unlockTimerRef.current) clearTimeout(unlockTimerRef.current);
    if (isListening) stopToggleListening();

    const previous = viewHistoryRef.current.pop();
    if (!previous) {
      if (mode === 'home') {
        window.history.back();
        return;
      }
      goHome();
      return;
    }

    setMode(previous.mode);
    setSessionId(previous.sessionId);
    setLastResponse(previous.lastResponse);
    setIsReplyLocked(false);
  };

  // ── 주문 텍스트 전송 ─────────────────────────────────────────────────────────
  const submitOrderText = async (
    rawInput: string,
    nextSessionId: string | null = sessionId,
    options: SubmitOrderOptions = {},
  ) => {
    const input = options.preserveInput ? rawInput.trim() : normalizeOrderText(rawInput);
    if (!input || isSubmitting) return;

    // 음성으로 화면 이동 명령 처리
    if (input.includes('처음으로')) {
      goHome();
      return;
    }

    if (input.includes('이전') || input.includes('뒤로')) {
      goBack();
      return;
    }

    if (wantsRecommendation(input)) {
      showRecommendations(input);
      return;
    }

    const sessionForRequest = shouldStartFreshSession(input) ? null : nextSessionId;

    setIsSubmitting(true);

    let data: OrderApiResponse;
    try {
      await ensureMenuCache();
      data = await sendOrderText(input, sessionForRequest, RESTAURANT_ID);
    } catch (error) {
      console.error('주문 API 호출 실패:', error);
      speak('서버와 연결하지 못했어요. 잠시 후 다시 시도해주세요.');
      setIsSubmitting(false);
      return;
    }

    const newSessionId = data.sessionId ?? sessionForRequest;
    setSessionId(newSessionId);

    if (isFinalCompleteResponse(data)) {
      setCompleteResponse(data);
      setIsSubmitting(false);
      return;
    }

    pushCurrentView();
    setMode('order-dialog');
    setLastResponse(data);
    setIsSubmitting(false);

    speakAndUnlock(data.response);
  };

  // ── 메뉴판 보기 ──────────────────────────────────────────────────────────────
  const showMenuBoard = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const data = await ensureMenuCache();
      pushCurrentView();
      setMode('menu-board');
      setLastResponse(null);
      speak(`${data.restaurantName}의 주문 가능한 메뉴를 보여드릴게요.`);
    } catch {
      speak('메뉴판을 불러오지 못했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── 홈 액션 버튼 ────────────────────────────────────────────────────────────
  const handleHomeAction = (action: HomeAction) => {
    speak(action.label, () => {
      if (action.label === '메뉴판') {
        showMenuBoard();
        return;
      }
      if (action.label === '즉시 주문') {
        setSessionId(null);
        handleMicClick();
        return;
      }
      setSessionId(null);
      submitOrderText(action.speechInput, null);
    });
  };

  // ── 메뉴판에서 메뉴 선택 ─────────────────────────────────────────────────────
  const handleMenuSelect = (menu: MenuInfo) => {
    setSessionId(null);
    submitOrderText(menu.name, null, { preserveInput: true });
  };

  // ── 마이크 토글 ──────────────────────────────────────────────────────────────
  const handleMicClick = async () => {
    if (isSubmitting) return;

    if (isListening) {
      stopToggleListening();
      return;
    }

    // 첫 클릭: 마이크 권한 먼저 요청 → 허용 후 STT 시작
    if (!hasInitializedMicRef.current) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
        hasInitializedMicRef.current = true;
      } catch {
        speak('마이크 권한이 필요해요. 설정에서 마이크를 허용해주세요.');
        return;
      }
    }

    startToggleListening((transcript) => {
      const normalized = normalizeOrderText(transcript);
      if (mode === 'home' && normalized.includes('메뉴판')) {
        showMenuBoard();
        return;
      }
      if (mode === 'home') {
        window.setTimeout(() => submitOrderText(normalized), 650);
        return;
      }
      submitOrderText(normalized);
    });

    window.setTimeout(() => micButtonRef.current?.focus(), 150);
  };

  // ── 메뉴판에서 카테고리별 그룹 ──────────────────────────────────────────────
  const groupedMenus: [string, MenuInfo[]][] = [];
  if (menuCache) {
    const groups = new Map<string, MenuInfo[]>();
    menuCache.menus
      .filter((menu) => menu.isAvailable)
      .forEach((menu) => {
        const name = menu.category?.name ?? '기타';
        groups.set(name, [...(groups.get(name) ?? []), menu]);
      });
    groups.forEach((menus, name) => groupedMenus.push([name, menus]));
  }
  const selectedOptionLabels = getSelectedOptionLabels(lastResponse);

  if (completeResponse) {
    return (
      <CompletePage
        completionMessage={completeResponse.response}
        guideMessage={completeResponse.response}
        isListening={isListening}
        onMicClick={handleMicClick}
        onHome={goHome}
        speak={speak}
      />
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 메뉴판 화면
  // ─────────────────────────────────────────────────────────────────────────────
  if (mode === 'menu-board') {
    return (
      <div className="voisk-screen-bg text-slate-950">
        <div className="mx-auto flex h-dvh w-full max-w-[440px] flex-col px-5 pb-3 pt-[max(24px,env(safe-area-inset-top))]">

          <AppHeader onBack={goBack} subtitle={menuCache?.restaurantName ?? '메뉴판'} />

          <p ref={responseGuideRef} tabIndex={-1} className="sr-only">
            {`${menuCache?.restaurantName ?? '메뉴판'} 메뉴판입니다. 메뉴를 선택해 주세요.`}
          </p>

          <VoiceControls
            disabled={isSubmitting}
            guideRef={responseGuideRef}
            isListening={isListening}
            micRef={micButtonRef}
            onMicClick={handleMicClick}
          />

          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="grid gap-4">
              {groupedMenus.map(([categoryName, menus]) => (
                <div key={categoryName}>
                  <p aria-hidden="true" className="mb-1.5 text-sm font-black text-blue-700">
                    {categoryName}
                  </p>
                  <div className="grid gap-2">
                    {menus.map((menu) => (
                      <button
                        key={menu.menuId}
                        type="button"
                        onClick={() => handleMenuSelect(menu)}
                        aria-label={`${menu.name} ${formatPrice(menu.price)}`}
                        className="rounded-lg bg-white/95 px-5 py-3.5 text-left shadow-[0_12px_28px_rgba(15,23,42,0.09)] focus:outline-none focus:ring-4 focus:ring-blue-300"
                      >
                        <span className="block text-xl font-black leading-tight text-slate-950">
                          {menu.name}
                        </span>
                        <span aria-hidden="true" className="mt-1 block text-sm font-bold text-slate-500">
                          {formatPrice(menu.price)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 주문 대화 화면
  // ─────────────────────────────────────────────────────────────────────────────
  if (mode === 'order-dialog') {
    return (
      <div className="voisk-screen-bg select-none text-slate-950">
        <div className="mx-auto flex h-dvh w-full max-w-[440px] flex-col px-5 pb-3 pt-[max(24px,env(safe-area-inset-top))]">

          <AppHeader onBack={goBack} subtitle={STEP_TITLE[dialogStep]} />

          {/* VoiceOver 확인 중: 마이크 켜짐/꺼짐 안내 일시 중지
          <div aria-live="polite" aria-atomic="true" className="sr-only">
            {micAnnouncement}
          </div>
          */}

          {responseGuideText && (
            <p
              ref={responseGuideRef}
              tabIndex={-1}
              className="sr-only"
            >
              {responseGuideText}
            </p>
          )}

          <VoiceControls
            disabled={isSubmitting}
            guideRef={responseGuideRef}
            isListening={isListening}
            micRef={micButtonRef}
            onMicClick={handleMicClick}
          />

          {/* 수량 단계 전용: +/- 카운터 UI */}
          {dialogStep === 'quantity' && !isReplyLocked && (
            <div className="mt-5">
              <div
                className="flex items-center justify-between gap-3 rounded-xl bg-white/95 px-4 py-5 shadow-[0_12px_30px_rgba(15,23,42,0.08)]"
                aria-label={`현재 수량 ${quantityDraft}개`}
              >
                <button
                  type="button"
                  onClick={decrementQuantity}
                  onFocus={() => speak(`수량 빼기 버튼, 현재 ${quantityDraft}개`)}
                  disabled={quantityDraft <= QUANTITY_MIN || isSubmitting}
                  aria-label={`수량 빼기 현재 ${quantityDraft}개`}
                  className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-slate-950 text-5xl font-black text-white shadow-[0_12px_30px_rgba(15,23,42,0.2)] focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:bg-slate-300 disabled:shadow-none active:scale-[0.95]"
                >
                  −
                </button>
                <p
                  aria-hidden="true"
                  className="flex-1 text-center text-6xl font-black text-slate-950"
                >
                  {quantityDraft}
                  <span className="ml-1 text-3xl">개</span>
                </p>
                <button
                  type="button"
                  onClick={incrementQuantity}
                  onFocus={() => speak(`수량 더하기 버튼, 현재 ${quantityDraft}개`)}
                  disabled={quantityDraft >= QUANTITY_MAX || isSubmitting}
                  aria-label={`수량 더하기 현재 ${quantityDraft}개`}
                  className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-slate-950 text-5xl font-black text-white shadow-[0_12px_30px_rgba(15,23,42,0.2)] focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:bg-slate-300 disabled:shadow-none active:scale-[0.95]"
                >
                  +
                </button>
              </div>
            </div>
          )}

          {/* 현재 선택 카드 (메뉴명·수량·옵션·가격) */}
          {(selectedMenu ||
            selectedQuantity != null ||
            selectedOptionLabels.length > 0 ||
            typeof totalPrice === 'number' ||
            dialogStep === 'quantity') && (
            <div
              ref={currentSelectionRef}
              tabIndex={dialogStep === 'option' ? undefined : -1}
              aria-hidden={dialogStep === 'option' ? true : undefined}
              aria-label={
                dialogStep === 'quantity'
                  ? `총 ${quantityDraft}개${
                      getMenuUnitPrice() != null
                        ? `, ${formatPrice((getMenuUnitPrice() as number) * quantityDraft)}`
                        : ''
                    }`
                  : dialogStep === 'confirm' && typeof totalPrice === 'number'
                  ? `총 ${formatPrice(totalPrice)}`
                  : [
                      selectedMenu,
                      selectedQuantity != null ? `${selectedQuantity}개` : null,
                      ...selectedOptionLabels,
                      typeof totalPrice === 'number' ? formatPrice(totalPrice) : null,
                    ]
                      .filter(Boolean)
                      .join(', ')
              }
              className={`rounded-xl bg-white/95 px-5 shadow-[0_12px_30px_rgba(15,23,42,0.08)] focus:outline-none focus:ring-4 focus:ring-blue-300 ${
                dialogStep === 'quantity'
                  ? 'mt-3 py-4'
                  : hasCrowdedReplies && dialogStep === 'option'
                  ? 'py-2'
                  : hasManyReplies && dialogStep === 'option'
                  ? 'py-3'
                  : 'py-4'
              }`}
            >
              <p aria-hidden="true" className="text-sm font-black text-slate-500">현재 선택</p>
              <p
                aria-hidden="true"
                className={`mt-1 font-black leading-tight text-slate-950 ${
                hasCrowdedReplies && dialogStep === 'option'
                  ? 'text-lg'
                  : hasManyReplies && dialogStep === 'option'
                  ? 'text-xl'
                  : 'text-2xl'
              }`}
              >
                {dialogStep === 'quantity'
                  ? selectedMenu ?? ''
                  : [selectedMenu, selectedQuantity != null ? `${selectedQuantity}개` : null]
                      .filter(Boolean)
                      .join(' · ')}
              </p>
              {selectedOptionLabels.length > 0 && dialogStep !== 'quantity' && (
                <div
                  aria-hidden="true"
                  className={`flex flex-wrap ${hasManyReplies && dialogStep === 'option' ? 'mt-1 gap-1.5' : 'mt-2 gap-2'}`}
                >
                  {selectedOptionLabels.map((label) => (
                    <span
                      key={label}
                      className={`rounded-full bg-blue-50 font-black text-blue-700 ${
                        hasCrowdedReplies && dialogStep === 'option'
                          ? 'px-2.5 py-0 text-xs'
                          : hasManyReplies && dialogStep === 'option'
                          ? 'px-3 py-0.5 text-sm'
                          : 'px-3 py-1 text-sm'
                      }`}
                    >
                      {label}
                    </span>
                  ))}
                </div>
              )}
              {/* 수량 단계: 1잔당 가격 + 실시간 합계 표시 */}
              {dialogStep === 'quantity' && getMenuUnitPrice() != null && (
                <p aria-hidden="true" className="mt-1 text-base font-black text-slate-500">
                  1잔당 {formatPrice(getMenuUnitPrice() as number)}
                  <span className="ml-2 text-lg text-blue-700">
                    합계 {formatPrice((getMenuUnitPrice() as number) * quantityDraft)}
                  </span>
                </p>
              )}
              {/* 그 외 단계: 백엔드가 준 총액 표시 */}
              {dialogStep !== 'quantity' && typeof totalPrice === 'number' && (
                <p aria-hidden="true" className="mt-1 text-lg font-black text-blue-700">
                  {formatPrice(totalPrice)}
                </p>
              )}
            </div>
          )}

          {/* 수량 단계 전용: 확인 버튼 */}
          {dialogStep === 'quantity' && !isReplyLocked && (
            <div className="mt-3">
              <button
                type="button"
                onClick={confirmQuantity}
                onFocus={() => speak(`확인 버튼. ${quantityDraft}개로 주문을 계속합니다`)}
                disabled={isSubmitting}
                aria-label="확인"
                className="min-h-20 w-full rounded-xl bg-blue-700 px-5 text-2xl font-black text-white shadow-[0_16px_38px_rgba(29,78,216,0.3)] focus:outline-none focus:ring-4 focus:ring-blue-300 active:scale-[0.99]"
              >
                확인
              </button>
            </div>
          )}

          {/* quickReply 버튼 — 수량 단계가 아닐 때만, 잠금 중에는 숨김(aria-hidden) */}
          {dialogStep !== 'quantity' && (
            <>
              <div
                className={`grid min-h-0 content-start overflow-hidden ${
                  dialogStep === 'menu'
                    ? 'mt-5 gap-3'
                    : hasCrowdedReplies
                    ? 'mt-2 gap-1.5'
                    : hasDenseReplies
                    ? 'mt-3 gap-2'
                    : hasManyReplies
                    ? 'mt-4 gap-2.5'
                    : 'mt-5 gap-3'
                }`}
              >
                {isReplyLocked ? (
                  // 잠금 중: VoiceOver가 탐색 못하게 aria-hidden, 시각적으로도 숨김
                  <div aria-hidden="true" className={`grid ${hasCrowdedReplies ? 'gap-1.5' : hasDenseReplies ? 'gap-2' : hasManyReplies ? 'gap-2.5' : 'gap-3'}`}>
                    {quickReplies.map((reply) => (
                      <div
                        key={reply}
                        className={`rounded-xl bg-slate-200 px-5 ${
                          hasCrowdedReplies ? 'min-h-12' : hasDenseReplies ? 'min-h-14' : hasManyReplies ? 'min-h-16' : 'min-h-20'
                        }`}
                      />
                    ))}
                  </div>
                ) : (
                quickReplies.map((reply, index) => (
                  <button
                    key={reply}
                    ref={index === 0 ? firstReplyRef : null}
                    type="button"
                    value={reply}
                    onClick={(event) => submitOrderText(event.currentTarget.value, sessionId, { preserveInput: true })}
                    disabled={isSubmitting}
                    aria-label={getQuickReplyVoiceOverLabel(reply)}
                    className={`rounded-xl bg-slate-950 px-5 text-left font-black leading-tight text-white shadow-[0_16px_38px_rgba(15,23,42,0.18)] focus:outline-none focus:ring-4 focus:ring-blue-300 active:scale-[0.99] ${
                      hasDenseReplies
                        ? hasCrowdedReplies
                          ? 'min-h-12 text-lg'
                          : 'min-h-14 text-xl'
                        : hasManyReplies
                        ? 'min-h-16 text-xl'
                        : 'min-h-20 text-2xl'
                    }`}
                  >
                    {reply}
                  </button>
                ))
              )}
            </div>
            </>
          )}

        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 홈 화면
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="voisk-screen-bg select-none text-slate-950">
      <div className="mx-auto flex h-dvh w-full max-w-[440px] flex-col px-5 pb-3 pt-[max(24px,env(safe-area-inset-top))]">

        <AppHeader hideBack />

        <p ref={homeGuideRef} tabIndex={-1} className="sr-only">
          Voisk입니다. 이 화면에는 메뉴판, 메뉴 추천, 즉시 주문 버튼이 있습니다.
          이 화면을 제외한 모든 화면의 좌측 상단에는 음성으로 주문하실 수 있는 마이크 기능이 있습니다. 우측 상단에는 다시 듣기 기능이 있습니다.
          마이크 버튼을 두 번 탭하시면 마이크가 켜지고 원하는 내용을 말씀하신 후 다시 두 번 탭하면 마이크가 꺼집니다.
          
        </p>

        {/* VoiceOver 확인 중: 마이크 켜짐/꺼짐 안내 일시 중지
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {micAnnouncement}
        </div>
        */}

        <div className="flex flex-1 items-center">
          <div className="grid w-full gap-4 pb-16">
          {HOME_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                type="button"
                onClick={() => handleHomeAction(action)}
                aria-label={`${action.label}. ${action.description}`}
                className="flex min-h-24 items-center gap-4 rounded-xl bg-slate-950 px-6 text-left text-white shadow-[0_16px_38px_rgba(15,23,42,0.18)] focus:outline-none focus:ring-4 focus:ring-blue-300 active:scale-[0.99]"
              >
                <Icon aria-hidden="true" className="shrink-0" size={32} />
                <span>
                  <span className="block text-[1.65rem] font-black leading-tight">{action.label}</span>
                  <span aria-hidden="true" className="mt-1 block text-sm font-bold text-slate-300">
                    {action.description}
                  </span>
                </span>
              </button>
            );
          })}
          </div>
        </div>
      </div>
    </div>
  );
};
