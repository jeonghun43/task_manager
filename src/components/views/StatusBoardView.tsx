'use client';

import { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { STATUS_DOT, STATUS_LABEL, STATUS_ORDER } from '@/lib/constants';
import { compareByDeadline, filterTasks, projectMap, type TaskFilter } from '@/lib/derive';
import { useAppStore } from '@/store/useAppStore';
import { useToastStore } from '@/store/useToastStore';
import type { Project, Status, Task } from '@/lib/types';
import SortableTaskCard, { TaskCardBody } from '../TaskCard';
import { useBoardSensors } from '../useBoardSensors';

interface Props {
  filter: TaskFilter;
  onEditTask: (task: Task) => void;
}

/**
 * 상태별 뷰 (FR-3.2)
 * 모든 큰 과업의 할 일을 To-Do / 진행 중 / 완료로 다시 늘어놓는다.
 * 카드마다 소속 큰 과업 배지가 붙어 출처를 잃지 않는다 (헌법 I).
 */
export default function StatusBoardView({ filter, onEditTask }: Props) {
  const projects = useAppStore((s) => s.projects);
  const tasks = useAppStore((s) => s.tasks);
  const setTaskStatus = useAppStore((s) => s.setTaskStatus);
  const restoreTasks = useAppStore((s) => s.restoreTasks);
  const showUndo = useToastStore((s) => s.showUndo);
  const sensors = useBoardSensors();
  const [activeId, setActiveId] = useState<string | null>(null);

  const pmap = useMemo(() => projectMap(projects), [projects]);

  const columns = useMemo(() => {
    const visible = filterTasks(tasks, pmap, filter);
    const m = new Map<Status, Task[]>();
    for (const s of STATUS_ORDER) m.set(s, []);
    for (const t of visible) m.get(t.status)?.push(t);
    // 컬럼 안에서는 마감일 → 우선순위 순으로 정렬해 급한 것이 위로 온다
    for (const list of m.values()) list.sort((a, b) => compareByDeadline(a, b, pmap));
    return m;
  }, [tasks, pmap, filter]);

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : undefined;

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const dragged = tasks.find((t) => t.id === active.id);
    if (!dragged) return;

    const overId = String(over.id);
    const overTask = tasks.find((t) => t.id === overId);
    const targetStatus: Status | null = overTask
      ? overTask.status
      : overId.startsWith('status-col:')
        ? (overId.slice('status-col:'.length) as Status)
        : null;

    if (!targetStatus || targetStatus === dragged.status) return;

    const before = dragged;
    setTaskStatus(dragged.id, targetStatus);
    showUndo(`"${dragged.title}" 을(를) ${STATUS_LABEL[targetStatus]} 으로 옮겼어요`, () =>
      restoreTasks([before]),
    );
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="h-full overflow-hidden">
        <div className="thin-scroll flex h-full snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 sm:snap-none">
          {STATUS_ORDER.map((s) => (
            <StatusColumn
              key={s}
              status={s}
              tasks={columns.get(s) ?? []}
              pmap={pmap}
              onEditTask={onEditTask}
            />
          ))}
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeTask && (
          <div className="w-[280px] rotate-1 opacity-95">
            <TaskCardBody
              task={activeTask}
              project={pmap.get(activeTask.projectId)}
              showProject
              onEdit={() => {}}
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

function StatusColumn({
  status,
  tasks,
  pmap,
  onEditTask,
}: {
  status: Status;
  tasks: Task[];
  pmap: Map<string, Project>;
  onEditTask: (task: Task) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `status-col:${status}`,
    data: { type: 'status-column', status },
  });

  return (
    <section
      className="flex w-[85vw] shrink-0 snap-start flex-col rounded-xl border sm:w-[320px]"
      style={{
        background: 'var(--bg-elevated)',
        borderColor: isOver ? STATUS_DOT[status] : 'var(--border)',
        maxHeight: '100%',
      }}
    >
      <div
        className="flex items-center gap-2 border-b px-3 py-2.5"
        style={{ borderColor: 'var(--border)' }}
      >
        <span
          className="h-2 w-2 rounded-full"
          style={{ background: STATUS_DOT[status] }}
          aria-hidden
        />
        <h2 className="text-[13px] font-semibold">{STATUS_LABEL[status]}</h2>
        <span className="ml-auto text-[12px]" style={{ color: 'var(--text-faint)' }}>
          {tasks.length}
        </span>
      </div>

      <div ref={setNodeRef} className="thin-scroll flex-1 overflow-y-auto p-2" style={{ minHeight: 100 }}>
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-2">
            {tasks.map((t) => (
              <SortableTaskCard
                key={t.id}
                task={t}
                project={pmap.get(t.projectId)}
                showProject
                onEdit={onEditTask}
              />
            ))}
          </div>
        </SortableContext>

        {tasks.length === 0 && (
          <p className="px-1 py-8 text-center text-[12px]" style={{ color: 'var(--text-faint)' }}>
            비어 있어요
          </p>
        )}
      </div>
    </section>
  );
}
