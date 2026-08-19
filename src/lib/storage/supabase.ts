'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppData, Priority, Project, ProjectColor, Status, Task } from '../types';
import type { StorageAdapter } from './adapter';

/**
 * 서버 저장소 (헌법 III의 교체 지점).
 *
 * 인터페이스는 `save(전체 데이터)` 그대로지만, 안에서는 **바뀐 행만** 보낸다.
 * 통째로 덮어쓰면 "폰에서 체크한 것을 노트북의 열린 탭이 되돌리는" 손실이 실제로 생긴다.
 * 마지막으로 서버와 맞춘 상태를 들고 있다가 그것과 비교해, 달라진 행만 upsert 하고
 * 사라진 행만 delete 한다. 같은 행이 양쪽에서 바뀌면 updated_at 이 나중인 쪽이 남는다.
 */

/* ------------------------- 행 ↔ 도메인 변환 ------------------------- */

interface ProjectRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: Status;
  priority: Priority;
  due_date: string | null;
  color: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface TaskRow {
  id: string;
  user_id: string;
  project_id: string;
  title: string;
  notes: string | null;
  status: Status;
  due_date: string | null;
  priority: Priority | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

function toProjectRow(p: Project, userId: string): ProjectRow {
  return {
    id: p.id,
    user_id: userId,
    title: p.title,
    description: p.description ?? null,
    status: p.status,
    priority: p.priority,
    due_date: p.dueDate ?? null,
    color: p.color,
    sort_order: p.order,
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  };
}

function fromProjectRow(r: ProjectRow): Project {
  return {
    id: r.id,
    title: r.title,
    description: r.description ?? undefined,
    status: r.status,
    priority: r.priority,
    dueDate: r.due_date ?? undefined,
    color: r.color as ProjectColor,
    order: r.sort_order,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function toTaskRow(t: Task, userId: string): TaskRow {
  return {
    id: t.id,
    user_id: userId,
    project_id: t.projectId,
    title: t.title,
    notes: t.notes ?? null,
    status: t.status,
    due_date: t.dueDate ?? null,
    priority: t.priority,
    sort_order: t.order,
    created_at: t.createdAt,
    updated_at: t.updatedAt,
    completed_at: t.completedAt ?? null,
  };
}

function fromTaskRow(r: TaskRow): Task {
  return {
    id: r.id,
    projectId: r.project_id,
    title: r.title,
    notes: r.notes ?? undefined,
    status: r.status,
    dueDate: r.due_date ?? undefined,
    priority: r.priority,
    order: r.sort_order,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    completedAt: r.completed_at ?? undefined,
  };
}

/** 보낼 값이 실제로 달라졌는지 — 안 바뀐 행까지 upsert 하면 남의 기기 변경을 되돌릴 수 있다 */
function sameRow(a: object, b: object): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/* ------------------------------ 어댑터 ------------------------------ */

export class SupabaseAdapter implements StorageAdapter {
  readonly name = 'supabase';

  private lastProjects = new Map<string, ProjectRow>();
  private lastTasks = new Map<string, TaskRow>();

  constructor(
    private readonly db: SupabaseClient,
    private readonly userId: string,
    /** 저장이 끝났음을 알린다 — 실시간 수신 쪽이 자기 변경을 되받아 덮어쓰지 않도록 */
    private readonly onSaved?: () => void,
  ) {}

  async load(): Promise<AppData | null> {
    const [p, t] = await Promise.all([
      this.db.from('projects').select('*').eq('user_id', this.userId),
      this.db.from('tasks').select('*').eq('user_id', this.userId),
    ]);
    if (p.error) throw p.error;
    if (t.error) throw t.error;

    const projectRows = (p.data ?? []) as ProjectRow[];
    const taskRows = (t.data ?? []) as TaskRow[];

    this.lastProjects = new Map(projectRows.map((r) => [r.id, r]));
    this.lastTasks = new Map(taskRows.map((r) => [r.id, r]));

    // 서버가 비어 있으면 null 을 돌려준다. 호출자는 이걸 "가져올 게 없다" 로 읽고
    // 로컬 데이터를 올리거나 샘플로 시작한다.
    if (projectRows.length === 0 && taskRows.length === 0) return null;

    return {
      version: 1,
      projects: projectRows.map(fromProjectRow),
      tasks: taskRows.map(fromTaskRow),
    };
  }

  async save(data: AppData): Promise<void> {
    const nextProjects = new Map(
      data.projects.map((p) => [p.id, toProjectRow(p, this.userId)] as const),
    );
    const nextTasks = new Map(data.tasks.map((t) => [t.id, toTaskRow(t, this.userId)] as const));

    const changedProjects = [...nextProjects.values()].filter((r) => {
      const prev = this.lastProjects.get(r.id);
      return !prev || !sameRow(prev, r);
    });
    const changedTasks = [...nextTasks.values()].filter((r) => {
      const prev = this.lastTasks.get(r.id);
      return !prev || !sameRow(prev, r);
    });

    const removedProjectIds = [...this.lastProjects.keys()].filter((id) => !nextProjects.has(id));
    const removedTaskIds = [...this.lastTasks.keys()].filter((id) => !nextTasks.has(id));

    // 순서가 중요하다.
    //  · 큰 과업을 먼저 올려야 할 일의 외래 키가 걸리지 않는다.
    //  · 할 일을 먼저 지워야 큰 과업 삭제가 예상 밖의 연쇄 삭제로 번지지 않는다.
    if (changedProjects.length > 0) {
      const { error } = await this.db.from('projects').upsert(changedProjects);
      if (error) throw error;
    }
    if (changedTasks.length > 0) {
      const { error } = await this.db.from('tasks').upsert(changedTasks);
      if (error) throw error;
    }
    if (removedTaskIds.length > 0) {
      const { error } = await this.db.from('tasks').delete().in('id', removedTaskIds);
      if (error) throw error;
    }
    if (removedProjectIds.length > 0) {
      const { error } = await this.db.from('projects').delete().in('id', removedProjectIds);
      if (error) throw error;
    }

    this.lastProjects = nextProjects;
    this.lastTasks = nextTasks;
    this.onSaved?.();
  }

  async clear(): Promise<void> {
    const t = await this.db.from('tasks').delete().eq('user_id', this.userId);
    if (t.error) throw t.error;
    const p = await this.db.from('projects').delete().eq('user_id', this.userId);
    if (p.error) throw p.error;
    this.lastProjects = new Map();
    this.lastTasks = new Map();
  }
}
