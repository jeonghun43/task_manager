'use client';

import { create } from 'zustand';
import type { DateStr } from '@/lib/types';
import { useAppStore } from './useAppStore';

/**
 * 역산 배치 미리보기 상태.
 *
 * 캘린더 뷰 안의 지역 상태로 두면 뷰를 옮기는 순간 조용히 사라진다.
 * 확정하지 않은 배치도 사용자가 들인 노동이므로, 뷰 밖에서도 존재를 알 수 있어야
 * 이동 전에 저장 여부를 물어볼 수 있다.
 *
 * 일부러 영속화하지 않는다 — 아직 확정하지 않은 값이기 때문이다.
 */
export interface PlanState {
  /** taskId → 제안 마감일. null 이면 미리보기 없음 */
  preview: Map<string, DateStr> | null;
  hasPreview: () => boolean;
  setPreview: (p: Map<string, DateStr> | null) => void;
  /** 미리보기를 실제 데이터에 반영하고 비운다 */
  commitPreview: () => void;
  discardPreview: () => void;
}

export const usePlanStore = create<PlanState>((set, get) => ({
  preview: null,

  hasPreview: () => get().preview !== null,

  setPreview: (preview) => set({ preview }),

  commitPreview: () => {
    const p = get().preview;
    if (!p) return;
    useAppStore
      .getState()
      .setTaskDueDates([...p.entries()].map(([id, dueDate]) => ({ id, dueDate })));
    set({ preview: null });
  },

  discardPreview: () => set({ preview: null }),
}));
