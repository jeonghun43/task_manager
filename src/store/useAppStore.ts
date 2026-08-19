'use client';

import { create } from 'zustand';
import { PROJECT_COLORS } from '@/lib/constants';
import { newId, nowIso } from '@/lib/id';
import { createSeedData } from '@/lib/seed';
import { localAdapter } from '@/lib/storage/local';
import type { StorageAdapter } from '@/lib/storage/adapter';
import type {
  AppData,
  DateStr,
  Priority,
  Project,
  ProjectColor,
  Status,
  Task,
} from '@/lib/types';

/**
 * 도메인 스토어.
 * 이 파일만이 StorageAdapter 를 호출한다 (헌법 III).
 * 어댑터를 교체하면(SupabaseAdapter 등) UI 는 그대로 둔 채 저장소만 바뀐다.
 */

let adapter: StorageAdapter = localAdapter;
export function setStorageAdapter(a: StorageAdapter) {
  adapter = a;
}

export interface AppState {
  projects: Project[];
  tasks: Task[];
  hydrated: boolean;

  hydrate: () => Promise<void>;

  // 큰 과업
  addProject: (input?: Partial<Project>) => Project;
  updateProject: (id: string, patch: Partial<Omit<Project, 'id'>>) => void;
  deleteProject: (id: string) => void;
  reorderProjects: (orderedIds: string[]) => void;

  // 작은 과업
  addTask: (projectId: string, title: string, input?: Partial<Task>) => Task | null;
  updateTask: (id: string, patch: Partial<Omit<Task, 'id'>>) => void;
  deleteTask: (id: string) => void;
  toggleTaskDone: (id: string) => void;
  setTaskStatus: (id: string, status: Status) => void;
  setTaskPriority: (id: string, priority: Priority | null) => void;
  /** 프로젝트 이동 + 대상 위치 삽입. beforeTaskId 가 null 이면 맨 뒤. */
  moveTask: (id: string, toProjectId: string, beforeTaskId?: string | null) => void;
  reorderTasksInProject: (projectId: string, orderedIds: string[]) => void;
  /** 여러 할 일의 마감일을 한 번에 지정 (역산 배치 확정용) */
  setTaskDueDates: (entries: { id: string; dueDate: DateStr | undefined }[]) => void;
  /**
   * 스냅샷으로 되돌린다 — 삭제된 것은 되살리고, 바뀐 것은 이전 값으로 복원한다.
   * 되돌리기 토스트의 단일 복구 경로.
   */
  restoreTasks: (snapshots: Task[]) => void;

  /**
   * 저장소를 갈아끼운 뒤 화면 상태를 통째로 맞춘다 (로그인/로그아웃).
   * `persist` 를 타므로 새 어댑터로 곧바로 한 번 저장된다 — 로컬에만 있던 데이터가 서버로 올라가는 경로.
   */
  replaceAll: (data: AppData) => void;

  // 데이터 전체
  exportJson: () => string;
  importJson: (json: string) => { ok: boolean; message: string };
  clearAll: () => void;
  loadSeed: () => void;
}

function snapshot(s: Pick<AppState, 'projects' | 'tasks'>): AppData {
  return { version: 1, projects: s.projects, tasks: s.tasks };
}

/** 새 큰 과업에 팔레트에서 아직 덜 쓰인 색을 배정한다. */
function pickColor(projects: Project[]): ProjectColor {
  const used = new Map<ProjectColor, number>();
  for (const c of PROJECT_COLORS) used.set(c, 0);
  for (const p of projects) used.set(p.color, (used.get(p.color) ?? 0) + 1);
  let best = PROJECT_COLORS[0];
  for (const c of PROJECT_COLORS) {
    if ((used.get(c) ?? 0) < (used.get(best) ?? 0)) best = c;
  }
  return best;
}

/** 저장 후 상태를 반환하는 헬퍼 — 모든 변경 액션이 이걸 거친다. */
function persist(next: Pick<AppState, 'projects' | 'tasks'>) {
  void adapter.save(snapshot(next));
  return next;
}

export const useAppStore = create<AppState>((set, get) => ({
  projects: [],
  tasks: [],
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) return;
    const loaded = await adapter.load();
    if (loaded) {
      set({ projects: loaded.projects, tasks: loaded.tasks, hydrated: true });
    } else {
      // 최초 실행: 구조를 보여주는 샘플로 시작한다 (FR-6.3)
      const seed = createSeedData();
      void adapter.save(seed);
      set({ projects: seed.projects, tasks: seed.tasks, hydrated: true });
    }
  },

  /* ------------------------------ 큰 과업 ------------------------------ */

  addProject: (input) => {
    const state = get();
    const now = nowIso();
    const project: Project = {
      id: newId(),
      title: input?.title?.trim() || '새 과업',
      description: input?.description,
      status: input?.status ?? 'todo',
      priority: input?.priority ?? 'medium',
      dueDate: input?.dueDate,
      color: input?.color ?? pickColor(state.projects),
      order: state.projects.length,
      createdAt: now,
      updatedAt: now,
    };
    set(persist({ projects: [...state.projects, project], tasks: state.tasks }));
    return project;
  },

  updateProject: (id, patch) => {
    const state = get();
    const projects = state.projects.map((p) =>
      p.id === id ? { ...p, ...patch, id: p.id, updatedAt: nowIso() } : p,
    );
    set(persist({ projects, tasks: state.tasks }));
  },

  deleteProject: (id) => {
    const state = get();
    const projects = state.projects
      .filter((p) => p.id !== id)
      .map((p, i) => ({ ...p, order: i }));
    // 하위 할 일도 함께 사라진다 (FR-1.2 — 호출부에서 확인 다이얼로그를 띄운다)
    const tasks = state.tasks.filter((t) => t.projectId !== id);
    set(persist({ projects, tasks }));
  },

  reorderProjects: (orderedIds) => {
    const state = get();
    const rank = new Map(orderedIds.map((id, i) => [id, i]));
    const projects = [...state.projects]
      .sort((a, b) => (rank.get(a.id) ?? a.order) - (rank.get(b.id) ?? b.order))
      .map((p, i) => ({ ...p, order: i }));
    set(persist({ projects, tasks: state.tasks }));
  },

  /* ----------------------------- 작은 과업 ----------------------------- */

  addTask: (projectId, title, input) => {
    const state = get();
    const clean = title.trim();
    if (!clean) return null;
    if (!state.projects.some((p) => p.id === projectId)) return null;

    const now = nowIso();
    // 새 할 일은 맨 위에 쌓인다. order 는 상대값이라 음수여도 상관없다.
    const siblings = state.tasks.filter((t) => t.projectId === projectId);
    const order =
      siblings.length === 0 ? 0 : siblings.reduce((m, t) => Math.min(m, t.order), 0) - 1;

    const task: Task = {
      id: newId(),
      projectId,
      title: clean,
      notes: input?.notes,
      status: input?.status ?? 'todo',
      dueDate: input?.dueDate,
      // 기본은 상속(null). 명시적으로 넘긴 경우에만 개별 지정.
      priority: input?.priority ?? null,
      order,
      createdAt: now,
      updatedAt: now,
    };
    set(persist({ projects: state.projects, tasks: [...state.tasks, task] }));
    return task;
  },

  updateTask: (id, patch) => {
    const state = get();
    const tasks = state.tasks.map((t) => {
      if (t.id !== id) return t;
      const next: Task = { ...t, ...patch, id: t.id, updatedAt: nowIso() };
      // 상태와 completedAt 이 어긋나지 않게 한 곳에서 맞춘다.
      if (patch.status !== undefined) {
        next.completedAt = patch.status === 'done' ? (t.completedAt ?? nowIso()) : undefined;
      }
      return next;
    });
    set(persist({ projects: state.projects, tasks }));
  },

  deleteTask: (id) => {
    const state = get();
    set(persist({ projects: state.projects, tasks: state.tasks.filter((t) => t.id !== id) }));
  },

  /** 체크박스 = status === 'done' (plan.md §4) */
  toggleTaskDone: (id) => {
    const t = get().tasks.find((x) => x.id === id);
    if (!t) return;
    get().setTaskStatus(id, t.status === 'done' ? 'todo' : 'done');
  },

  setTaskStatus: (id, status) => {
    get().updateTask(id, { status });
  },

  setTaskPriority: (id, priority) => {
    get().updateTask(id, { priority });
  },

  moveTask: (id, toProjectId, beforeTaskId = null) => {
    const state = get();
    const moving = state.tasks.find((t) => t.id === id);
    if (!moving) return;
    if (!state.projects.some((p) => p.id === toProjectId)) return;

    const rest = state.tasks.filter((t) => t.id !== id);
    const target = rest
      .filter((t) => t.projectId === toProjectId)
      .sort((a, b) => a.order - b.order);

    const idx =
      beforeTaskId == null ? target.length : target.findIndex((t) => t.id === beforeTaskId);
    const insertAt = idx < 0 ? target.length : idx;

    const moved: Task = { ...moving, projectId: toProjectId, updatedAt: nowIso() };
    target.splice(insertAt, 0, moved);

    const reindexed = new Map(target.map((t, i) => [t.id, i]));
    const tasks = [...rest, moved].map((t) =>
      reindexed.has(t.id) ? { ...t, order: reindexed.get(t.id)!, projectId: toProjectId } : t,
    );

    set(persist({ projects: state.projects, tasks }));
  },

  setTaskDueDates: (entries) => {
    const state = get();
    if (entries.length === 0) return;
    const m = new Map(entries.map((e) => [e.id, e.dueDate]));
    const now = nowIso();
    const tasks = state.tasks.map((t) =>
      m.has(t.id) ? { ...t, dueDate: m.get(t.id), updatedAt: now } : t,
    );
    set(persist({ projects: state.projects, tasks }));
  },

  restoreTasks: (snapshots) => {
    const state = get();
    if (snapshots.length === 0) return;
    const alive = new Set(state.projects.map((p) => p.id));
    const byId = new Map(state.tasks.map((t) => [t.id, t]));

    for (const snap of snapshots) {
      // 그 사이 소속 큰 과업이 사라졌다면 되살릴 자리가 없다
      if (!alive.has(snap.projectId)) continue;
      byId.set(snap.id, snap);
    }
    set(persist({ projects: state.projects, tasks: [...byId.values()] }));
  },

  reorderTasksInProject: (projectId, orderedIds) => {
    const state = get();
    const rank = new Map(orderedIds.map((id, i) => [id, i]));
    const tasks = state.tasks.map((t) =>
      t.projectId === projectId && rank.has(t.id) ? { ...t, order: rank.get(t.id)! } : t,
    );
    set(persist({ projects: state.projects, tasks }));
  },

  /* ---------------------------- 데이터 전체 ---------------------------- */

  replaceAll: (data) => {
    set({ ...persist({ projects: data.projects, tasks: data.tasks }), hydrated: true });
  },

  exportJson: () => JSON.stringify(snapshot(get()), null, 2),

  importJson: (json) => {
    try {
      const parsed = JSON.parse(json) as Partial<AppData>;
      if (!Array.isArray(parsed.projects) || !Array.isArray(parsed.tasks)) {
        return { ok: false, message: 'projects / tasks 배열이 없는 파일이에요.' };
      }
      const projects = parsed.projects as Project[];
      const ids = new Set(projects.map((p) => p.id));
      // 소속 없는 할 일이 섞여 들어오면 버린다 (고아 데이터 방지)
      const tasks = (parsed.tasks as Task[]).filter((t) => ids.has(t.projectId));
      set(persist({ projects, tasks }));
      return {
        ok: true,
        message: `큰 과업 ${projects.length}개, 할 일 ${tasks.length}개를 불러왔어요.`,
      };
    } catch {
      return { ok: false, message: '읽을 수 없는 JSON 파일이에요.' };
    }
  },

  clearAll: () => {
    set(persist({ projects: [], tasks: [] }));
  },

  loadSeed: () => {
    const seed = createSeedData();
    set(persist({ projects: seed.projects, tasks: seed.tasks }));
  },
}));
