import { useState } from 'react';
import { ChevronLeft, Minus, Plus, Trash2 } from 'lucide-react';
import { INITIAL_CART_ITEMS } from '../constants/menu';
import { useSwipeFocus } from '../hooks/useSwipeFocus';
import type { CartItem } from '../types/menu';
import type { PageWithSpeechProps } from '../types/order';
import { formatPrice } from '../utils/format';

export const CartPage = ({ speak }: PageWithSpeechProps) => {
  const [cartItems, setCartItems] = useState<CartItem[]>(INITIAL_CART_ITEMS);
  const [activeItem, setActiveItem] = useState('주문 금액');
  const { assignButtonRef, handleTouchEnd, handleTouchStart } = useSwipeFocus();
  const totalPrice = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  let focusIndex = 0;
  const activeClass = 'border-sky-700 bg-sky-100 shadow-md';
  const inactiveClass = 'border-slate-300 bg-white shadow-sm';

  const updateQuantity = (item: CartItem, amount: 1 | -1) => {
    setCartItems((current) =>
      current.map((cartItem) =>
        cartItem.id === item.id
          ? {
              ...cartItem,
              quantity: Math.max(1, cartItem.quantity + amount),
            }
          : cartItem,
      ),
    );

    speak(`${item.name} 수량 ${amount === 1 ? '추가' : '감소'}`);
  };

  const removeItem = (item: CartItem) => {
    setCartItems((current) => current.filter((cartItem) => cartItem.id !== item.id));
    speak(`${item.name} 삭제`);
  };

  return (
    <main
      className="h-dvh overflow-hidden bg-slate-50 text-slate-950"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="mx-auto flex h-dvh w-full max-w-[440px] flex-col px-5 pb-4 pt-[max(20px,env(safe-area-inset-top))]">
        <header className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-sky-700">장바구니</p>
            <h1 className="text-3xl font-black leading-tight tracking-normal">Voisk</h1>
          </div>
          <button
            type="button"
            ref={(button) => assignButtonRef(button, focusIndex++)}
            onClick={() => {
              window.location.href = '/options';
            }}
            onFocus={() => {
              setActiveItem('이전 화면');
              speak('옵션 선택 화면으로 돌아가기 버튼');
            }}
            aria-label="옵션 선택 화면으로 돌아가기"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-4 focus:ring-sky-300"
          >
            <ChevronLeft aria-hidden="true" size={28} />
          </button>
        </header>

        <button
          type="button"
          ref={(button) => assignButtonRef(button, focusIndex++)}
          onClick={() => speak(`주문 금액 ${formatPrice(totalPrice)}. 총 ${cartItems.length}개 메뉴`)}
          onFocus={() => {
            setActiveItem('주문 금액');
            speak(`주문 금액 ${formatPrice(totalPrice)}. 총 ${cartItems.length}개 메뉴`);
          }}
          aria-label={`주문 금액 ${formatPrice(totalPrice)}, 총 ${cartItems.length}개 메뉴`}
          className={`mb-3 rounded-lg border-2 px-4 py-3 text-left focus:outline-none focus:ring-4 focus:ring-sky-300 ${
            activeItem === '주문 금액' ? activeClass : inactiveClass
          }`}
        >
          <p className="text-sm font-semibold text-slate-500">주문 금액</p>
          <p className="text-2xl font-black text-sky-900">{formatPrice(totalPrice)}</p>
          <p className="text-sm font-semibold text-slate-600">총 {cartItems.length}개 메뉴</p>
        </button>

        <section className="grid flex-1 gap-2" aria-label="장바구니 목록">
          {cartItems.length > 0 ? (
            cartItems.map((item) => {
              const itemTotal = item.price * item.quantity;

              return (
                <article key={item.id} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                  <button
                    type="button"
                    ref={(button) => assignButtonRef(button, focusIndex++)}
                    onFocus={() => {
                      setActiveItem(item.name);
                      speak(
                        `${item.name}, ${item.optionSummary}, ${item.quantity}개, ${formatPrice(itemTotal)} 장바구니 항목`,
                      );
                    }}
                    onClick={() => speak(`${item.name} 장바구니 항목`)}
                    aria-label={`${item.name}, ${item.optionSummary}, ${item.quantity}개, ${formatPrice(itemTotal)}`}
                    className={`flex min-h-0 w-full items-start rounded-lg border-2 p-2 text-left focus:outline-none focus:ring-4 focus:ring-sky-300 ${
                      activeItem === item.name ? activeClass : inactiveClass
                    }`}
                  >
                    <span>
                      <span className="block text-xl font-black">{item.name}</span>
                      <span className="block text-sm font-semibold text-slate-500">{item.optionSummary}</span>
                      <span className="block text-lg font-black text-sky-900">{formatPrice(itemTotal)}</span>
                    </span>
                  </button>

                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      ref={(button) => assignButtonRef(button, focusIndex++)}
                      onClick={() => updateQuantity(item, -1)}
                      onFocus={() => {
                        setActiveItem(`${item.name} 수량 줄이기`);
                        speak(`${item.name} 수량 줄이기 버튼`);
                      }}
                      aria-label={`${item.name} 수량 줄이기`}
                      className={`flex min-h-11 items-center justify-center rounded-lg border focus:outline-none focus:ring-4 focus:ring-sky-300 ${
                        activeItem === `${item.name} 수량 줄이기` ? activeClass : 'border-slate-300 bg-slate-50'
                      }`}
                    >
                      <Minus aria-hidden="true" size={28} />
                    </button>
                    <p
                      aria-label={`${item.name} 현재 수량 ${item.quantity}개`}
                      className="flex min-h-11 items-center justify-center rounded-lg bg-sky-50 text-xl font-black text-sky-900"
                    >
                      {item.quantity}개
                    </p>
                    <button
                      type="button"
                      ref={(button) => assignButtonRef(button, focusIndex++)}
                      onClick={() => updateQuantity(item, 1)}
                      onFocus={() => {
                        setActiveItem(`${item.name} 수량 늘리기`);
                        speak(`${item.name} 수량 늘리기 버튼`);
                      }}
                      aria-label={`${item.name} 수량 늘리기`}
                      className={`flex min-h-11 items-center justify-center rounded-lg border focus:outline-none focus:ring-4 focus:ring-sky-300 ${
                        activeItem === `${item.name} 수량 늘리기` ? activeClass : 'border-slate-300 bg-slate-50'
                      }`}
                    >
                      <Plus aria-hidden="true" size={28} />
                    </button>
                  </div>

                  <button
                    type="button"
                    ref={(button) => assignButtonRef(button, focusIndex++)}
                    onClick={() => removeItem(item)}
                    onFocus={() => {
                      setActiveItem(`${item.name} 삭제`);
                      speak(`${item.name} 장바구니에서 삭제 버튼`);
                    }}
                    aria-label={`${item.name} 장바구니에서 삭제`}
                    className={`mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border text-base font-black text-rose-700 focus:outline-none focus:ring-4 focus:ring-rose-200 ${
                      activeItem === `${item.name} 삭제` ? 'border-rose-700 bg-rose-100 shadow-md' : 'border-rose-200 bg-rose-50'
                    }`}
                  >
                    <Trash2 aria-hidden="true" size={24} />
                    삭제
                  </button>
                </article>
              );
            })
          ) : (
            <section className="rounded-lg border border-slate-200 bg-white p-5 text-center">
              <p className="text-xl font-black">장바구니가 비어 있습니다</p>
            </section>
          )}
        </section>

        <button
          type="button"
          ref={(button) => assignButtonRef(button, focusIndex++)}
          onClick={() => speak(`총 주문 금액 ${formatPrice(totalPrice)}. 주문을 진행합니다.`)}
          onFocus={() => {
            setActiveItem('주문하기');
            speak(`주문하기 버튼, 총 금액 ${formatPrice(totalPrice)}`);
          }}
          aria-label={`주문하기, 총 금액 ${formatPrice(totalPrice)}`}
          className="mt-3 flex min-h-14 w-full items-center justify-center rounded-lg bg-sky-700 text-xl font-black text-white shadow-sm focus:outline-none focus:ring-4 focus:ring-sky-300"
          disabled={cartItems.length === 0}
        >
          주문하기
        </button>
      </div>
    </main>
  );
};
