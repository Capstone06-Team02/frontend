import { useRef } from 'react';

export const useSwipeFocus = () => {
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const touchStartX = useRef<number | null>(null);

  const moveFocus = (direction: 1 | -1) => {
    const activeIndex = buttonRefs.current.findIndex((button) => button === document.activeElement);
    const fallbackIndex = direction === 1 ? 0 : buttonRefs.current.length - 1;
    const nextIndex =
      activeIndex === -1
        ? fallbackIndex
        : Math.min(Math.max(activeIndex + direction, 0), buttonRefs.current.length - 1);

    buttonRefs.current[nextIndex]?.focus();
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLElement>) => {
    touchStartX.current = event.touches[0].clientX;
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLElement>) => {
    if (touchStartX.current === null) return;

    const diffX = event.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;

    if (Math.abs(diffX) < 40) return;
    moveFocus(diffX < 0 ? 1 : -1);
  };

  const assignButtonRef = (button: HTMLButtonElement | null, index: number) => {
    buttonRefs.current[index] = button;
  };

  return {
    assignButtonRef,
    handleTouchEnd,
    handleTouchStart,
  };
};
