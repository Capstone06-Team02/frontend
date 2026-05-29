import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, CircleHelp, Coffee, Lightbulb, Send } from 'lucide-react';
import { AppHeader } from '../components/AppHeader';
import { CompletePage } from './CompletePage';
import {
  cacheRestaurantMenus,
  fetchRecommendations,
  getDefaultRestaurantId,
  sendOrderText,
} from '../api/order';
import { useVoice } from '../hooks/useVoice';
import type {
  MenuCacheResponse,
  MenuInfo,
  OptionGroupInfo,
  OptionSlot,
  OrderApiResponse,
  RecommendationInfo,
} from '../types/order';
import { wantsRecommendation } from '../utils/cafeOrder';
import { formatPrice } from '../utils/format';
import { normalizeOrderText } from '../utils/voice';

type ScreenMode = 'home' | 'featured-menu' | 'full-menu' | 'order-dialog';
type DialogStep = 'input' | 'recommend-input' | 'recommend' | 'option' | 'confirm' | 'complete' | 'continue';
type ViewSnapshot = {
  lastResponse: OrderApiResponse | null;
  mode: ScreenMode;
  sessionId: string | null;
};
type SubmitOrderOptions = {
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
  label: string;
  onSubmit: (text: string) => void;
  placeholder: string;
};

const RESTAURANT_ID = getDefaultRestaurantId();
const RESTAURANT_DISPLAY_NAME = '중앙대 카페';
const FEATURED_RECOMMEND_TEXT = '대표 메뉴 추천해줘';
const HOME_INTRO_GUIDE = `음성으로 주문이 가능한 Voisk입니다.
음성 주문 사용법을 들으시려면 오른쪽으로 한 번 스와이프 후 탭 해주세요. 첫 사용이라면 듣기를 추천드려요.
바로 주문하시려면 두 번 스와이프 후 원하시는 기능 3가지 중 하나를 선택해주세요.`;
const HOME_USAGE_GUIDE =
  '이제 마이크 대신 입력창을 사용합니다. 입력창에서 휴대폰 기본 받아쓰기 버튼을 누르면 음성으로 입력할 수 있어요. 메뉴를 직접 입력하거나 예시 문장을 선택한 뒤 전송하면 됩니다.';
const RECOMMEND_EXAMPLES = ['시원한 거 먹고 싶어', '달달한 거 먹고 싶어', '커피 없는 메뉴 알려줘'];

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
const getConfirmReply = (data: OrderApiResponse | null) =>
  getReplies(data).find((reply) => ['확인', '네', '맞습니다'].includes(reply)) ?? '확인';
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

const getSelectedOptionLabels = (data: OrderApiResponse | null) =>
  getSlotOptionSlots(data)
    .map((slot) => {
      const selected = getSelectedOptionValue(slot);
      return selected ? `${slot.name} ${selected}` : null;
    })
    .filter(Boolean) as string[];

const isFinalCompleteResponse = (data: OrderApiResponse) => {
  const response = data.response ?? '';
  return (
    data.intent === 'CONFIRM' &&
    getReplies(data).length === 0 &&
    (response.includes('주문 완료') || response.includes('완료되었습니다') || response.includes('나올게요'))
  );
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

const getOptionDescription = (group: OptionGroupInfo | OptionSlot) => {
  const candidates = 'optionItems' in group ? group.optionItems : group.candidates;
  const choices = candidates?.map((candidate) => candidate.name).filter(Boolean) ?? [];
  if (choices.length === 0) return `${group.name ?? '옵션'} 옵션입니다.`;
  return `${group.name ?? '옵션'} 옵션은 ${choices.join(', ')} 중에서 선택할 수 있습니다.`;
};

const TextCommandBox = ({ disabled = false, label, onSubmit, placeholder }: TextCommandBoxProps) => {
  const [value, setValue] = useState('');

  const submit = () => {
    const text = value.trim();
    if (!text || disabled) return;
    setValue('');
    onSubmit(text);
  };

  return (
    <form
      className="grid gap-2 rounded-xl bg-white/95 p-3 shadow-[0_12px_30px_rgba(15,23,42,0.08)]"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <label className="sr-only" htmlFor={label}>{label}</label>
      <textarea
        id={label}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        rows={2}
        disabled={disabled}
        placeholder={placeholder}
        className="min-h-20 resize-none rounded-lg border-2 border-blue-100 bg-blue-50/40 px-4 py-3 text-lg font-black leading-snug text-slate-950 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:opacity-60"
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        aria-label="입력한 내용 전송"
        className="flex min-h-12 items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 text-lg font-black text-white shadow-[0_12px_28px_rgba(29,78,216,0.22)] focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:bg-slate-300 disabled:shadow-none"
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
  const [featuredMenus, setFeaturedMenus] = useState<RecommendationInfo[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [homeUsageAnnouncement, setHomeUsageAnnouncement] = useState('');
  const [orderDetailAnnouncement, setOrderDetailAnnouncement] = useState('');
  const [optionDescription, setOptionDescription] = useState('');
  const [showOptionalOptions, setShowOptionalOptions] = useState(false);

  const homeGuideRef = useRef<HTMLParagraphElement>(null);
  const responseGuideRef = useRef<HTMLParagraphElement>(null);
  const viewHistoryRef = useRef<ViewSnapshot[]>([]);
  const { speak } = useVoice();

  const dialogStep = getDialogStep(lastResponse);
  const quickReplies = getReplies(lastResponse);
  const selectedMenu = getSlotMenu(lastResponse);
  const selectedQuantity = getSlotQuantity(lastResponse);
  const totalPrice = getSlotTotalPrice(lastResponse);
  const selectedOptionLabels = getSelectedOptionLabels(lastResponse);
  const currentMenu = findMenuByName(menuCache, selectedMenu);
  const requiredSlots = getSlotOptionSlots(lastResponse).filter((slot) => slot.required);
  const optionalSlots = getSlotOptionSlots(lastResponse).filter((slot) => slot.required === false);
  const optionalGroups = currentMenu?.optionGroups.filter((group) => !group.isRequired && group.isAvailable) ?? [];
  const visibleOptionalOptions = optionalSlots.length > 0 ? optionalSlots : optionalGroups;
  const responseGuideText =
    dialogStep === 'confirm' && selectedMenu
      ? `${selectedMenu} ${selectedQuantity ?? 1}개, 총 ${formatPrice(totalPrice ?? getSlotUnitPrice(lastResponse) ?? 0)}입니다. 이대로 주문하시겠습니까?`
      : lastResponse?.response ?? '';

  useEffect(() => {
    if (mode !== 'home') return;
    const timer = setTimeout(() => homeGuideRef.current?.focus(), 0);
    return () => clearTimeout(timer);
  }, [mode]);

  useEffect(() => {
    if (mode !== 'order-dialog' || !responseGuideText) return;
    const timer = setTimeout(() => responseGuideRef.current?.focus(), 0);
    return () => clearTimeout(timer);
  }, [mode, responseGuideText]);

  const ensureMenuCache = async () => {
    if (menuCache) return menuCache;
    const data = await cacheRestaurantMenus(RESTAURANT_ID);
    setMenuCache(data);
    return data;
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
    setMode('home');
    setLastResponse(null);
    setCompleteResponse(null);
    setSessionId(null);
    setShowOptionalOptions(false);
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

    setMode(previous.mode);
    setSessionId(previous.sessionId);
    setLastResponse(previous.lastResponse);
    setShowOptionalOptions(false);
  };

  const submitOrderText = async (
    rawInput: string,
    nextSessionId: string | null = sessionId,
    options: SubmitOrderOptions = {},
  ) => {
    const input = options.preserveInput ? rawInput.trim() : normalizeOrderText(rawInput);
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

    setIsSubmitting(true);
    try {
      await ensureMenuCache();
      const data = await sendOrderText(input, nextSessionId, RESTAURANT_ID);
      const newSessionId = data.sessionId ?? nextSessionId;
      setSessionId(newSessionId);
      setShowOptionalOptions(false);

      if (isFinalCompleteResponse(data)) {
        setCompleteResponse(data);
        return;
      }

      pushCurrentView();
      setMode('order-dialog');
      setLastResponse(data);
    } catch (error) {
      console.error('주문 API 호출 실패:', error);
      setOrderDetailAnnouncement('서버와 연결하지 못했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
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
        response: data.ttsText || '추천 메뉴입니다. 원하는 메뉴를 선택해 주세요.',
        slots: { menu: null, optionSlots: [], quantity: null },
        slotsComplete: false,
      });
    } catch (error) {
      console.error('추천 API 호출 실패:', error);
      setOrderDetailAnnouncement('추천 메뉴를 불러오지 못했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const showFeaturedMenuBoard = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      await ensureMenuCache();
      const data = await fetchRecommendations(FEATURED_RECOMMEND_TEXT, RESTAURANT_ID);
      setFeaturedMenus(data.recommendations);
      pushCurrentView();
      setMode('featured-menu');
    } catch (error) {
      console.error('대표 메뉴 호출 실패:', error);
      setFeaturedMenus([]);
      pushCurrentView();
      setMode('featured-menu');
      setOrderDetailAnnouncement('대표 메뉴를 불러오지 못했어요. 전체 메뉴를 확인해 주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const showFullMenuBoard = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await ensureMenuCache();
      pushCurrentView();
      setMode('full-menu');
    } finally {
      setIsSubmitting(false);
    }
  };

  const showRecommendationInput = () => {
    pushCurrentView();
    setSessionId(null);
    setMode('order-dialog');
    setLastResponse({
      intent: 'RECOMMEND_INPUT',
      quickReplies: [],
      response: '추천받고 싶은 취향을 입력해 주세요.',
      slots: { menu: null, optionSlots: [], quantity: null },
      slotsComplete: false,
    });
  };

  const showDirectInput = () => {
    pushCurrentView();
    setSessionId(null);
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
    submitOrderText(menuName, null, { preserveInput: true });
  };

  const announceHomeUsageGuide = () => {
    setHomeUsageAnnouncement('');
    window.setTimeout(() => setHomeUsageAnnouncement(HOME_USAGE_GUIDE), 50);
  };

  const announceOrderDetail = () => {
    const details = [
      selectedMenu,
      selectedQuantity != null ? `${selectedQuantity}개` : null,
      ...selectedOptionLabels,
      typeof totalPrice === 'number' ? `총 ${formatPrice(totalPrice)}` : null,
    ]
      .filter(Boolean)
      .join(', ');
    setOrderDetailAnnouncement('');
    window.setTimeout(() => setOrderDetailAnnouncement(details || '주문 내역이 아직 없습니다.'), 50);
  };

  const announceOptionDescription = (option: OptionGroupInfo | OptionSlot) => {
    setOptionDescription('');
    window.setTimeout(() => setOptionDescription(getOptionDescription(option)), 50);
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

  const menuPriceByName = (name: string, fallback?: number) =>
    findMenuByName(menuCache, name)?.price ?? fallback ?? 0;

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
      <div className="voisk-screen-bg text-slate-950">
        <div className="mx-auto flex h-dvh w-full max-w-[440px] flex-col px-5 pb-3 pt-[max(24px,env(safe-area-inset-top))]">
          <AppHeader onBack={goBack} subtitle={RESTAURANT_DISPLAY_NAME} />
          <p className="mb-3 text-2xl font-black text-blue-700">대표 메뉴</p>
          <div aria-live="polite" className="sr-only">{orderDetailAnnouncement}</div>
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="grid gap-2">
              {featuredMenus.map((menu) => (
                <button
                  key={menu.menuId}
                  type="button"
                  onClick={() => handleMenuSelect(menu.name)}
                  disabled={isSubmitting}
                  aria-label={`${menu.name} ${formatPrice(menuPriceByName(menu.name, menu.price))}`}
                  className="rounded-lg bg-white/95 px-5 py-4 text-left shadow-[0_12px_28px_rgba(15,23,42,0.09)] focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:opacity-60"
                >
                  <span className="block text-xl font-black text-slate-950">{menu.name}</span>
                  <span aria-hidden="true" className="mt-1 block text-base font-black text-slate-500">
                    {formatPrice(menuPriceByName(menu.name, menu.price))}
                  </span>
                </button>
              ))}
              {featuredMenus.length === 0 && (
                <p className="rounded-lg bg-white/95 px-5 py-4 text-lg font-black text-slate-500">
                  대표 메뉴를 불러오지 못했어요.
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={showFullMenuBoard}
            disabled={isSubmitting}
            className="mt-3 min-h-14 rounded-xl bg-slate-950 px-4 text-xl font-black text-white shadow-[0_16px_38px_rgba(15,23,42,0.18)] focus:outline-none focus:ring-4 focus:ring-blue-300"
          >
            전체 메뉴 보기
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'full-menu') {
    return (
      <div className="voisk-screen-bg text-slate-950">
        <div className="mx-auto flex h-dvh w-full max-w-[440px] flex-col px-5 pb-3 pt-[max(24px,env(safe-area-inset-top))]">
          <AppHeader onBack={goBack} subtitle="전체 메뉴" />
          <p ref={responseGuideRef} tabIndex={-1} className="sr-only">
            {`${RESTAURANT_DISPLAY_NAME} 전체 메뉴판입니다. 메뉴명과 가격을 확인한 뒤 선택해 주세요.`}
          </p>
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="grid gap-4">
              {groupedMenus.map(([categoryName, menus]) => (
                <div key={categoryName}>
                  <p aria-hidden="true" className="mb-1.5 text-sm font-black text-blue-700">{categoryName}</p>
                  <div className="grid gap-2">
                    {menus.map((menu) => (
                      <button
                        key={menu.menuId}
                        type="button"
                        onClick={() => handleMenuSelect(menu.name)}
                        disabled={isSubmitting}
                        aria-label={`${menu.name} ${formatPrice(menu.price)}`}
                        className="rounded-lg bg-white/95 px-5 py-3.5 text-left shadow-[0_12px_28px_rgba(15,23,42,0.09)] focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:opacity-70"
                      >
                        <span className="block text-xl font-black leading-tight text-slate-950">{menu.name}</span>
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

  if (mode === 'order-dialog') {
    const isRecommendationInput = dialogStep === 'recommend-input';
    const isRecommendationResult = dialogStep === 'recommend';
    const isConfirm = dialogStep === 'confirm';
    const textSubmit = isRecommendationInput ? showRecommendations : (text: string) => submitOrderText(text);

    return (
      <div className="voisk-screen-bg select-none text-slate-950">
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

          <TextCommandBox
            disabled={isSubmitting}
            label={`${STEP_TITLE[dialogStep]} 입력창`}
            onSubmit={textSubmit}
            placeholder={
              isRecommendationInput
                ? '예: 시원한 거 먹고 싶어'
                : '예: 슈크림 라떼 2개 아이스로 톨 사이즈'
            }
          />

          {isRecommendationInput && (
            <div className="mt-4 rounded-xl bg-white/95 px-5 py-5 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
              <p className="text-lg font-black text-blue-700">이렇게 말할 수 있어요</p>
              <div className="mt-3 grid gap-2">
                {RECOMMEND_EXAMPLES.map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => showRecommendations(example)}
                    disabled={isSubmitting}
                    className="rounded-lg border border-blue-100 bg-blue-50/70 px-4 py-3 text-left text-lg font-black text-slate-950 focus:outline-none focus:ring-4 focus:ring-blue-300"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          )}

          {isRecommendationResult && (
            <div className="mt-4 grid gap-2">
              {quickReplies.map((reply) => (
                <button
                  key={reply}
                  type="button"
                  onClick={() => handleMenuSelect(reply)}
                  disabled={isSubmitting}
                  aria-label={`${reply} ${formatPrice(menuPriceByName(reply))}`}
                  className="rounded-xl bg-slate-950 px-5 py-4 text-left text-xl font-black text-white shadow-[0_16px_38px_rgba(15,23,42,0.18)] focus:outline-none focus:ring-4 focus:ring-blue-300"
                >
                  <span>{reply}</span>
                  <span aria-hidden="true" className="mt-1 block text-sm text-slate-300">
                    {formatPrice(menuPriceByName(reply))}
                  </span>
                </button>
              ))}
            </div>
          )}

          {dialogStep === 'option' && (
            <div className="mt-4 grid gap-3">
              <p className="text-lg font-black text-blue-700">필수 옵션</p>
              {(requiredSlots.length > 0 ? requiredSlots : getSlotOptionSlots(lastResponse)).map((slot) => (
                <div key={slot.name} className="grid grid-cols-[1fr_5rem] gap-2">
                  <button
                    type="button"
                    onClick={() => setOrderDetailAnnouncement(slot.name ?? '옵션')}
                    className="min-h-14 rounded-xl bg-slate-950 px-4 text-left text-lg font-black text-white focus:outline-none focus:ring-4 focus:ring-blue-300"
                  >
                    {slot.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => announceOptionDescription(slot)}
                    className="min-h-14 rounded-xl bg-blue-50 px-3 text-base font-black text-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300"
                  >
                    설명
                  </button>
                </div>
              ))}
              {quickReplies.length > 0 && (
                <div className="grid gap-2">
                  {quickReplies.map((reply) => (
                    <button
                      key={reply}
                      type="button"
                      onClick={() => submitOrderText(reply, sessionId, { preserveInput: true })}
                      disabled={isSubmitting}
                      className="min-h-14 rounded-xl bg-white/95 px-4 text-left text-lg font-black text-slate-950 shadow-[0_12px_28px_rgba(15,23,42,0.09)] focus:outline-none focus:ring-4 focus:ring-blue-300"
                    >
                      {reply}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {isConfirm && (
            <div className="mt-4 grid gap-3">
              <div className="rounded-xl bg-white/95 px-5 py-4 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
                <p className="text-sm font-black text-slate-500">주문 확인</p>
                <p className="mt-1 text-2xl font-black text-slate-950">{selectedMenu}</p>
                <p className="mt-1 text-xl font-black text-blue-700">
                  {formatPrice(totalPrice ?? getSlotUnitPrice(lastResponse) ?? 0)}
                </p>
              </div>
              <button
                type="button"
                onClick={announceOrderDetail}
                className="min-h-14 rounded-xl bg-white/95 px-5 text-left text-xl font-black text-slate-950 shadow-[0_12px_28px_rgba(15,23,42,0.09)] focus:outline-none focus:ring-4 focus:ring-blue-300"
              >
                주문 내역 확인
              </button>
              <button
                type="button"
                onClick={() => setShowOptionalOptions((current) => !current)}
                className="min-h-14 rounded-xl bg-blue-50 px-5 text-left text-xl font-black text-blue-700 shadow-[0_12px_28px_rgba(29,78,216,0.12)] focus:outline-none focus:ring-4 focus:ring-blue-300"
              >
                추가 옵션 선택
              </button>
              {showOptionalOptions && (
                <div className="grid gap-2">
                  {visibleOptionalOptions.length > 0 ? (
                    visibleOptionalOptions.map((option) => (
                      <div key={option.name} className="grid grid-cols-[1fr_5rem] gap-2">
                        <button
                          type="button"
                          onClick={() => submitOrderText(option.name ?? '', sessionId, { preserveInput: true })}
                          className="min-h-14 rounded-xl bg-slate-950 px-4 text-left text-lg font-black text-white focus:outline-none focus:ring-4 focus:ring-blue-300"
                        >
                          {option.name}
                        </button>
                        <button
                          type="button"
                          onClick={() => announceOptionDescription(option)}
                          className="min-h-14 rounded-xl bg-blue-50 px-3 text-base font-black text-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300"
                        >
                          설명
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-lg bg-white/95 px-4 py-3 text-base font-black text-slate-500">
                      추가할 수 있는 옵션이 없습니다.
                    </p>
                  )}
                </div>
              )}
              <button
                type="button"
                onClick={() => submitOrderText(getConfirmReply(lastResponse), sessionId, { preserveInput: true })}
                disabled={isSubmitting}
                className="min-h-16 rounded-xl bg-blue-700 px-5 text-xl font-black text-white shadow-[0_16px_38px_rgba(29,78,216,0.3)] focus:outline-none focus:ring-4 focus:ring-blue-300"
              >
                이대로 주문
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="voisk-screen-bg select-none text-slate-950">
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
                  aria-label={`${action.label}. ${action.description}`}
                  className="relative flex min-h-24 items-center gap-4 overflow-hidden rounded-xl border-2 border-blue-100 bg-white/95 px-6 text-left text-blue-700 shadow-[0_12px_30px_rgba(29,78,216,0.12)] focus:outline-none focus:ring-4 focus:ring-blue-300 active:scale-[0.99]"
                >
                  <Icon aria-hidden="true" className="shrink-0" size={32} />
                  <span className="relative">
                    <span className="block text-[1.65rem] font-black leading-tight">{action.label}</span>
                    <span aria-hidden="true" className="mt-1 block text-sm font-bold text-slate-500">
                      {action.description}
                    </span>
                  </span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={announceHomeUsageGuide}
              aria-label="사용법"
              className="relative flex min-h-20 items-center gap-4 overflow-hidden rounded-xl border-2 border-blue-100 bg-white/95 px-6 text-left text-blue-700 shadow-[0_12px_30px_rgba(29,78,216,0.12)] focus:outline-none focus:ring-4 focus:ring-blue-300 active:scale-[0.99]"
            >
              <CircleHelp aria-hidden="true" className="shrink-0" size={32} />
              <span className="relative">
                <span className="block text-[1.45rem] font-black leading-tight">사용법</span>
                <span aria-hidden="true" className="mt-1 block text-sm font-bold text-slate-500">
                  처음 이용하시면 먼저 들어보세요.
                </span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
