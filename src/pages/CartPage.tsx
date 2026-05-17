import { useState } from 'react';
import { ChevronLeft, Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { INITIAL_CART_ITEMS } from '../constants/menu';
import { useSwipeFocus } from '../hooks/useSwipeFocus';
import type { CartItem } from '../types/menu';
import type { PageWithSpeechProps } from '../types/order';
import { formatPrice } from '../utils/format';

export const CartPage = ({ speak }: PageWithSpeechProps) => {
  const [cartItems, setCartItems] = useState<CartItem[]>(INITIAL_CART_ITEMS);
  const { assignButtonRef, handleTouchEnd, handleTouchStart } = useSwipeFocus();
  const totalPrice = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  let focusIndex = 0;

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
      className="min-h-dvh bg-slate-50 text-slate-950"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col px-5 pb-6 pt-[max(28px,env(safe-area-inset-top))]">
        <header className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-sky-700">장바구니</p>
            <h1 className="mt-1 text-4xl font-black leading-tight tracking-normal">Voisk</h1>
          </div>
          <button
            type="button"
            ref={(button) => assignButtonRef(button, focusIndex++)}
            onClick={() => {
              window.location.href = '/options';
            }}
            onFocus={() => speak('옵션 선택 화면으로 돌아가기 버튼')}
            aria-label="옵션 선택 화면으로 돌아가기"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-4 focus:ring-sky-300"
          >
            <ChevronLeft aria-hidden="true" size={28} />
          </button>
        </header>

        <section aria-live="polite" aria-atomic="true" className="mb-5 rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm font-semibold text-slate-500">주문 금액</p>
          <p className="mt-1 text-3xl font-black text-sky-900">{formatPrice(totalPrice)}</p>
          <p className="mt-1 text-base font-semibold text-slate-600">총 {cartItems.length}개 메뉴</p>
        </section>

        <section className="grid gap-4" aria-label="장바구니 목록">
          {cartItems.length > 0 ? (
            cartItems.map((item) => {
              const itemTotal = item.price * item.quantity;

              return (
                <article key={item.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <button
                    type="button"
                    ref={(button) => assignButtonRef(button, focusIndex++)}
                    onFocus={() =>
                      speak(
                        `${item.name}, ${item.optionSummary}, ${item.quantity}개, ${formatPrice(itemTotal)} 장바구니 항목`,
                      )
                    }
                    onClick={() => speak(`${item.name} 장바구니 항목`)}
                    aria-label={`${item.name}, ${item.optionSummary}, ${item.quantity}개, ${formatPrice(itemTotal)}`}
                    className="flex min-h-20 w-full items-start justify-between gap-4 rounded-lg border-2 border-transparent text-left focus:border-sky-700 focus:outline-none focus:ring-4 focus:ring-sky-300"
                  >
                    <span>
                      <span className="block text-2xl font-black">{item.name}</span>
                      <span className="mt-1 block text-base font-semibold text-slate-500">{item.optionSummary}</span>
                      <span className="mt-2 block text-xl font-black text-sky-900">{formatPrice(itemTotal)}</span>
                    </span>
                    <ShoppingCart aria-hidden="true" className="mt-1 shrink-0 text-sky-700" size={30} />
                  </button>

                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      ref={(button) => assignButtonRef(button, focusIndex++)}
                      onClick={() => updateQuantity(item, -1)}
                      onFocus={() => speak(`${item.name} 수량 줄이기 버튼`)}
                      aria-label={`${item.name} 수량 줄이기`}
                      className="flex min-h-14 items-center justify-center rounded-lg border border-slate-300 bg-slate-50 focus:outline-none focus:ring-4 focus:ring-sky-300"
                    >
                      <Minus aria-hidden="true" size={28} />
                    </button>
                    <p
                      aria-label={`${item.name} 현재 수량 ${item.quantity}개`}
                      className="flex min-h-14 items-center justify-center rounded-lg bg-sky-50 text-2xl font-black text-sky-900"
                    >
                      {item.quantity}개
                    </p>
                    <button
                      type="button"
                      ref={(button) => assignButtonRef(button, focusIndex++)}
                      onClick={() => updateQuantity(item, 1)}
                      onFocus={() => speak(`${item.name} 수량 늘리기 버튼`)}
                      aria-label={`${item.name} 수량 늘리기`}
                      className="flex min-h-14 items-center justify-center rounded-lg border border-slate-300 bg-slate-50 focus:outline-none focus:ring-4 focus:ring-sky-300"
                    >
                      <Plus aria-hidden="true" size={28} />
                    </button>
                  </div>

                  <button
                    type="button"
                    ref={(button) => assignButtonRef(button, focusIndex++)}
                    onClick={() => removeItem(item)}
                    onFocus={() => speak(`${item.name} 장바구니에서 삭제 버튼`)}
                    aria-label={`${item.name} 장바구니에서 삭제`}
                    className="mt-3 flex min-h-14 w-full items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 text-lg font-black text-rose-700 focus:outline-none focus:ring-4 focus:ring-rose-200"
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
          onFocus={() => speak(`주문하기 버튼, 총 금액 ${formatPrice(totalPrice)}`)}
          aria-label={`주문하기, 총 금액 ${formatPrice(totalPrice)}`}
          className="mt-5 flex min-h-16 w-full items-center justify-center rounded-lg bg-sky-700 text-xl font-black text-white shadow-sm focus:outline-none focus:ring-4 focus:ring-sky-300"
          disabled={cartItems.length === 0}
        >
          주문하기
        </button>
      </div>
    </main>
  );
};
