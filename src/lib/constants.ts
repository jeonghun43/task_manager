import type { IconName } from '@/components/ui/Icon';
import type { Priority, ProjectColor, Status, ViewKey } from './types';

export const STATUS_ORDER: Status[] = ['todo', 'in_progress', 'done'];

export const STATUS_LABEL: Record<Status, string> = {
  todo: 'To-Do',
  in_progress: '진행 중',
  done: '완료',
};

/** 배지 도트 색 (CSS 변수) */
export const STATUS_DOT: Record<Status, string> = {
  todo: 'var(--status-todo)',
  in_progress: 'var(--status-progress)',
  done: 'var(--status-done)',
};

export const PRIORITY_ORDER: Priority[] = ['high', 'medium', 'low'];

export const PRIORITY_LABEL: Record<Priority, string> = {
  high: '높음',
  medium: '중간',
  low: '낮음',
};

/**
 * 우선순위는 방향으로 표현한다 (위 / 가운데 / 아래).
 * 이전에는 🔥⏳💤 를 썼는데, 모래시계는 "긴급함"의 기호이지 우선순위가 아니고
 * 잠은 "낮은 우선순위"와 은유가 맞지 않아 의미가 흐려졌다.
 */
export const PRIORITY_ICON: Record<Priority, 'chevron-up' | 'dash' | 'chevron-down'> = {
  high: 'chevron-up',
  medium: 'dash',
  low: 'chevron-down',
};

/** 정렬용 랭크 — 작을수록 위 (plan.md §5) */
export const PRIORITY_RANK: Record<Priority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export const PROJECT_COLORS: ProjectColor[] = [
  'blue',
  'violet',
  'pink',
  'red',
  'orange',
  'amber',
  'green',
  'teal',
];

export const PROJECT_COLOR_LABEL: Record<ProjectColor, string> = {
  blue: '파랑',
  violet: '보라',
  pink: '분홍',
  red: '빨강',
  orange: '주황',
  amber: '노랑',
  green: '초록',
  teal: '청록',
};

/**
 * 첫 번째가 기본 화면이다.
 * 하루에 열 번 여는 이유는 "지금 뭐 하지"이므로, 구조를 보여주는 화면이 아니라
 * 오늘 할 일이 현관이어야 한다.
 */
export const VIEWS: { key: ViewKey; label: string; icon: IconName }[] = [
  { key: 'today', label: '오늘', icon: 'sun-today' },
  { key: 'project', label: '과업별', icon: 'board' },
  { key: 'status', label: '상태', icon: 'columns' },
  { key: 'deadline', label: '마감기한', icon: 'list' },
  { key: 'calendar', label: '캘린더', icon: 'calendar' },
];

export const STORAGE_KEY_DATA = 'vtm.data.v1';
export const STORAGE_KEY_UI = 'vtm.ui.v1';
