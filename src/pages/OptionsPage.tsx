import { useState } from 'react';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { OPTION_ITEMS } from '../constants/menu';
import { useSwipeFocus } from '../hooks/useSwipeFocus';
import type { OptionItem } from '../types/menu';
import type { PageWithSpeechProps } from '../types/order';

export const OptionsPage = ({ speak }: PageWithSpeechProps) => {
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const { assignButtonRef, handleTouchEnd, handleTouchStart } = useSwipeFocus();

  const handleOptionFocus = (option: OptionItem) => {
    const selected = selectedOptions.includes(option.id) ? '선택됨' : '선택 안 됨';
    speak(`${option.group}, ${option.label} 버튼, ${selected}. ${option.description}`);
  };

  const handleOptionSelect = (option: OptionItem) => {
    setSelectedOptions((current) => {
      const isSelected = current.includes(option.id);
      const next = isSelected ? current.filter((id) => id !== option.id) : [...current, option.id];
      speak(`${option.label} ${isSelected ? '선택 해제' : '선택'}`);
      return next;
    });
  };

  return (
    <main
      className="min-h-dvh bg-slate-50 text-slate-950"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col px-5 pb-6 pt-[max(28px,env(safe-area-inset-top))]">
        <header className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-sky-700">옵션 선택</p>
            <h1 className="mt-1 text-4xl font-black leading-tight tracking-normal">Voisk</h1>
          </div>
          <button
            type="button"
            onClick={() => {
              window.location.href = '/';
            }}
            onFocus={() => speak('음성 주문 화면으로 돌아가기 버튼')}
            aria-label="음성 주문 화면으로 돌아가기"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-4 focus:ring-sky-300"
          >
            <ChevronLeft aria-hidden="true" size={28} />
          </button>
        </header>

        <section aria-live="polite" aria-atomic="true" className="mb-5 rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm font-semibold text-slate-500">현재 선택</p>
          <p className="mt-1 min-h-8 text-xl font-bold text-sky-900">
            {selectedOptions.length > 0 ? `${selectedOptions.length}개 옵션 선택됨` : '선택된 옵션이 없습니다'}
          </p>
        </section>

        <section className="grid gap-3" aria-label="주문 추가 옵션">
          {OPTION_ITEMS.map((option, index) => {
            const isSelected = selectedOptions.includes(option.id);

            return (
              <button
                key={option.id}
                ref={(button) => {
                  assignButtonRef(button, index);
                }}
                type="button"
                onFocus={() => handleOptionFocus(option)}
                onClick={() => handleOptionSelect(option)}
                aria-pressed={isSelected}
                aria-label={`${option.group}, ${option.label}, ${isSelected ? '선택됨' : '선택 안 됨'}`}
                className={`flex min-h-20 w-full items-center justify-between gap-4 rounded-lg border-2 px-5 text-left shadow-sm transition active:scale-[0.99] focus:outline-none focus:ring-4 focus:ring-sky-300 ${
                  isSelected ? 'border-sky-700 bg-sky-100' : 'border-slate-300 bg-white'
                }`}
              >
                <span>
                  <span className="block text-sm font-semibold text-slate-500">{option.group}</span>
                  <span className="mt-1 block text-2xl font-black">{option.label}</span>
                </span>
                {isSelected ? (
                  <Check aria-hidden="true" className="shrink-0 text-sky-800" size={30} />
                ) : (
                  <ChevronRight aria-hidden="true" className="shrink-0 text-slate-500" size={30} />
                )}
              </button>
            );
          })}
        </section>
      </div>
    </main>
  );
};
