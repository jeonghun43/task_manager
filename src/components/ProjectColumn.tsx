'use client';

import { useRef, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { humanDue } from '@/lib/date';
import { projectProgress } from '@/lib/derive';
import { useAppStore } from '@/store/useAppStore';
import type { Project, Task } from '@/lib/types';
import ProgressBar from './ProgressBar';
import SortableTaskCard from './TaskCard';
import { PriorityBadge, StatusBadge } from './ui/Badge';
import Icon from './ui/Icon';
import Menu, { type MenuItem } from './ui/Menu';

interface Props {
  project: Project;
  tasks: Task[];
  /** 필터 때문에 가려진 개수 */
  hiddenCount: number;
  onEditTask: (task: Task) => void;
  onEditProject: (project: Project) => void;
  onDeleteProject: (project: Project) => void;
  onMoveProject: (project: Project, dir: -1 | 1) => void;
}

export default function ProjectColumn({
  project,
  tasks,
  hiddenCount,
  onEditTask,
  onEditProject,
  onDeleteProject,
  onMoveProject,
}: Props) {
  const addTask = useAppStore((s) => s.addTask);
  const allTasks = useAppStore((s) => s.tasks);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // 진행률은 필터와 무관하게 전체 기준으로 계산한다
  const progress = projectProgress(project.id, allTasks);

  const { setNodeRef, isOver } = useDroppable({
    id: `project-col:${project.id}`,
    data: { type: 'project-column', projectId: project.id },
  });

  const commit = () => {
    const t = draft.trim();
    if (!t) {
      setAdding(false);
      return;
    }
    addTask(project.id, t);
    setDraft('');
    // 입력창을 열어둔 채 연속 입력 (헌법 IV)
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const menuItems: MenuItem[] = [
    {
      kind: 'item',
      label: '편집',
      icon: <Icon name="pencil" size={14} />,
      onSelect: () => onEditProject(project),
    },
    {
      kind: 'item',
      label: '할 일 추가',
      icon: <Icon name="plus" size={14} />,
      onSelect: () => setAdding(true),
    },
    { kind: 'divider' },
    {
      kind: 'item',
      label: '왼쪽으로 이동',
      icon: <Icon name="arrow-left" size={14} />,
      onSelect: () => onMoveProject(project, -1),
    },
    {
      kind: 'item',
      label: '오른쪽으로 이동',
      icon: <Icon name="arrow-right" size={14} />,
      onSelect: () => onMoveProject(project, 1),
    },
    { kind: 'divider' },
    {
      kind: 'item',
      label: '삭제',
      icon: <Icon name="trash" size={14} />,
      danger: true,
      onSelect: () => onDeleteProject(project),
    },
  ];

  return (
    <section
      data-color={project.color}
      className="flex w-[85vw] shrink-0 snap-start flex-col rounded-xl border sm:w-[300px]"
      style={{
        background: 'var(--bg-elevated)',
        borderColor: isOver ? 'var(--pc)' : 'var(--border)',
        maxHeight: '100%',
      }}
    >
      {/* 헤더 */}
      <div className="border-b p-3" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-start gap-2">
          <span
            className="mt-1 h-3.5 w-1 shrink-0 rounded-full"
            style={{ background: 'var(--pc)' }}
            aria-hidden
          />
          <button
            type="button"
            onClick={() => onEditProject(project)}
            className="min-w-0 flex-1 text-left"
          >
            <h2 className="text-[14px] font-semibold leading-snug break-words">{project.title}</h2>
            {project.description && (
              <p
                className="mt-0.5 line-clamp-2 text-[11.5px] leading-snug"
                style={{ color: 'var(--text-faint)' }}
              >
                {project.description}
              </p>
            )}
          </button>
          <Menu items={menuItems} label={`${project.title} 메뉴`} />
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <StatusBadge status={project.status} />
          <PriorityBadge priority={project.priority} />
          {project.dueDate && (
            <span
              className="inline-flex items-center gap-1 text-[11px]"
              style={{ color: 'var(--text-faint)' }}
            >
              <Icon name="calendar" size={12} />
              {humanDue(project.dueDate)}
            </span>
          )}
        </div>

        <div className="mt-2.5">
          <ProgressBar progress={progress} />
        </div>
      </div>

      {/* 인라인 추가 (FR-2.1) — 새 할 일이 맨 위에 쌓이므로 입력창도 목록 위에 둔다 */}
      <div className="shrink-0 border-b p-2" style={{ borderColor: 'var(--border)' }}>
        {adding ? (
          <input
            ref={inputRef}
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commit();
              }
              if (e.key === 'Escape') {
                setDraft('');
                setAdding(false);
              }
            }}
            onBlur={commit}
            placeholder="할 일을 적고 Enter"
            className="w-full rounded-lg border px-2.5 py-2 text-[13px] outline-none"
            style={{
              background: 'var(--surface)',
              borderColor: 'var(--pc)',
              color: 'var(--text)',
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex w-full items-center gap-1.5 rounded-lg px-2.5 py-2.5 text-left text-[13px] transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <Icon name="plus" size={14} /> 할 일 추가
          </button>
        )}
      </div>

      {/* 카드 목록 */}
      <div
        ref={setNodeRef}
        className="thin-scroll flex-1 overflow-y-auto p-2"
        style={{ minHeight: 80 }}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-2">
            {tasks.map((t) => (
              <SortableTaskCard key={t.id} task={t} project={project} onEdit={onEditTask} />
            ))}
          </div>
        </SortableContext>

        {tasks.length === 0 && (
          <p className="px-1 py-6 text-center text-[12px]" style={{ color: 'var(--text-faint)' }}>
            {hiddenCount > 0 ? '필터에 맞는 할 일이 없어요' : '이 과업을 쪼개서 할 일을 추가해보세요'}
          </p>
        )}

        {hiddenCount > 0 && tasks.length > 0 && (
          <p className="px-1 pt-2 text-[11px]" style={{ color: 'var(--text-faint)' }}>
            필터로 {hiddenCount}개 숨김
          </p>
        )}
      </div>

    </section>
  );
}
