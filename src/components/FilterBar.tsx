'use client';

import { PRIORITY_LABEL } from '@/lib/constants';
import { isFilterActive, type TaskFilter } from '@/lib/derive';
import { useAppStore } from '@/store/useAppStore';
import { useUiStore } from '@/store/useUiStore';
import Icon from './ui/Icon';

/** 필터가 걸려 있으면 눈에 보이게 하고 한 번에 풀 수 있게 한다 (FR-4.5) */
export default function FilterBar({ filter }: { filter: TaskFilter }) {
  const projects = useAppStore((s) => s.projects);
  const setSearch = useUiStore((s) => s.setSearch);
  const setProjectFilter = useUiStore((s) => s.setProjectFilter);
  const setPriorityFilter = useUiStore((s) => s.setPriorityFilter);
  const setHideCompleted = useUiStore((s) => s.setHideCompleted);
  const resetFilters = useUiStore((s) => s.resetFilters);

  if (!isFilterActive(filter)) return null;

  const chips: { label: string; clear: () => void }[] = [];
  if (filter.search.trim())
    chips.push({ label: `검색 "${filter.search.trim()}"`, clear: () => setSearch('') });
  if (filter.projectId) {
    const p = projects.find((x) => x.id === filter.projectId);
    chips.push({ label: p?.title ?? '알 수 없는 과업', clear: () => setProjectFilter(null) });
  }
  if (filter.priority)
    chips.push({
      label: `우선순위 ${PRIORITY_LABEL[filter.priority]}`,
      clear: () => setPriorityFilter(null),
    });
  if (filter.hideCompleted)
    chips.push({ label: '완료 숨김', clear: () => setHideCompleted(false) });

  return (
    <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto px-4 pb-2">
      {chips.map((c) => (
        <button
          key={c.label}
          type="button"
          onClick={c.clear}
          className="flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px]"
          style={{
            background: 'color-mix(in srgb, var(--accent) 14%, transparent)',
            color: 'var(--accent)',
          }}
        >
          {c.label}
          <Icon name="close" size={11} />
        </button>
      ))}
      <button
        type="button"
        onClick={resetFilters}
        className="shrink-0 px-1.5 text-[11.5px] underline"
        style={{ color: 'var(--text-faint)' }}
      >
        모두 해제
      </button>
    </div>
  );
}
