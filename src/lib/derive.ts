import { PRIORITY_RANK } from './constants';
import { daysFromToday } from './date';
import type { Priority, Project, Task } from './types';

/**
 * 파생 계산의 단일 진실 지점 (plan.md §3).
 * 진행률·유효 우선순위는 저장하지 않고 항상 여기서 계산한다.
 * AC-4 / AC-5 (우선순위 상속) 와 AC-6 (마감일 정렬) 이 이 파일에 걸려 있다.
 */

/** 작은 과업이 우선순위를 상속받는 상태인가 */
export function isInherited(task: Task): boolean {
  return task.priority === null;
}

/**
 * 실제로 표시·정렬에 쓰이는 우선순위.
 * 개별 지정값이 있으면 그것, 없으면 소속 큰 과업의 값.
 */
export function effectivePriority(task: Task, project: Project | undefined): Priority {
  return task.priority ?? project?.priority ?? 'medium';
}

export interface Progress {
  done: number;
  total: number;
  percent: number;
}

export function projectProgress(projectId: string, tasks: Task[]): Progress {
  let done = 0;
  let total = 0;
  for (const t of tasks) {
    if (t.projectId !== projectId) continue;
    total++;
    if (t.status === 'done') done++;
  }
  return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
}

export function projectMap(projects: Project[]): Map<string, Project> {
  return new Map(projects.map((p) => [p.id, p]));
}

/* ------------------------------------------------------------------ */
/* 마감기한 뷰 그룹 & 정렬                                              */
/* ------------------------------------------------------------------ */

export type DeadlineGroupKey =
  | 'overdue'
  | 'today'
  | 'tomorrow'
  | 'week'
  | 'later'
  | 'none'
  | 'done';

export const DEADLINE_GROUPS: { key: DeadlineGroupKey; label: string; hint: string }[] = [
  { key: 'overdue', label: '지남', hint: '마감일이 지났어요' },
  { key: 'today', label: '오늘', hint: '' },
  { key: 'tomorrow', label: '내일', hint: '' },
  { key: 'week', label: '이번 주', hint: '7일 이내' },
  { key: 'later', label: '이후', hint: '' },
  { key: 'none', label: '기한 없음', hint: '' },
  { key: 'done', label: '끝냄', hint: '' },
];

/**
 * 완료한 항목은 원래 마감일 그룹에서 빼내 맨 아래 `끝냄` 으로 모은다 (FR-15).
 *
 * 그룹 안에서만 아래로 내리는 것으로는 부족하다. 지난 일을 다 끝냈다면 `지남` 그룹 전체가
 * 완료 항목으로 채워진 채 화면 맨 위를 차지하고, 정작 오늘 할 일은 그 아래로 밀린다.
 */
export function deadlineGroupOf(dueDate?: string, status?: Task['status']): DeadlineGroupKey {
  if (status === 'done') return 'done';
  if (!dueDate) return 'none';
  const n = daysFromToday(dueDate);
  if (n < 0) return 'overdue';
  if (n === 0) return 'today';
  if (n === 1) return 'tomorrow';
  if (n <= 7) return 'week';
  return 'later';
}

/**
 * 끝낸 일은 어느 목록에서든 맨 아래로 (FR-15).
 *
 * 목록의 첫 화면은 "지금 해야 할 것"이어야 한다. 완료 항목이 원래 자리에 남아 있으면
 * 남은 일을 보려고 스크롤해야 하고, 목록이 길수록 그 비용이 커진다.
 * 숨기지는 않는다 — 무엇을 해냈는지 보이는 것에도 값이 있고, 숨기려면 이미 `완료 숨기기` 필터가 있다.
 */
export function compareDoneLast(a: Task, b: Task): number {
  return (a.status === 'done' ? 1 : 0) - (b.status === 'done' ? 1 : 0);
}

/**
 * 마감기한 뷰 정렬 (FR-3.3 / AC-6)
 *   0) 완료한 것은 맨 뒤 (FR-15)
 *   1) 마감일 오름차순 (없는 건 맨 뒤)
 *   2) 같은 날짜면 우선순위 높은 것이 위
 *   3) 큰 과업 순서
 *   4) 할 일 순서
 */
export function compareByDeadline(
  a: Task,
  b: Task,
  projects: Map<string, Project>,
): number {
  const done = compareDoneLast(a, b);
  if (done !== 0) return done;

  const ad = a.dueDate ?? '';
  const bd = b.dueDate ?? '';
  if (ad !== bd) {
    if (!ad) return 1;
    if (!bd) return -1;
    return ad < bd ? -1 : 1;
  }

  const ap = PRIORITY_RANK[effectivePriority(a, projects.get(a.projectId))];
  const bp = PRIORITY_RANK[effectivePriority(b, projects.get(b.projectId))];
  if (ap !== bp) return ap - bp;

  const ao = projects.get(a.projectId)?.order ?? 0;
  const bo = projects.get(b.projectId)?.order ?? 0;
  if (ao !== bo) return ao - bo;

  return a.order - b.order;
}

/** 우선순위만으로 정렬 (같으면 마감일 → 순서) */
export function compareByPriority(
  a: Task,
  b: Task,
  projects: Map<string, Project>,
): number {
  const ap = PRIORITY_RANK[effectivePriority(a, projects.get(a.projectId))];
  const bp = PRIORITY_RANK[effectivePriority(b, projects.get(b.projectId))];
  if (ap !== bp) return ap - bp;
  const ad = a.dueDate ?? '9999-12-31';
  const bd = b.dueDate ?? '9999-12-31';
  if (ad !== bd) return ad < bd ? -1 : 1;
  return a.order - b.order;
}

/* ------------------------------------------------------------------ */
/* 필터                                                                */
/* ------------------------------------------------------------------ */

export interface TaskFilter {
  search: string;
  projectId: string | null;
  priority: Priority | null;
  hideCompleted: boolean;
}

export const EMPTY_FILTER: TaskFilter = {
  search: '',
  projectId: null,
  priority: null,
  hideCompleted: false,
};

export function isFilterActive(f: TaskFilter): boolean {
  return (
    f.search.trim() !== '' ||
    f.projectId !== null ||
    f.priority !== null ||
    f.hideCompleted
  );
}

export function filterTasks(
  tasks: Task[],
  projects: Map<string, Project>,
  f: TaskFilter,
): Task[] {
  const q = f.search.trim().toLowerCase();
  return tasks.filter((t) => {
    if (f.hideCompleted && t.status === 'done') return false;
    if (f.projectId && t.projectId !== f.projectId) return false;
    if (f.priority && effectivePriority(t, projects.get(t.projectId)) !== f.priority)
      return false;
    if (q) {
      const hay = `${t.title} ${t.notes ?? ''} ${
        projects.get(t.projectId)?.title ?? ''
      }`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

/** 큰 과업 자체에도 검색/필터를 적용한다 (과업별 뷰의 컬럼 노출 판단용) */
export function filterProjects(projects: Project[], f: TaskFilter): Project[] {
  return projects.filter((p) => {
    if (f.projectId && p.id !== f.projectId) return false;
    return true;
  });
}
