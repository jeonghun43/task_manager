'use client';

import { useMemo } from 'react';
import {
  DEADLINE_GROUPS,
  compareByDeadline,
  deadlineGroupOf,
  filterTasks,
  projectMap,
  type DeadlineGroupKey,
  type TaskFilter,
} from '@/lib/derive';
import { useAppStore } from '@/store/useAppStore';
import type { Task } from '@/lib/types';
import { StaticTaskCard } from '../TaskCard';

interface Props {
  filter: TaskFilter;
  onEditTask: (task: Task) => void;
}

/**
 * 마감기한 뷰 (FR-3.3)
 * 정렬: 마감일 → 같은 날짜면 우선순위 높은 것이 위 → 큰 과업 순서 (AC-6)
 */
export default function DeadlineView({ filter, onEditTask }: Props) {
  const projects = useAppStore((s) => s.projects);
  const tasks = useAppStore((s) => s.tasks);
  const pmap = useMemo(() => projectMap(projects), [projects]);

  const groups = useMemo(() => {
    const visible = filterTasks(tasks, pmap, filter).sort((a, b) =>
      compareByDeadline(a, b, pmap),
    );
    const m = new Map<DeadlineGroupKey, Task[]>();
    for (const g of DEADLINE_GROUPS) m.set(g.key, []);
    for (const t of visible) m.get(deadlineGroupOf(t.dueDate, t.status))?.push(t);
    return m;
  }, [tasks, pmap, filter]);

  const isEmpty = DEADLINE_GROUPS.every((g) => (groups.get(g.key)?.length ?? 0) === 0);

  if (isEmpty) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center">
        <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
          보여줄 할 일이 없어요
        </p>
      </div>
    );
  }

  return (
    <div className="thin-scroll h-full overflow-y-auto px-4 pb-8">
      <div className="mx-auto max-w-3xl space-y-6">
        {DEADLINE_GROUPS.map((g) => {
          const list = groups.get(g.key) ?? [];
          if (list.length === 0) return null;
          const urgent = g.key === 'overdue' || g.key === 'today';
          // 끝낸 것은 기록으로 남길 뿐 주의를 끌 필요가 없다
          const headingColor =
            g.key === 'done' ? 'var(--text-faint)' : urgent ? 'var(--p-red)' : 'var(--text)';

          return (
            <section key={g.key}>
              <div className="sticky top-0 z-10 -mx-1 mb-2 flex items-baseline gap-2 px-1 py-1.5 backdrop-blur" style={{ background: 'color-mix(in srgb, var(--bg) 85%, transparent)' }}>
                <h2
                  className="text-[13px] font-semibold"
                  style={{ color: headingColor }}
                >
                  {g.label}
                </h2>
                <span className="text-[12px]" style={{ color: 'var(--text-faint)' }}>
                  {list.length}
                </span>
                {g.hint && (
                  <span className="text-[11px]" style={{ color: 'var(--text-faint)' }}>
                    {g.hint}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-2">
                {list.map((t) => (
                  <StaticTaskCard
                    key={t.id}
                    task={t}
                    project={pmap.get(t.projectId)}
                    showProject
                    onEdit={onEditTask}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
