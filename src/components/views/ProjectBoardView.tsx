'use client';

import { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { compareByDeadline, filterTasks, projectMap, type TaskFilter } from '@/lib/derive';
import { useAppStore } from '@/store/useAppStore';
import { useToastStore } from '@/store/useToastStore';
import { useUiStore } from '@/store/useUiStore';
import Icon from '../ui/Icon';
import type { Project, Task } from '@/lib/types';
import ProjectColumn from '../ProjectColumn';
import { TaskCardBody } from '../TaskCard';
import { useBoardSensors } from '../useBoardSensors';

interface Props {
  filter: TaskFilter;
  onEditTask: (task: Task) => void;
  onEditProject: (project: Project) => void;
  onDeleteProject: (project: Project) => void;
  onNewProject: () => void;
}

/**
 * 과업별 뷰 (FR-3.1)
 * 큰 과업 = 컬럼, 작은 과업 = 카드. Padlet 처럼 목표 아래 실행 단위가 쌓인다.
 */
export default function ProjectBoardView({
  filter,
  onEditTask,
  onEditProject,
  onDeleteProject,
  onNewProject,
}: Props) {
  const projects = useAppStore((s) => s.projects);
  const tasks = useAppStore((s) => s.tasks);
  const moveTask = useAppStore((s) => s.moveTask);
  const reorderTasksInProject = useAppStore((s) => s.reorderTasksInProject);
  const reorderProjects = useAppStore((s) => s.reorderProjects);
  const restoreTasks = useAppStore((s) => s.restoreTasks);
  const showUndo = useToastStore((s) => s.showUndo);
  const boardSort = useUiStore((s) => s.boardSort);
  const setBoardSort = useUiStore((s) => s.setBoardSort);
  const sensors = useBoardSensors();

  const [activeId, setActiveId] = useState<string | null>(null);

  const pmap = useMemo(() => projectMap(projects), [projects]);
  const orderedProjects = useMemo(
    () =>
      [...projects]
        .sort((a, b) => a.order - b.order)
        .filter((p) => (filter.projectId ? p.id === filter.projectId : true)),
    [projects, filter.projectId],
  );

  const visible = useMemo(() => filterTasks(tasks, pmap, filter), [tasks, pmap, filter]);

  const byProject = useMemo(() => {
    const m = new Map<string, Task[]>();
    for (const p of projects) m.set(p.id, []);
    for (const t of visible) m.get(t.projectId)?.push(t);
    // 마감일 순: 날짜가 있는 것이 앞, 같은 날짜면 우선순위, 날짜가 없으면 입력 순서로 자연히 수렴한다
    for (const list of m.values()) {
      list.sort(
        boardSort === 'deadline'
          ? (a, b) => compareByDeadline(a, b, pmap)
          : (a, b) => a.order - b.order,
      );
    }
    return m;
  }, [visible, projects, boardSort, pmap]);

  const totalByProject = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of tasks) m.set(t.projectId, (m.get(t.projectId) ?? 0) + 1);
    return m;
  }, [tasks]);

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : undefined;

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;

    const dragged = tasks.find((t) => t.id === active.id);
    if (!dragged) return;

    // 드롭 대상이 컬럼 자체인지, 다른 카드 위인지 판별
    const overId = String(over.id);
    const overTask = tasks.find((t) => t.id === overId);
    const targetProjectId = overTask
      ? overTask.projectId
      : overId.startsWith('project-col:')
        ? overId.slice('project-col:'.length)
        : null;
    if (!targetProjectId) return;

    if (targetProjectId === dragged.projectId) {
      // 마감일 순으로 보고 있으면 정렬이 순서를 덮어쓰므로 같은 컬럼 안 재배치는 받지 않는다
      if (boardSort === 'deadline') return;
      const list = (byProject.get(targetProjectId) ?? []).map((t) => t.id);
      const from = list.indexOf(dragged.id);
      const to = overTask ? list.indexOf(overTask.id) : list.length - 1;
      if (from === -1 || to === -1 || from === to) return;
      reorderTasksInProject(targetProjectId, arrayMove(list, from, to));
    } else {
      // 드래그는 오조작이 쉽다 — 되돌릴 기회를 반드시 남긴다
      const before = dragged;
      const toTitle = pmap.get(targetProjectId)?.title ?? '';
      moveTask(dragged.id, targetProjectId, overTask ? overTask.id : null);
      showUndo(`"${dragged.title}" 을(를) ${toTitle} 으로 옮겼어요`, () =>
        restoreTasks([before]),
      );
    }
  };

  const moveProject = (project: Project, dir: -1 | 1) => {
    const ids = [...projects].sort((a, b) => a.order - b.order).map((p) => p.id);
    const from = ids.indexOf(project.id);
    const to = from + dir;
    if (to < 0 || to >= ids.length) return;
    reorderProjects(arrayMove(ids, from, to));
  };

  if (projects.length === 0) {
    return <EmptyState onNewProject={onNewProject} />;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex h-full flex-col overflow-hidden">
        {/*
          토글 버튼은 라벨이 "현재 상태"인지 "누르면 될 상태"인지 알 수 없다.
          두 선택지를 나란히 보여주고 활성 쪽을 강조하면 그 애매함이 사라진다.
        */}
        <div className="flex shrink-0 items-center gap-2 px-4 pb-2">
          <div
            role="group"
            aria-label="할 일 정렬"
            className="flex items-center gap-0.5 rounded-lg p-0.5"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            {(
              [
                { key: 'deadline', label: '마감일 순' },
                { key: 'manual', label: '직접 순서' },
              ] as const
            ).map((opt) => {
              const active = boardSort === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setBoardSort(opt.key)}
                  className="rounded-md px-2.5 py-1 text-[11.5px] font-medium transition-colors"
                  style={{
                    background: active ? 'var(--accent)' : 'transparent',
                    color: active ? 'var(--accent-contrast)' : 'var(--text-muted)',
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <span
            className="inline-flex items-center gap-1 text-[11px]"
            style={{ color: 'var(--text-faint)' }}
          >
            {boardSort === 'deadline' ? (
              <>
                <Icon name="calendar" size={12} />
                날짜 없는 할 일은 뒤로
              </>
            ) : (
              <>
                <Icon name="more-vertical" size={12} />
                끌어서 순서 바꾸기
              </>
            )}
          </span>
        </div>

        <div className="thin-scroll flex min-h-0 flex-1 snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 sm:snap-none">
          {orderedProjects.map((p) => {
            const shown = byProject.get(p.id) ?? [];
            const total = totalByProject.get(p.id) ?? 0;
            return (
              <ProjectColumn
                key={p.id}
                project={p}
                tasks={shown}
                hiddenCount={total - shown.length}
                onEditTask={onEditTask}
                onEditProject={onEditProject}
                onDeleteProject={onDeleteProject}
                onMoveProject={moveProject}
              />
            );
          })}

          <button
            type="button"
            onClick={onNewProject}
            className="flex h-fit w-[85vw] shrink-0 snap-start items-center justify-center gap-1.5 rounded-xl border border-dashed py-4 text-[13px] transition-colors sm:w-[300px]"
            style={{ borderColor: 'var(--border-strong)', color: 'var(--text-muted)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <Icon name="plus" size={14} /> 새 큰 과업
          </button>
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeTask && (
          <div className="w-[280px] rotate-1 opacity-95">
            <TaskCardBody
              task={activeTask}
              project={pmap.get(activeTask.projectId)}
              onEdit={() => {}}
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

function EmptyState({ onNewProject }: { onNewProject: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-[15px] font-medium">아직 큰 과업이 없어요</p>
      <p className="max-w-sm text-[13px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        먼저 달성하려는 목표를 큰 과업으로 만들고,
        <br />
        그 아래에 실제로 착수할 수 있는 할 일을 쪼개어 넣어보세요.
      </p>
      <button
        type="button"
        onClick={onNewProject}
        className="mt-1 rounded-lg px-4 py-2 text-[13px] font-medium"
        style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
      >
        <span className="inline-flex items-center gap-1.5">
          <Icon name="plus" size={14} /> 새 큰 과업 만들기
        </span>
      </button>
    </div>
  );
}
