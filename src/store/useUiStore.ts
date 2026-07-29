'use client';

import { create } from 'zustand';
import { STORAGE_KEY_UI } from '@/lib/constants';
import { todayStr } from '@/lib/date';
import type { Priority, ThemeMode, ViewKey } from '@/lib/types';

/**
 * 화면 상태(뷰·필터·테마). 도메인 데이터와 분리해 따로 저장한다.
 * 필터는 뷰를 바꿔도 유지된다 (FR-3.5), 마지막 뷰는 다음 방문 때 복원된다 (FR-3.6).
 */

/** 과업별 뷰에서 컬럼 안 할 일을 어떤 순서로 늘어놓을지 */
export type BoardSort = 'deadline' | 'manual';

interface PersistedUi {
  view: ViewKey;
  theme: ThemeMode;
  hideCompleted: boolean;
  boardSort: BoardSort;
}

export interface UiState {
  view: ViewKey;
  theme: ThemeMode;
  search: string;
  projectFilter: string | null;
  priorityFilter: Priority | null;
  hideCompleted: boolean;
  boardSort: BoardSort;
  /** 캘린더 뷰 기준 월 (해당 월 1일의 날짜 문자열) */
  calendarAnchor: string;
  uiHydrated: boolean;

  hydrateUi: () => void;
  setView: (v: ViewKey) => void;
  setTheme: (t: ThemeMode) => void;
  toggleTheme: () => void;
  setSearch: (s: string) => void;
  setProjectFilter: (id: string | null) => void;
  setPriorityFilter: (p: Priority | null) => void;
  setHideCompleted: (v: boolean) => void;
  setBoardSort: (s: BoardSort) => void;
  setCalendarAnchor: (d: string) => void;
  resetFilters: () => void;
}

function readUi(): PersistedUi | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_UI);
    return raw ? (JSON.parse(raw) as PersistedUi) : null;
  } catch {
    return null;
  }
}

function writeUi(s: UiState) {
  if (typeof window === 'undefined') return;
  try {
    const payload: PersistedUi = {
      view: s.view,
      theme: s.theme,
      hideCompleted: s.hideCompleted,
      boardSort: s.boardSort,
    };
    window.localStorage.setItem(STORAGE_KEY_UI, JSON.stringify(payload));
  } catch {
    /* noop */
  }
}

function applyTheme(theme: ThemeMode) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = theme;
}

export const useUiStore = create<UiState>((set, get) => ({
  view: 'today',
  theme: 'dark',
  search: '',
  projectFilter: null,
  priorityFilter: null,
  hideCompleted: false,
  boardSort: 'deadline',
  calendarAnchor: todayStr(),
  uiHydrated: false,

  hydrateUi: () => {
    if (get().uiHydrated) return;
    const saved = readUi();
    const next = {
      view: saved?.view ?? 'today',
      theme: saved?.theme ?? 'dark',
      hideCompleted: saved?.hideCompleted ?? false,
      boardSort: saved?.boardSort ?? 'deadline',
      uiHydrated: true,
    } as const;
    applyTheme(next.theme);
    set(next);
  },

  setView: (view) => {
    set({ view });
    writeUi(get());
  },
  setTheme: (theme) => {
    applyTheme(theme);
    set({ theme });
    writeUi(get());
  },
  toggleTheme: () => {
    get().setTheme(get().theme === 'dark' ? 'light' : 'dark');
  },
  setSearch: (search) => set({ search }),
  setProjectFilter: (projectFilter) => set({ projectFilter }),
  setPriorityFilter: (priorityFilter) => set({ priorityFilter }),
  setHideCompleted: (hideCompleted) => {
    set({ hideCompleted });
    writeUi(get());
  },
  setBoardSort: (boardSort) => {
    set({ boardSort });
    writeUi(get());
  },
  setCalendarAnchor: (calendarAnchor) => set({ calendarAnchor }),
  resetFilters: () => {
    set({ search: '', projectFilter: null, priorityFilter: null, hideCompleted: false });
    writeUi(get());
  },
}));
