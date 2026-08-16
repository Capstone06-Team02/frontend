import { useState } from 'react';
import { AppHeader } from '../components/AppHeader';
import type { PageWithSpeechProps } from '../types/order';

const HELP_ITEMS = [
  {
    title: '음성 주문 시작',
    body: '첫 화면 중앙을 한 번 터치하면 마이크가 켜집니다. 마이크가 켜진 뒤 원하시는 메뉴와 수량을 말씀해주세요.',
  },
  {
    title: '버튼 이동',
    body: '아이폰 VoiceOver를 켠 상태에서 오른쪽으로 스와이프하면 다음 버튼으로 이동합니다. 왼쪽으로 스와이프하면 이전 버튼으로 이동합니다.',
  },
  {
    title: '장바구니 확인',
    body: '장바구니 화면에서 선택한 메뉴, 옵션, 수량, 총 금액을 확인할 수 있습니다. 수량 변경과 삭제도 가능합니다.',
  },
  {
    title: '접근성 설정',
    body: '글자 크기, 고대비 화면, 자동 음성 안내, 음성 속도를 조절할 수 있습니다.',
  },
];

export const HelpPage = ({ speak }: PageWithSpeechProps) => {
  const [activeItem, setActiveItem] = useState('음성 주문 시작');

  const activeClass = 'border-sky-700 bg-sky-100 shadow-md';
  const inactiveClass = 'border-slate-300 bg-white shadow-sm';

  return (
    <div className="h-[calc(100dvh+96px)] overflow-hidden bg-slate-50 text-slate-950">
      <div className="mx-auto flex h-dvh w-full max-w-[440px] flex-col px-5 pb-4 pt-[max(24px,env(safe-area-inset-top))]">
        <AppHeader
          onBack={() => {
            setActiveItem('돌아가기');
            window.location.href = '/';
          }}
          subtitle="사용자 도움말"
        />

        <section aria-live="polite" aria-atomic="true" className="mb-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
          <p className="text-sm font-semibold text-slate-500">현재 선택</p>
          <p className="text-xl font-black text-sky-900">{activeItem}</p>
        </section>

        <section className="grid flex-1 gap-2" aria-label="도움말 목록">
          {HELP_ITEMS.map((item) => (
              <button
                key={item.title}
                type="button"
                onClick={() => speak(`${item.title}. ${item.body}`)}
                onFocus={() => {
                  setActiveItem(item.title);
                  speak(`${item.title}. ${item.body}`);
                }}
                aria-label={`${item.title}. ${item.body}`}
                className={`flex min-h-0 w-full items-center rounded-lg border-2 px-4 py-3 text-left focus:outline-none focus:ring-4 focus:ring-sky-300 ${
                  activeItem === item.title ? activeClass : inactiveClass
                }`}
              >
                <span>
                  <span className="block text-xl font-black">{item.title}</span>
                  <span className="mt-0.5 block text-sm font-semibold leading-snug text-slate-600">{item.body}</span>
                </span>
              </button>
          ))}
        </section>

        <button
          type="button"
          onClick={() => {
            window.location.href = '/accessibility';
          }}
          onFocus={() => {
            setActiveItem('접근성 설정');
            speak('접근성 설정으로 이동 버튼');
          }}
          aria-label="접근성 설정으로 이동"
          className="mt-3 flex min-h-14 w-full items-center justify-center rounded-lg bg-sky-700 text-xl font-black text-white shadow-sm focus:outline-none focus:ring-4 focus:ring-sky-300"
        >
          접근성 설정
        </button>
      </div>
    </div>
  );
};
