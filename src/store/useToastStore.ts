'use client';

import { create } from 'zustand';

/**
 * 되돌리기 토스트.
 *
 * 확인 다이얼로그는 반복되면 읽지 않고 누르게 된다(습관화).
 * 되돌릴 수 있는 동작은 묻지 말고 실행한 뒤 되돌릴 기회를 주는 편이 낫다.
 * 특히 드래그 앤 드롭은 오조작이 쉬운데 지금까지 복구 수단이 전혀 없었다.
 */
export interface Toast {
  id: number;
  message: string;
  /** 있으면 "실행 취소" 버튼이 붙는다 */
  undo?: () => void;
}

interface ToastState {
  toasts: Toast[];
  /** 되돌릴 수 있는 동작 */
  showUndo: (message: string, undo: () => void) => void;
  /** 단순 알림 */
  show: (message: string) => void;
  dismiss: (id: number) => void;
}

let seq = 0;
/**
 * 되돌리기는 사용자가 "어? 방금 뭐가 사라졌지" 를 알아채고, 읽고, 판단할 시간이 필요하다.
 * 짧으면 되돌리기가 있으나 마나 한 기능이 된다.
 */
const LIFETIME_MS = 10000;

export const useToastStore = create<ToastState>((set, get) => {
  const push = (message: string, undo?: () => void) => {
    const id = ++seq;
    set((s) => ({ toasts: [...s.toasts, { id, message, undo }] }));
    if (typeof window !== 'undefined') {
      window.setTimeout(() => get().dismiss(id), LIFETIME_MS);
    }
  };

  return {
    toasts: [],
    showUndo: (message, undo) => push(message, undo),
    show: (message) => push(message),
    dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  };
});
