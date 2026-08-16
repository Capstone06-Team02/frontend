import { useCallback, useSyncExternalStore } from 'react';

/**
 * 고대비 / 큰 글자 설정.
 *
 * 값은 <html>의 data-contrast, data-text 속성으로만 나간다. 실제 색과 글자
 * 크기는 src/index.css의 선택자가 결정하므로, 화면 컴포넌트는 이 설정을
 * 알 필요가 없다. 덕분에 마크업을 조건부로 분기하지 않아도 되고
 * VoiceOver의 포커스 순서가 설정에 따라 흔들리지 않는다.
 *
 * React 바깥(document.documentElement)에 상태가 있으므로 Context 대신
 * 외부 스토어로 구독한다. App을 Provider로 감싸지 않아 트리도 그대로다.
 */

const CONTRAST_KEY = 'voisk:highContrast';
const TEXT_KEY = 'voisk:largeText';

export type AccessibilitySettings = {
  highContrast: boolean;
  largeText: boolean;
};

const readStored = (key: string, fallback: boolean) => {
  try {
    const stored = window.localStorage.getItem(key);
    return stored === null ? fallback : stored === 'true';
  } catch {
    // 사파리 프라이빗 모드 등에서 localStorage 접근이 막히면 기본값으로 둔다.
    return fallback;
  }
};

// 기본 화면도 이미 AAA 수준의 대비를 갖추고 있으므로 검정+노랑 모드는
// 기본으로 켜지 않는다. 저시력 사용자의 선호가 갈리는 영역이라
// (눈부심이 문제면 어두운 배경, 밝기가 필요하면 밝은 배경) 선택에 맡긴다.
const DEFAULT_HIGH_CONTRAST = false;
const DEFAULT_LARGE_TEXT = false;

let settings: AccessibilitySettings = {
  highContrast: readStored(CONTRAST_KEY, DEFAULT_HIGH_CONTRAST),
  largeText: readStored(TEXT_KEY, DEFAULT_LARGE_TEXT),
};

const listeners = new Set<() => void>();

const applyToDocument = ({ highContrast, largeText }: AccessibilitySettings) => {
  const root = document.documentElement;

  if (highContrast) {
    root.setAttribute('data-contrast', 'high');
  } else {
    root.removeAttribute('data-contrast');
  }

  if (largeText) {
    root.setAttribute('data-text', 'large');
  } else {
    root.removeAttribute('data-text');
  }
};

/** 저장된 설정을 <html>에 반영한다. 첫 렌더 전에 한 번 호출한다. */
export const initAccessibility = () => applyToDocument(settings);

const update = (patch: Partial<AccessibilitySettings>) => {
  settings = { ...settings, ...patch };

  try {
    window.localStorage.setItem(CONTRAST_KEY, String(settings.highContrast));
    window.localStorage.setItem(TEXT_KEY, String(settings.largeText));
  } catch {
    // 저장에 실패해도 이번 세션 동안은 적용된 상태를 유지한다.
  }

  applyToDocument(settings);
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = () => settings;

export const useAccessibility = () => {
  const current = useSyncExternalStore(subscribe, getSnapshot);

  const setHighContrast = useCallback(
    (enabled: boolean) => update({ highContrast: enabled }),
    [],
  );
  const setLargeText = useCallback((enabled: boolean) => update({ largeText: enabled }), []);

  return {
    highContrast: current.highContrast,
    largeText: current.largeText,
    setHighContrast,
    setLargeText,
  };
};
