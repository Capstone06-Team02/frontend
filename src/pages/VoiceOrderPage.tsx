import { type RefObject, useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, CircleHelp, Coffee, Contrast, Lightbulb, Send } from 'lucide-react';
import { AppHeader } from '../components/AppHeader';
import { CompletePage } from './CompletePage';
import {
  cacheRestaurantMenus,
  fetchMenuOptionalOptions,
  fetchRecommendHints,
  fetchRecommendations,
  fetchRecommendationsByHint,
  fetchRequiredOptionSummary,
  fetchSignatureMenus,
  getDefaultRestaurantId,
  selectOrderOption,
  sendOrderText,
} from '../api/order';
import { useAccessibility } from '../hooks/useAccessibility';
import { useVoice } from '../hooks/useVoice';
import type {
  MenuCacheResponse,
  MenuOptionalOptionsResponse,
  MenuInfo,
  OptionSlot,
  OrderOptionSelectionResponse,
  OrderApiResponse,
  RecommendHint,
  RecommendationInfo,
  RequiredOptionSummaryResponse,
  SignatureMenuInfo,
} from '../types/order';
import { wantsRecommendation } from '../utils/cafeOrder';
import { formatPrice } from '../utils/format';
import { normalizeOrderText } from '../utils/voice';

type ScreenMode = 'home' | 'featured-menu' | 'category-select' | 'category-menu' | 'full-menu' | 'order-dialog';
type DialogStep = 'input' | 'recommend-input' | 'recommend' | 'option' | 'confirm' | 'complete' | 'continue';
type ViewSnapshot = {
  lastResponse: OrderApiResponse | null;
  mode: ScreenMode;
  sessionId: string | null;
};
type SubmitOrderOptions = {
  optimisticSlotName?: string;
  optimisticSlotValue?: string;
  preserveInput?: boolean;
};
type HomeAction = {
  description: string;
  icon: typeof BookOpen;
  label: string;
  speechInput: string;
};
type TextCommandBoxProps = {
  disabled?: boolean;
  inputRef?: RefObject<HTMLInputElement | null>;
  label?: string;
  onSubmit: (text: string) => void;
  placeholder?: string;
};

const RESTAURANT_ID = getDefaultRestaurantId();
const RESTAURANT_DISPLAY_NAME = '중앙대 카페';
const HOME_INTRO_GUIDE =
  'Voisk의 첫 화면입니다. 메뉴판, 메뉴 추천, 즉시 주문 버튼이 있습니다. 오른쪽으로 스와이프해서 원하는 기능을 선택해 주세요.';
const HOME_USAGE_GUIDE =
  '입력창에서 휴대폰 기본 받아쓰기 버튼을 누르면 음성으로 입력할 수 있어요. 메뉴를 직접 입력하거나 예시 문장을 선택한 뒤 전송하면 됩니다.';

/*
 * 설명은 라벨 오른쪽에 들어간다. 줄바꿈(\n)을 문구에 직접 넣어 어느 기기에서든
 * 같은 자리에서 끊기게 한다. 폭에 맡기면 글꼴 크기나 화면 폭에 따라 끊기는
 * 위치가 달라진다.
 *
 * 낭독은 줄바꿈 없이 한 문장으로 나가야 하므로 aria-label에는
 * toSpokenText로 공백으로 바꿔 넣는다.
 */
const toSpokenText = (text: string) => text.replace(/\n/g, ' ');

const HOME_ACTIONS: HomeAction[] = [
  {
    label: '메뉴판',
    speechInput: '메뉴판 보여줘',
    description: '대표 메뉴 혹은\n전체 메뉴 확인',
    icon: BookOpen,
  },
  {
    label: '메뉴 추천',
    speechInput: '메뉴 추천',
    description: '사용자 취향에\n맞게 메뉴 추천',
    icon: Lightbulb,
  },
  {
    label: '즉시 주문',
    speechInput: '메뉴 주문',
    description: '원하는 메뉴\n즉시 주문',
    icon: Coffee,
  },
];

const getReplies = (data: OrderApiResponse | null) => data?.quickReplies?.filter(Boolean) ?? [];
const getConfirmReply = (data: OrderApiResponse | null) =>
  getReplies(data).find((reply) => ['확인', '네', '맞습니다', '맞아요', '맞아', '응'].includes(reply)) ?? '확인';
const getPrimaryOrderItem = (data: OrderApiResponse | null) => data?.slots?.items?.[0] ?? null;
const getSlotMenu = (data: OrderApiResponse | null) =>
  getPrimaryOrderItem(data)?.menu ?? data?.slots?.menu ?? null;
const getSlotQuantity = (data: OrderApiResponse | null) =>
  getPrimaryOrderItem(data)?.quantity ?? data?.slots?.quantity ?? null;
const getSlotOptionSlots = (data: OrderApiResponse | null) =>
  getPrimaryOrderItem(data)?.optionSlots ?? data?.slots?.optionSlots ?? [];
const getSlotTotalPrice = (data: OrderApiResponse | null) =>
  getPrimaryOrderItem(data)?.totalPrice ?? data?.price?.totalPrice ?? null;
const getSlotUnitPrice = (data: OrderApiResponse | null) =>
  getPrimaryOrderItem(data)?.unitPrice ?? data?.price?.unitPrice ?? null;

const getSelectedOptionValue = (slot: OptionSlot) => {
  const selectedCandidates =
    slot.candidates
      ?.filter((candidate) => candidate.selected)
      .map((candidate) =>
        candidate.defaultQuantity && candidate.defaultQuantity > 1
          ? `${candidate.name} ${candidate.defaultQuantity}개`
          : candidate.name,
      ) ?? [];

  return slot.selectedOption ?? (selectedCandidates.length > 0 ? selectedCandidates.join(', ') : slot.selected);
};

const isFinalCompleteResponse = (data: OrderApiResponse) => {
  const response = data.response ?? '';
  return response.includes('주문 완료') || response.includes('완료되었습니다') || response.includes('나올게요');
};

const getDialogStep = (data: OrderApiResponse | null): DialogStep => {
  if (!data) return 'continue';
  if (isFinalCompleteResponse(data)) return 'complete';
  if (data.intent === 'DIRECT_INPUT') return 'input';
  if (data.intent === 'RECOMMEND_INPUT') return 'recommend-input';
  if (data.intent === 'RECOMMEND') return 'recommend';

  const hasMenu = Boolean(getSlotMenu(data));
  const hasQuantity = getSlotQuantity(data) != null;

  if (data.slotsComplete && hasMenu && hasQuantity) return 'confirm';
  if (getSlotOptionSlots(data).some((slot) => slot.required && !getSelectedOptionValue(slot))) return 'option';
  if (data.response?.includes('옵션') || data.response?.includes('온도') || data.response?.includes('사이즈')) {
    return 'option';
  }
  if (hasMenu && hasQuantity) return 'confirm';
  return 'continue';
};

const STEP_TITLE: Record<DialogStep, string> = {
  input: '즉시 주문',
  'recommend-input': '추천 메뉴',
  recommend: '추천 메뉴',
  option: '옵션 선택',
  confirm: '주문 확인',
  complete: '주문 완료',
  continue: '주문 진행',
};

const findMenuByName = (menuCache: MenuCacheResponse | null, name?: string | null) =>
  menuCache?.menus.find((menu) => menu.name === name) ?? null;

const getRecommendHintSentence = (label: string) => {
  const trimmed = label.trim();
  if (!trimmed) return '';
  if (trimmed.includes('추천')) return trimmed;
  return `${trimmed} 추천해줘`;
};

const normalizeRecommendHintText = (text: string) =>
  text
    .replace(/\s/g, '')
    .replace(/추천(해줘|해주세요|받기|받고싶어|좀)?/g, '')
    .replace(/메뉴/g, '')
    .replace(/음료/g, '');

/*
 * 메뉴명 글자 크기. 이름이 길면 한 단계 낮춰 버튼 안에 자연스럽게 들어가게 한다.
 * '부드러운 생크림 카스텔라'처럼 긴 이름까지 키우면 줄이 과하게 늘어난다.
 */
const getMenuNameSize = (name: string) => (name.length > 10 ? 'text-xl' : 'text-[1.6rem]');

const getOptionButtonLabel = (value: string) => {
  if (value === '없음') return '추가 안 함';
  return value;
};

const getSelectedOptionalLabel = (option: OrderOptionSelectionResponse) =>
  `${option.optionGroupName} ${getOptionButtonLabel(option.selectedOptionItemName)}`;

const getRequiredSlotNameForChoice = (data: OrderApiResponse | null, choice: string) =>
  getSlotOptionSlots(data).find(
    (slot) =>
      slot.required &&
      slot.name &&
      slot.candidates?.some((candidate) => candidate.name === choice),
  )?.name;

const getRequiredOptionSelectionMap = (data: OrderApiResponse | null) =>
  getSlotOptionSlots(data)
    .filter((slot) => slot.required)
    .reduce<Record<string, string>>((acc, slot) => {
      const selected = getSelectedOptionValue(slot);
      if (slot.name && selected) acc[slot.name] = selected;
      return acc;
    }, {});

/*
 * 로딩 오버레이.
 * 화면을 덮어 기다리는 중임을 분명히 알리고, 그 사이 다른 버튼이 눌리는 것도 막는다.
 * 회전판은 aria-hidden으로 감추고 문구만 role="status"로 읽힌다.
 * VoiceOver 사용자에게는 회전이 보이지 않으니 문구가 유일한 신호다.
 */
const LoadingOverlay = ({ text }: { text: string }) => (
  <div
    role="status"
    aria-live="polite"
    className="fixed inset-0 z-50 flex items-center justify-center bg-page/85 px-6"
  >
    <div className="flex flex-col items-center gap-4 rounded-2xl border-4 border-line bg-surface px-10 py-8 shadow-[0_20px_50px_rgba(15,23,42,0.2)]">
      <span aria-hidden="true" className="voisk-spinner" />
      <p className="text-xl font-black text-ink">{text}</p>
    </div>
  </div>
);

const TextCommandBox = ({
  disabled = false,
  inputRef,
  label,
  onSubmit,
  placeholder,
}: TextCommandBoxProps) => {
  const [value, setValue] = useState('');

  const submit = () => {
    const text = value.trim();
    if (!text || disabled) return;
    setValue('');
    onSubmit(text);
  };

  return (
    // 바깥 상자는 accent 계열 테두리를 쓴다. 안쪽 입력칸이 흰(고대비) 테두리라
    // 같은 색으로 두르면 선이 두 겹으로 겹쳐 보인다. 색을 달리해 구분한다.
    <form
      className="grid gap-4 rounded-xl border-4 border-accent-line bg-surface p-5 shadow-[0_12px_30px_rgba(15,23,42,0.08)]"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      {!label && !placeholder && (
        <span aria-hidden="true" className="px-1 text-base font-black text-muted">
          텍스트 필드
        </span>
      )}
      <input
        ref={inputRef}
        aria-label={label || undefined}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder || undefined}
        autoComplete="off"
        /* 입력칸은 포커스 전에도 테두리가 보여야 어디를 눌러야 하는지 알 수 있다.
           대신 바깥 상자의 테두리를 없애 선이 두 겹으로 겹치지 않게 했다. */
        className="min-h-16 rounded-lg border-4 border-line bg-surface px-4 py-3 text-lg font-black leading-snug text-ink placeholder:text-muted focus:outline focus:outline-4 focus:outline-focusring focus:[outline-offset:-4px]"
      />
      <button
        type="submit"
        aria-label="전송"
        className="flex min-h-16 items-center justify-center gap-2 rounded-lg border-4 border-accent bg-accent px-4 text-lg font-black text-on-accent shadow-[0_12px_28px_rgba(29,78,216,0.22)] focus:outline-none focus:ring-4 focus:ring-focusring"
      >
        <Send aria-hidden="true" size={20} />
        전송
      </button>
    </form>
  );
};

export const VoiceOrderPage = () => {
  const [mode, setMode] = useState<ScreenMode>('home');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [menuCache, setMenuCache] = useState<MenuCacheResponse | null>(null);
  const [lastResponse, setLastResponse] = useState<OrderApiResponse | null>(null);
  const [completeResponse, setCompleteResponse] = useState<OrderApiResponse | null>(null);
  const [featuredMenus, setFeaturedMenus] = useState<SignatureMenuInfo[]>([]);
  const [recommendHints, setRecommendHints] = useState<RecommendHint[]>([]);
  const [recommendMenus, setRecommendMenus] = useState<RecommendationInfo[]>([]);
  const [requiredSummary, setRequiredSummary] = useState<RequiredOptionSummaryResponse | null>(null);
  const [optionalOptions, setOptionalOptions] = useState<MenuOptionalOptionsResponse | null>(null);
  const [selectedOptionalOptions, setSelectedOptionalOptions] = useState<OrderOptionSelectionResponse[]>([]);
  const [optimisticRequiredOptions, setOptimisticRequiredOptions] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [homeUsageAnnouncement, setHomeUsageAnnouncement] = useState('');
  const [orderDetailAnnouncement, setOrderDetailAnnouncement] = useState('');
  const [confirmInitialAnnouncement, setConfirmInitialAnnouncement] = useState('');
  const [optionDescription, setOptionDescription] = useState('');
  const [loadingText, setLoadingText] = useState('');
  const [showOptionalOptions, setShowOptionalOptions] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const homeGuideRef = useRef<HTMLParagraphElement>(null);
  const responseGuideRef = useRef<HTMLParagraphElement>(null);
  const firstFullMenuButtonRef = useRef<HTMLButtonElement>(null);
  const commandInputRef = useRef<HTMLInputElement>(null);
  const featuredGuideRef = useRef<HTMLParagraphElement>(null);
  const categorySelectGuideRef = useRef<HTMLParagraphElement>(null);
  const firstCategoryButtonRef = useRef<HTMLButtonElement>(null);
  const categoryNavTypeRef = useRef<'entry' | 'back'>('entry');
  const lastResponseGuideFocusKeyRef = useRef('');
  const loadingTimerRef = useRef<number | null>(null);
  const confirmAnnouncementRef = useRef<HTMLParagraphElement>(null);
  const confirmAnnouncementKeyRef = useRef('');
  const immediateFeedbackTimerRef = useRef<number | null>(null);
  const viewHistoryRef = useRef<ViewSnapshot[]>([]);
  const { speak } = useVoice();
  const { highContrast, setHighContrast } = useAccessibility();

  const dialogStep = getDialogStep(lastResponse);
  const quickReplies = getReplies(lastResponse);
  const selectedMenu = getSlotMenu(lastResponse);
  const totalPrice = getSlotTotalPrice(lastResponse);
  const currentMenu = findMenuByName(menuCache, selectedMenu);
  const currentMenuId = currentMenu?.menuId ?? null;
  const requiredSlots = getSlotOptionSlots(lastResponse).filter((slot) => slot.required);
  const selectedOptionalLabels = selectedOptionalOptions.map(getSelectedOptionalLabel);
  const selectedRequiredLabels =
    requiredSummary?.selectedRequiredOptions.map((option) => option.optionItemName).filter(Boolean) ?? [];
  const optionExtraPrice = selectedOptionalOptions.reduce((sum, option) => sum + (option.extraPrice ?? 0), 0);
  const displayTotalPrice = (requiredSummary?.unitPrice ?? totalPrice ?? getSlotUnitPrice(lastResponse) ?? 0) + optionExtraPrice;
  const responseGuideText = dialogStep === 'confirm' ? '' : lastResponse?.response ?? '';
  const responseGuideFocusKey = `${mode}-${dialogStep}-${sessionId ?? ''}-${lastResponse?.response ?? ''}-${
    requiredSummary?.message ?? ''
  }`;


  useEffect(() => {
    if (mode !== 'home') return;
    const timer = setTimeout(() => homeGuideRef.current?.focus(), 300);
    return () => clearTimeout(timer);
  }, [mode]);

  useEffect(() => {
    if (mode !== 'order-dialog' || !responseGuideText) return;
    if (lastResponseGuideFocusKeyRef.current === responseGuideFocusKey) return;
    lastResponseGuideFocusKeyRef.current = responseGuideFocusKey;

    const guideTimer = setTimeout(() => responseGuideRef.current?.focus(), 0);
    return () => {
      clearTimeout(guideTimer);
    };
  }, [dialogStep, mode, responseGuideFocusKey, responseGuideText]);

  useEffect(() => {
    if (mode !== 'order-dialog' || dialogStep !== 'input') return;
    const timer = setTimeout(() => commandInputRef.current?.focus(), 0);
    return () => clearTimeout(timer);
  }, [dialogStep, mode]);

  useEffect(() => {
    if (mode !== 'order-dialog' || dialogStep !== 'confirm' || !lastResponse?.response) return;
    const text = lastResponse.response;

    // 이미 읽어준 문구면 다시 읽지 않는다. 확인 단계로 넘어갈 때 상태가
    // 여러 번 갱신되면서 이 effect가 재실행되어도 안내가 반복되지 않게 한다.
    const announcementKey = `${sessionId ?? ''}-${text}`;
    if (confirmAnnouncementKeyRef.current === announcementKey) return;

    const timers: number[] = [];
    timers.push(
      window.setTimeout(() => {
        setConfirmInitialAnnouncement('');
        timers.push(
          window.setTimeout(() => {
            setConfirmInitialAnnouncement(text);
            timers.push(
              window.setTimeout(() => {
                // 실제로 읽히는 시점에 기록한다. 낭독 전에 기록하면 아래
                // 정리로 취소된 안내까지 '읽었다'고 표시되어 누락된다.
                confirmAnnouncementKeyRef.current = announcementKey;
                confirmAnnouncementRef.current?.focus();
              }, 50),
            );
          }, 100),
        );
      }, 300),
    );

    // 예약된 안내를 반드시 취소한다. 정리하지 않으면 effect가 재실행될 때
    // 타이머 체인이 겹쳐 같은 문장이 두 번 낭독된다.
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [lastResponse, dialogStep, mode, sessionId]);

  useEffect(() => {
    if (mode !== 'featured-menu') return;
    const timer = setTimeout(() => featuredGuideRef.current?.focus(), 0);
    return () => clearTimeout(timer);
  }, [mode]);

  useEffect(() => {
    if (mode !== 'category-select') return;
    if (categoryNavTypeRef.current === 'back') {
      const timer = setTimeout(() => firstCategoryButtonRef.current?.focus(), 0);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => categorySelectGuideRef.current?.focus(), 0);
    return () => clearTimeout(timer);
  }, [mode]);

  useEffect(() => {
    if (mode !== 'order-dialog' || dialogStep !== 'confirm' || !sessionId || !currentMenuId) return;

    let ignore = false;
    startProcessingNotice();
    fetchRequiredOptionSummary(sessionId, currentMenuId)
      .then((data) => {
        if (!ignore) {
          stopProcessingNotice();
          setRequiredSummary(data);
        }
      })
      .catch((error) => {
        stopProcessingNotice();
        console.error('필수 옵션 요약 API 호출 실패:', error);
      });

    return () => {
      ignore = true;
    };
  }, [currentMenuId, dialogStep, mode, sessionId]);


  const ensureMenuCache = async () => {
    if (menuCache) return menuCache;
    const data = await cacheRestaurantMenus(RESTAURANT_ID);
    setMenuCache(data);
    return data;
  };

  const clearTransientAnnouncements = () => {
    if (immediateFeedbackTimerRef.current) {
      window.clearTimeout(immediateFeedbackTimerRef.current);
      immediateFeedbackTimerRef.current = null;
    }
    setHomeUsageAnnouncement('');
    setOrderDetailAnnouncement('');
    setOptionDescription('');
    setConfirmInitialAnnouncement('');
  };

  const announceOrderDetail = (message: string, clearDelay = 1800) => {
    setOrderDetailAnnouncement('');
    window.setTimeout(() => setOrderDetailAnnouncement(message), 50);
    window.setTimeout(() => setOrderDetailAnnouncement(''), clearDelay);
  };

  /*
   * 응답을 기다리는 동안 화면에 로딩 오버레이를 띄운다.
   * 메뉴 캐시처럼 즉시 끝나는 호출에서 화면이 깜빡이지 않도록 아주 짧게 늦춘다.
   */
  const startProcessingNotice = () => {
    if (loadingTimerRef.current) window.clearTimeout(loadingTimerRef.current);
    loadingTimerRef.current = window.setTimeout(() => setLoadingText('로딩중입니다'), 120);
  };

  const stopProcessingNotice = () => {
    if (loadingTimerRef.current) {
      window.clearTimeout(loadingTimerRef.current);
      loadingTimerRef.current = null;
    }
    setLoadingText('');
  };

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
    lastResponseGuideFocusKeyRef.current = '';
    clearTransientAnnouncements();
    setMode('home');
    setLastResponse(null);
    setCompleteResponse(null);
    setSessionId(null);
    setShowOptionalOptions(false);
    setRequiredSummary(null);
    setOptionalOptions(null);
    setSelectedOptionalOptions([]);
    setOptimisticRequiredOptions({});
    setRecommendMenus([]);
    setSelectedCategory(null);
  };

  const goBack = () => {
    const previous = viewHistoryRef.current.pop();
    if (!previous) {
      if (mode === 'home') {
        window.history.back();
        return;
      }
      goHome();
      return;
    }

    if (previous.mode === 'category-select') categoryNavTypeRef.current = 'back';
    setMode(previous.mode);
    clearTransientAnnouncements();
    setSessionId(previous.sessionId);
    setLastResponse(previous.lastResponse);
    setShowOptionalOptions(false);
    setRequiredSummary(null);
    setOptionalOptions(null);
    setSelectedOptionalOptions([]);
    setOptimisticRequiredOptions(getRequiredOptionSelectionMap(previous.lastResponse));
  };

  const submitOrderText = async (
    rawInput: string,
    nextSessionId: string | null = sessionId,
    options: SubmitOrderOptions = {},
  ) => {
    let input = options.preserveInput ? rawInput.trim() : normalizeOrderText(rawInput);
    if (!input || isSubmitting) return;

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
    if (dialogStep === 'confirm') {
      input = getConfirmReply(lastResponse);
    }

    const optimisticSlotName = options.optimisticSlotName ?? getRequiredSlotNameForChoice(lastResponse, input);
    const optimisticSlotValue = options.optimisticSlotValue ?? input;
    const nextOptimisticRequiredOptions = optimisticSlotName
      ? { ...optimisticRequiredOptions, [optimisticSlotName]: optimisticSlotValue }
      : optimisticRequiredOptions;
    setIsSubmitting(true);
    clearTransientAnnouncements();
    startProcessingNotice();
    try {
      await ensureMenuCache();
      const data = await sendOrderText(input, nextSessionId, RESTAURANT_ID);
      stopProcessingNotice();
      const newSessionId = data.sessionId ?? nextSessionId;
      setSessionId(newSessionId);
      setShowOptionalOptions(false);
      setRequiredSummary(null);
      setOptionalOptions(null);
      setSelectedOptionalOptions([]);

      if (isFinalCompleteResponse(data)) {
        setCompleteResponse(data);
        return;
      }

      pushCurrentView();
      setMode('order-dialog');
      setLastResponse(data);
      setOptimisticRequiredOptions((current) => {
        const responseSelections = getRequiredOptionSelectionMap(data);
        if (getDialogStep(data) !== 'option') return responseSelections;
        return { ...current, ...nextOptimisticRequiredOptions, ...responseSelections };
      });

    } catch (error) {
      stopProcessingNotice();
      console.error('주문 API 호출 실패:', error);
      setOrderDetailAnnouncement('서버와 연결하지 못했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const showRecommendations = async (input: string) => {
    if (isSubmitting) return;

    const normalizedInput = normalizeRecommendHintText(input);
    const matchedHint = recommendHints.find((hint) => {
      const normalizedLabel = normalizeRecommendHintText(hint.label);
      if (!normalizedInput || !normalizedLabel) return false;
      return normalizedInput.includes(normalizedLabel) || normalizedLabel.includes(normalizedInput);
    });
    if (matchedHint) {
      await showRecommendationsByHint(matchedHint);
      return;
    }

    setIsSubmitting(true);
    startProcessingNotice();
    try {
      await ensureMenuCache();
      const data = await fetchRecommendations(input, RESTAURANT_ID);
      stopProcessingNotice();
      const replies = data.recommendations.map((menu) => menu.name).filter(Boolean);
      setRecommendMenus(data.recommendations);

      pushCurrentView();
      clearTransientAnnouncements();
      setSessionId(null);
      setMode('order-dialog');
      setLastResponse({
        intent: 'RECOMMEND',
        quickReplies: replies,
        response: data.ttsText || '추천 메뉴입니다. 원하는 메뉴를 선택해 주세요.',
        slots: { menu: null, optionSlots: [], quantity: null },
        slotsComplete: false,
      });
    } catch (error) {
      stopProcessingNotice();
      console.error('추천 API 호출 실패:', error);
      setOrderDetailAnnouncement('추천 메뉴를 불러오지 못했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const showRecommendationsByHint = async (hint: RecommendHint) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    startProcessingNotice();
    try {
      await ensureMenuCache();
      const data = await fetchRecommendationsByHint(hint.hintId);
      stopProcessingNotice();
      const replies = data.menus.map((menu) => menu.name).filter(Boolean);
      setRecommendMenus(data.menus);

      pushCurrentView();
      clearTransientAnnouncements();
      setSessionId(null);
      setMode('order-dialog');
      setLastResponse({
        intent: 'RECOMMEND',
        quickReplies: replies,
        response: data.ttsText || `${hint.label} 추천 메뉴입니다. 원하는 메뉴를 선택해 주세요.`,
        slots: { menu: null, optionSlots: [], quantity: null },
        slotsComplete: false,
      });
    } catch (error) {
      stopProcessingNotice();
      console.error('힌트 추천 API 호출 실패:', error);
      setOrderDetailAnnouncement('추천 메뉴를 불러오지 못했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const showFeaturedMenuBoard = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    startProcessingNotice();
    try {
      await ensureMenuCache();
      // 시그니처 메뉴 전용 API. 추천 API(LLM)와 달리 결과가 고정이고 빠르다.
      const data = await fetchSignatureMenus(RESTAURANT_ID);
      stopProcessingNotice();
      setFeaturedMenus(data.menus);
      pushCurrentView();
      clearTransientAnnouncements();
      setMode('featured-menu');
    } catch (error) {
      console.error('시그니처 메뉴 호출 실패:', error);
      setFeaturedMenus([]);
      pushCurrentView();
      clearTransientAnnouncements();
      setMode('featured-menu');
      setOrderDetailAnnouncement('시그니처 메뉴를 불러오지 못했어요. 전체 메뉴를 확인해 주세요.');
    } finally {
      stopProcessingNotice();
      setIsSubmitting(false);
    }
  };

  const showCategoryBoard = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    startProcessingNotice();
    try {
      await ensureMenuCache();
      stopProcessingNotice();
      pushCurrentView();
      clearTransientAnnouncements();
      categoryNavTypeRef.current = 'entry';
      setMode('category-select');
    } finally {
      stopProcessingNotice();
      setIsSubmitting(false);
    }
  };

  const showCategoryMenus = (categoryName: string) => {
    setSelectedCategory(categoryName);
    pushCurrentView();
    clearTransientAnnouncements();
    setMode('category-menu');
  };

  const showFullMenuBoard = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    startProcessingNotice();
    try {
      await ensureMenuCache();
      stopProcessingNotice();
      pushCurrentView();
      clearTransientAnnouncements();
      setMode('full-menu');
    } finally {
      stopProcessingNotice();
      setIsSubmitting(false);
    }
  };

  const showRecommendationInput = () => {
    pushCurrentView();
    clearTransientAnnouncements();
    setSessionId(null);
    setRecommendMenus([]);
    setMode('order-dialog');
    setLastResponse({
      intent: 'RECOMMEND_INPUT',
      quickReplies: [],
      response:
        '추천 받고 싶은 메뉴를 말씀해 주세요. 추천 문장들을 듣고 싶다면 텍스트 필드 아래에 있어요. 마음에 드시는 문장을 선택하시면 바로 주문으로 도와드릴 수 있어요.',
      slots: { menu: null, optionSlots: [], quantity: null },
      slotsComplete: false,
    });

    startProcessingNotice();
    fetchRecommendHints(RESTAURANT_ID)
      .then((data) => {
        stopProcessingNotice();
        setRecommendHints(data.hints);
      })
      .catch((error) => {
        stopProcessingNotice();
        console.error('추천 힌트 API 호출 실패:', error);
        setRecommendHints([]);
      });
  };

  const showDirectInput = () => {
    pushCurrentView();
    clearTransientAnnouncements();
    setSessionId(null);
    setRecommendMenus([]);
    setMode('order-dialog');
    setLastResponse({
      intent: 'DIRECT_INPUT',
      quickReplies: [],
      response: '주문하실 메뉴와 수량을 입력해 주세요.',
      slots: { menu: null, optionSlots: [], quantity: null },
      slotsComplete: false,
    });
  };

  const handleHomeAction = (action: HomeAction) => {
    if (action.label === '메뉴판') {
      showFeaturedMenuBoard();
      return;
    }
    if (action.label === '메뉴 추천') {
      showRecommendationInput();
      return;
    }
    if (action.label === '즉시 주문') {
      showDirectInput();
      return;
    }
    submitOrderText(action.speechInput, null);
  };

  const handleMenuSelect = (menuName: string) => {
    setSessionId(null);
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    window.setTimeout(() => {
      submitOrderText(menuName, null, { preserveInput: true });
    }, 1100);
  };

  const announceHomeUsageGuide = () => {
    setHomeUsageAnnouncement('');
    window.setTimeout(() => setHomeUsageAnnouncement(HOME_USAGE_GUIDE), 50);
  };

  const toggleOptionalOptions = async () => {
    if (!sessionId || !currentMenuId) {
      announceOrderDetail('먼저 메뉴와 필수 옵션을 선택해 주세요.');
      return;
    }

    const nextVisible = !showOptionalOptions;
    setShowOptionalOptions(nextVisible);
    if (!nextVisible || optionalOptions?.menuId === currentMenuId) return;

    startProcessingNotice();
    try {
      const data = await fetchMenuOptionalOptions(currentMenuId);
      stopProcessingNotice();
      setOptionalOptions(data);
    } catch (error) {
      stopProcessingNotice();
      console.error('선택 옵션 조회 API 호출 실패:', error);
      announceOrderDetail('추가 옵션을 불러오지 못했어요.');
    }
  };

  const handleOptionalOptionSelect = async (
    group: MenuOptionalOptionsResponse['optionGroups'][number],
    optionItemId: number,
  ) => {
    if (!sessionId || !currentMenuId || isSubmitting) return;

    setIsSubmitting(true);
    startProcessingNotice();
    try {
      const data = await selectOrderOption({
        sessionId,
        menuId: currentMenuId,
        optionGroupId: group.optionGroupId,
        optionItemId,
      });
      stopProcessingNotice();
      setSelectedOptionalOptions((current) => [
        ...current.filter((option) => option.optionGroupId !== data.optionGroupId),
        data,
      ]);
      announceOrderDetail('선택되었습니다.');
    } catch (error) {
      stopProcessingNotice();
      console.error('선택 옵션 변경 API 호출 실패:', error);
      announceOrderDetail('선택 옵션을 반영하지 못했어요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const groupedMenus = useMemo(() => {
    const groups: [string, MenuInfo[]][] = [];
    if (!menuCache) return groups;

    const map = new Map<string, MenuInfo[]>();
    menuCache.menus
      .filter((menu) => menu.isAvailable)
      .forEach((menu) => {
        const name = menu.category?.name ?? '기타';
        map.set(name, [...(map.get(name) ?? []), menu]);
      });
    map.forEach((menus, name) => groups.push([name, menus]));
    return groups;
  }, [menuCache]);

  useEffect(() => {
    if (mode !== 'full-menu') return;
    const timer = setTimeout(() => firstFullMenuButtonRef.current?.focus(), 0);
    return () => clearTimeout(timer);
  }, [groupedMenus, mode]);

  const menuPriceByName = (name: string, fallback?: number) =>
    findMenuByName(menuCache, name)?.price ?? fallback ?? 0;
  const firstFullMenuId = groupedMenus[0]?.[1]?.[0]?.menuId ?? null;

  if (completeResponse) {
    return (
      <CompletePage
        completionMessage={completeResponse.response}
        guideMessage={completeResponse.response}
        onHome={goHome}
        speak={speak}
      />
    );
  }

  if (mode === 'featured-menu') {
    return (
      <div className="voisk-screen-bg text-ink">
        {loadingText && <LoadingOverlay text={loadingText} />}
        <div className="mx-auto flex h-dvh w-full max-w-[440px] flex-col px-5 pb-3 pt-[max(24px,env(safe-area-inset-top))]">
          <AppHeader onBack={goBack} subtitle={RESTAURANT_DISPLAY_NAME} />
          <p ref={featuredGuideRef} tabIndex={0} className="sr-only">
            이 매장의 시그니처 메뉴입니다. 카테고리와 전체 메뉴 버튼도 하단에 있습니다.
          </p>
          <p className="mb-3 text-2xl font-black text-accent">시그니처 메뉴</p>
          <div aria-live="polite" className="sr-only">{orderDetailAnnouncement}</div>
          <div className="-mx-5 min-h-0 flex-1 overflow-y-auto px-5">
            <div className="grid gap-2">
              {featuredMenus.map((menu) => (
                <button
                  key={menu.menuId}
                  type="button"
                  onClick={() => handleMenuSelect(menu.name)}
                  aria-label={`${menu.name} ${formatPrice(menuPriceByName(menu.name, menu.price))}`}
                  className="flex items-center gap-3 rounded-lg border-4 border-line bg-surface px-5 py-4 text-left shadow-[0_12px_28px_rgba(15,23,42,0.09)] focus:outline focus:outline-4 focus:outline-focusring focus:[outline-offset:-4px]"
                >
                  <span
                    className={`min-w-0 flex-1 break-keep font-black leading-tight text-ink ${getMenuNameSize(menu.name)}`}
                  >
                    {menu.name}
                  </span>
                  <span aria-hidden="true" className="shrink-0 text-xl font-black text-muted">
                    {formatPrice(menuPriceByName(menu.name, menu.price))}
                  </span>
                </button>
              ))}
              {featuredMenus.length === 0 && (
                <p className="rounded-lg border-4 border-line bg-surface px-5 py-4 text-lg font-black text-muted">
                  시그니처 메뉴를 불러오지 못했어요.
                </p>
              )}
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={showCategoryBoard}
              className="min-h-14 rounded-xl border-4 border-accent-edge bg-accent px-4 text-xl font-black text-on-accent shadow-[0_16px_38px_rgba(15,23,42,0.18)] focus:outline-none focus:ring-4 focus:ring-focusring"
            >
              카테고리 보기
            </button>
            <button
              type="button"
              onClick={showFullMenuBoard}
              className="min-h-14 rounded-xl border-4 border-accent-edge bg-accent px-4 text-xl font-black text-on-accent shadow-[0_16px_38px_rgba(15,23,42,0.18)] focus:outline-none focus:ring-4 focus:ring-focusring"
            >
              전체 메뉴
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'category-select') {
    return (
      <div className="voisk-screen-bg text-ink">
        {loadingText && <LoadingOverlay text={loadingText} />}
        <div className="mx-auto flex h-dvh w-full max-w-[440px] flex-col px-5 pb-3 pt-[max(24px,env(safe-area-inset-top))]">
          <AppHeader onBack={goBack} subtitle={RESTAURANT_DISPLAY_NAME} />
          <p ref={categorySelectGuideRef} tabIndex={0} className="sr-only">
            카테고리 목록입니다.
          </p>
          <p className="mb-3 text-2xl font-black text-accent">카테고리</p>
          <div aria-live="polite" className="sr-only">{orderDetailAnnouncement}</div>
          <div className="-mx-5 min-h-0 flex-1 overflow-y-auto px-5">
            <div className="grid gap-2">
              {groupedMenus.map(([categoryName], index) => (
                <button
                  ref={index === 0 ? firstCategoryButtonRef : undefined}
                  key={categoryName}
                  type="button"
                  onClick={() => showCategoryMenus(categoryName)}
                  className="rounded-lg border-4 border-line bg-surface px-5 py-4 text-left shadow-[0_12px_28px_rgba(15,23,42,0.09)] focus:outline focus:outline-4 focus:outline-focusring focus:[outline-offset:-4px]"
                >
                  <span className={`block break-keep font-black leading-tight text-ink ${getMenuNameSize(categoryName)}`}>
                    {categoryName}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={showFullMenuBoard}
            className="mt-3 min-h-14 rounded-xl border-4 border-accent-edge bg-accent px-4 text-xl font-black text-on-accent shadow-[0_16px_38px_rgba(15,23,42,0.18)] focus:outline-none focus:ring-4 focus:ring-focusring"
          >
            전체 메뉴 보기
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'category-menu') {
    const categoryMenus = groupedMenus.find(([name]) => name === selectedCategory)?.[1] ?? [];
    return (
      <div className="voisk-screen-bg text-ink">
        {loadingText && <LoadingOverlay text={loadingText} />}
        <div className="mx-auto flex h-dvh w-full max-w-[440px] flex-col px-5 pb-3 pt-[max(24px,env(safe-area-inset-top))]">
          <AppHeader onBack={goBack} subtitle={selectedCategory ?? '메뉴'} />
          <p className="mb-3 text-2xl font-black text-accent">{selectedCategory}</p>
          <div className="-mx-5 min-h-0 flex-1 overflow-y-auto px-5">
            <div className="grid gap-2">
              {categoryMenus.map((menu) => (
                <button
                  key={menu.menuId}
                  type="button"
                  onClick={() => handleMenuSelect(menu.name)}
                  aria-label={`${menu.name} ${formatPrice(menu.price)}`}
                  className="flex items-center gap-3 rounded-lg border-4 border-line bg-surface px-5 py-3.5 text-left shadow-[0_12px_28px_rgba(15,23,42,0.09)] focus:outline focus:outline-4 focus:outline-focusring focus:[outline-offset:-4px]"
                >
                  <span
                    className={`min-w-0 flex-1 break-keep font-black leading-tight text-ink ${getMenuNameSize(menu.name)}`}
                  >
                    {menu.name}
                  </span>
                  <span aria-hidden="true" className="shrink-0 text-xl font-black text-muted">
                    {formatPrice(menu.price)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'full-menu') {
    return (
      <div className="voisk-screen-bg text-ink">
        {loadingText && <LoadingOverlay text={loadingText} />}
        <div className="mx-auto flex h-dvh w-full max-w-[440px] flex-col px-5 pb-3 pt-[max(24px,env(safe-area-inset-top))]">
          <AppHeader onBack={goBack} subtitle="전체 메뉴" />
          <p ref={responseGuideRef} tabIndex={-1} className="sr-only">
            {`${RESTAURANT_DISPLAY_NAME} 전체 메뉴판입니다. 메뉴명과 가격을 확인한 뒤 선택해 주세요.`}
          </p>
          <div className="-mx-5 min-h-0 flex-1 overflow-y-auto px-5">
            <div className="grid gap-4">
              {groupedMenus.map(([categoryName, menus]) => (
                <div key={categoryName}>
                  <p aria-hidden="true" className="mb-2 text-lg font-black text-accent">{categoryName}</p>
                  <div className="grid gap-2">
                    {menus.map((menu) => (
                      <button
                        ref={menu.menuId === firstFullMenuId ? firstFullMenuButtonRef : undefined}
                        key={menu.menuId}
                        type="button"
                        onClick={() => handleMenuSelect(menu.name)}
                        aria-label={`${menu.name} ${formatPrice(menu.price)}`}
                        className="flex items-center gap-3 rounded-lg border-4 border-line bg-surface px-5 py-3.5 text-left shadow-[0_12px_28px_rgba(15,23,42,0.09)] focus:outline focus:outline-4 focus:outline-focusring focus:[outline-offset:-4px]"
                      >
                        <span
                          className={`min-w-0 flex-1 break-keep font-black leading-tight text-ink ${getMenuNameSize(menu.name)}`}
                        >
                          {menu.name}
                        </span>
                        <span aria-hidden="true" className="shrink-0 text-xl font-black text-muted">
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

  if (mode === 'order-dialog') {
    const isRecommendationInput = dialogStep === 'recommend-input';
    const isRecommendationResult = dialogStep === 'recommend';
    const isConfirm = dialogStep === 'confirm';
    const textSubmit = isRecommendationInput ? showRecommendations : (text: string) => submitOrderText(text);
    const commandInputLabel =
      dialogStep === 'option' || dialogStep === 'confirm'
        ? ''
        : `${STEP_TITLE[dialogStep]} 입력창`;
    const commandPlaceholder = isRecommendationInput
      ? '시원한 거 먹고 싶어'
      : dialogStep === 'option'
      ? ''
      : dialogStep === 'confirm'
      ? ''
      : '주문 내용을 입력해 주세요';

    return (
      <div className="voisk-screen-bg select-none text-ink">
        {loadingText && <LoadingOverlay text={loadingText} />}
        <div className="mx-auto flex h-dvh w-full max-w-[440px] flex-col px-5 pb-3 pt-[max(24px,env(safe-area-inset-top))]">
          <AppHeader onBack={goBack} subtitle={STEP_TITLE[dialogStep]} />
          {responseGuideText && (
            <p ref={responseGuideRef} tabIndex={0} className="sr-only">
              {responseGuideText}
            </p>
          )}
          <div aria-live="polite" aria-atomic="true" className="sr-only">
            {orderDetailAnnouncement}
            {optionDescription}
          </div>

          {/* 옵션이 길어지면 화면을 넘어가므로 다른 화면과 같은 스크롤 영역을 둔다 */}
          <div className="-mx-5 min-h-0 flex-1 overflow-y-auto px-5">
          {!isConfirm && (
            <TextCommandBox
              disabled={isSubmitting}
              inputRef={commandInputRef}
              label={commandInputLabel}
              onSubmit={textSubmit}
              placeholder={commandPlaceholder}
            />
          )}

          {isRecommendationInput && (
            <div className="mt-4 rounded-xl border-4 border-line bg-surface px-5 py-5 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
              <p className="text-lg font-black text-accent">추천 문장</p>
              <div className="mt-3 grid gap-2">
                {recommendHints.map((hint) => (
                  <button
                    key={hint.hintId}
                    type="button"
                    onClick={() => showRecommendationsByHint(hint)}
                    className="rounded-lg border-4 border-line bg-surface px-4 py-3 text-left text-lg font-black text-ink focus:outline focus:outline-4 focus:outline-focusring focus:[outline-offset:-4px]"
                  >
                    {getRecommendHintSentence(hint.label)}
                  </button>
                ))}
                {recommendHints.length === 0 && (
                  <p className="rounded-lg border-4 border-line bg-surface px-4 py-3 text-base font-black text-muted">
                    취향을 직접 입력하면 추천 메뉴를 받을 수 있어요.
                  </p>
                )}
              </div>
            </div>
          )}

          {isRecommendationResult && (
            <div className="mt-4 grid gap-2">
              {(recommendMenus.length > 0
                ? recommendMenus
                : quickReplies.map((reply) => ({
                    menuId: reply,
                    name: reply,
                    price: menuPriceByName(reply),
                  }))
              ).map((menu) => (
                <button
                  key={menu.menuId}
                  type="button"
                  onClick={() => handleMenuSelect(menu.name)}
                  aria-label={`${menu.name} ${formatPrice(menuPriceByName(menu.name, menu.price))}`}
                  className="flex items-center gap-3 rounded-xl bg-strong px-5 py-4 text-left font-black text-on-strong shadow-[0_16px_38px_rgba(15,23,42,0.18)] focus:outline-none focus:ring-4 focus:ring-focusring"
                >
                  <span className={`min-w-0 flex-1 break-keep leading-tight ${getMenuNameSize(menu.name)}`}>
                    {menu.name}
                  </span>
                  <span aria-hidden="true" className="shrink-0 text-xl text-on-strong">
                    {formatPrice(menuPriceByName(menu.name, menu.price))}
                  </span>
                </button>
              ))}
            </div>
          )}

          {dialogStep === 'option' && (
            <div className="mt-4 grid gap-3">
              <p className="text-lg font-black text-accent">필수 옵션</p>
              {requiredSlots.map((slot) => {
                const choices = slot.candidates?.filter((candidate) => candidate.name) ?? [];
                const slotName = slot.name ?? '';
                return (
                  <div key={slotName} className="rounded-xl border-4 border-line bg-surface p-3 shadow-[0_12px_28px_rgba(15,23,42,0.09)]">
                    <p
                      tabIndex={0}
                      className="mb-2 px-1 text-lg font-black text-ink focus:outline-none focus:ring-4 focus:ring-focusring"
                    >
                      {slotName}
                    </p>
                    <div className={`grid gap-2 ${choices.length <= 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                      {choices.map((candidate) => {
                        const label = getOptionButtonLabel(candidate.name);
                        const selected =
                          optimisticRequiredOptions[slotName] === candidate.name ||
                          candidate.selected ||
                          getSelectedOptionValue(slot) === candidate.name;
                        return (
                          <button
                            key={candidate.name}
                            type="button"
                            onClick={() => {
                              // 옵션 이름을 그대로 보낸다. 백엔드는 이 값을 받으면
                              // 슬롯에 바로 반영한다. '변경 안함'이나 '~ 선택' 같은 문장을
                              // 보내면 "…로 선택할까요?" 확인 단계가 한 번 더 생기는데,
                              // 그 확인 화면은 그리지 않으므로 버튼이 한 번 씹힌 것처럼 보인다.
                              const submitText = candidate.name;
                              setOptimisticRequiredOptions((current) => ({
                                ...current,
                                [slotName]: candidate.name,
                              }));
                              submitOrderText(submitText, sessionId, {
                                optimisticSlotName: slotName,
                                optimisticSlotValue: candidate.name,
                                preserveInput: true,
                              });
                            }}
                            aria-label={label}
                            className={`min-h-14 rounded-xl border-[3px] px-3 text-center text-base font-black shadow-[0_12px_28px_rgba(15,23,42,0.08)] focus:outline-none focus:ring-4 focus:ring-focusring ${
                              selected
                                ? 'border-line bg-strong text-on-strong'
                                : 'border-accent-line bg-accent text-on-accent'
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {isConfirm && (
            <div className="mt-4 grid gap-3">
              <p
                ref={confirmAnnouncementRef}
                tabIndex={0}
                className="sr-only"
              >
                {confirmInitialAnnouncement}
              </p>
              <TextCommandBox
                disabled={isSubmitting}
                inputRef={commandInputRef}
                label={commandInputLabel}
                onSubmit={textSubmit}
                placeholder={commandPlaceholder}
              />
              <button
                type="button"
                onClick={toggleOptionalOptions}
                className="min-h-14 rounded-xl border-4 border-line bg-surface px-5 text-left text-xl font-black text-accent shadow-[0_12px_28px_rgba(29,78,216,0.12)] focus:outline focus:outline-4 focus:outline-focusring focus:[outline-offset:-4px]"
              >
                추가 옵션 선택
              </button>
              {showOptionalOptions && (
                <div className="grid gap-2">
                  {optionalOptions?.optionGroups.length ? (
                    optionalOptions.optionGroups.map((optionGroup) => (
                      <div
                        key={optionGroup.optionGroupId}
                        className="rounded-xl border-4 border-line bg-surface p-3 shadow-[0_12px_28px_rgba(15,23,42,0.09)]"
                      >
                        <p className="mb-2 px-1 text-lg font-black text-ink">
                          {optionGroup.optionGroupName}
                        </p>
                        <div className="grid gap-2">
                          {optionGroup.optionItems.map((item) => {
                            const selected = selectedOptionalOptions.some(
                              (option) => option.selectedOptionItemId === item.optionItemId,
                            );
                            return (
                              <button
                                key={item.optionItemId}
                                type="button"
                                onClick={() => handleOptionalOptionSelect(optionGroup, item.optionItemId)}
                                aria-label={
                                  item.extraPrice > 0
                                    ? `${getOptionButtonLabel(item.optionItemName)} ${formatPrice(item.extraPrice)} 추가`
                                    : getOptionButtonLabel(item.optionItemName)
                                }
                                className={`min-h-12 rounded-lg border-[3px] px-4 text-left text-base font-black focus:outline-none focus:ring-4 focus:ring-focusring ${
                                  selected
                                    ? 'border-line bg-strong text-on-strong'
                                    : 'border-accent-line bg-accent text-on-accent'
                                }`}
                              >
                                {getOptionButtonLabel(item.optionItemName)}
                                {item.extraPrice > 0 && (
                                  <span aria-hidden="true" className="ml-2 text-base">
                                    +{formatPrice(item.extraPrice)}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-lg border-4 border-line bg-surface px-4 py-3 text-base font-black text-muted">
                      추가할 수 있는 옵션이 없습니다.
                    </p>
                  )}
                </div>
              )}
              <div className="rounded-xl border-4 border-line bg-surface px-5 py-4 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
                <p
                  tabIndex={0}
                  className="text-base font-black text-muted focus:outline-none focus:ring-4 focus:ring-focusring rounded"
                >
                  주문 확인
                </p>
                <div
                  tabIndex={0}
                  aria-label={`${requiredSummary?.menuName ?? selectedMenu ?? '선택한 메뉴'} ${formatPrice(displayTotalPrice)}`}
                  className="mt-1 focus:outline-none focus:ring-4 focus:ring-focusring rounded"
                >
                  <p aria-hidden="true" className="text-xl font-black leading-snug text-ink">
                    {requiredSummary?.menuName ?? selectedMenu}
                  </p>
                  <p aria-hidden="true" className="mt-2 text-xl font-black text-accent">
                    {formatPrice(displayTotalPrice)}
                  </p>
                </div>
                {selectedRequiredLabels.length > 0 && (
                  <p
                    tabIndex={0}
                    className="mt-2 text-base font-black text-muted focus:outline-none focus:ring-4 focus:ring-focusring rounded"
                  >
                    {selectedRequiredLabels.join(', ')}
                  </p>
                )}
                {selectedOptionalLabels.length > 0 && (
                  <p
                    tabIndex={0}
                    className="mt-2 text-base font-black text-muted focus:outline-none focus:ring-4 focus:ring-focusring rounded"
                  >
                    추가 옵션 {selectedOptionalLabels.join(', ')}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => submitOrderText(getConfirmReply(lastResponse), sessionId, { preserveInput: true })}
                className="min-h-16 rounded-xl bg-strong px-5 text-xl font-black text-on-strong shadow-[0_16px_38px_rgba(29,78,216,0.3)] focus:outline-none focus:ring-4 focus:ring-focusring"
              >
                이대로 주문
              </button>
            </div>
          )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="voisk-screen-bg select-none text-ink">
      {loadingText && <LoadingOverlay text={loadingText} />}
      <div className="mx-auto flex h-dvh w-full max-w-[440px] flex-col px-5 pb-3 pt-[max(24px,env(safe-area-inset-top))]">
        <AppHeader hideBack />
        <p ref={homeGuideRef} tabIndex={-1} className="sr-only">
          {HOME_INTRO_GUIDE}
        </p>
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {homeUsageAnnouncement}
        </div>

        <div className="flex flex-1 items-center">
          <div className="grid w-full gap-4 pb-16">
            {HOME_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => handleHomeAction(action)}
                  aria-label={`${action.label}. ${toSpokenText(action.description)}`}
                  className="relative flex min-h-24 items-center gap-4 overflow-hidden rounded-xl border-4 border-line bg-surface px-6 text-left text-accent shadow-[0_12px_30px_rgba(29,78,216,0.12)] focus:outline focus:outline-4 focus:outline-focusring focus:[outline-offset:-4px] active:scale-[0.99]"
                >
                  <Icon aria-hidden="true" className="shrink-0" size={34} />
                  <span className="relative shrink-0 text-[1.95rem] font-black leading-tight">
                    {action.label}
                  </span>
                  <span
                    aria-hidden="true"
                    className="relative ml-auto whitespace-pre-line break-keep text-right text-sm font-black leading-snug text-muted"
                  >
                    {action.description}
                  </span>
                </button>
              );
            })}
            {/*
              고대비 전환. 즉시 주문 바로 다음, 사용법 앞에 둔다.
              상태 변경은 aria-pressed로 VoiceOver가 직접 알려주므로 speak()를
              덧붙이지 않는다. 자체 TTS가 스크린리더 낭독과 겹치지 않게 하기 위해서다.
            */}
            <button
              type="button"
              onClick={() => setHighContrast(!highContrast)}
              aria-pressed={highContrast}
              aria-label={`고대비 화면 ${highContrast ? '켜짐' : '꺼짐'}`}
              className={`relative flex min-h-20 items-center gap-4 overflow-hidden rounded-xl border-4 border-line px-6 text-left shadow-[0_12px_30px_rgba(29,78,216,0.12)] focus:outline-none focus:ring-4 focus:ring-focusring active:scale-[0.99] ${
                highContrast ? 'bg-strong text-on-strong' : 'bg-surface text-accent'
              }`}
            >
              <Contrast aria-hidden="true" className="shrink-0" size={34} />
              <span className="relative shrink-0 text-[1.95rem] font-black leading-tight">
                고대비 화면
              </span>
              <span
                aria-hidden="true"
                className={`relative ml-auto whitespace-pre-line break-keep text-right text-sm font-black leading-snug ${
                  highContrast ? 'text-on-strong' : 'text-muted'
                }`}
              >
                {highContrast ? '눌러서\n끄기' : '글자를\n뚜렷하게'}
              </span>
            </button>
            <button
              type="button"
              onClick={announceHomeUsageGuide}
              aria-label="사용법"
              className="relative flex min-h-20 items-center gap-4 overflow-hidden rounded-xl border-4 border-line bg-surface px-6 text-left text-accent shadow-[0_12px_30px_rgba(29,78,216,0.12)] focus:outline focus:outline-4 focus:outline-focusring focus:[outline-offset:-4px] active:scale-[0.99]"
            >
              <CircleHelp aria-hidden="true" className="shrink-0" size={34} />
              <span className="relative shrink-0 text-[1.95rem] font-black leading-tight">사용법</span>
              <span
                aria-hidden="true"
                className="relative ml-auto whitespace-pre-line break-keep text-right text-sm font-black leading-snug text-muted"
              >
                {'첫 사용자 위한\n조작법 안내'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
