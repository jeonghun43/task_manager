'use client';

import { useMemo } from 'react';
import type { DraggableAttributes } from '@dnd-kit/core';
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PRIORITY_LABEL, PRIORITY_ORDER, STATUS_LABEL, STATUS_ORDER } from '@/lib/constants';
import { effectivePriority, isInherited } from '@/lib/derive';
import { useAppStore } from '@/store/useAppStore';
import { useToastStore } from '@/store/useToastStore';
import type { DateStr, Project, Task } from '@/lib/types';
import { PriorityBadge, ProjectBadge } from './ui/Badge';
import Checkbox from './ui/Checkbox';
import DueDatePicker from './ui/DueDatePicker';
import Icon from './ui/Icon';
import Menu, { type MenuItem } from './ui/Menu';

interface TaskCardProps {
  task: Task;
  project: Project | undefined;
  /** 소속 배지 표시 — 과업별 뷰에서는 컬럼 자체가 소속이므로 끈다 */
  showProject?: boolean;
  onEdit: (task: Task) => void;
  /**
   * 마감일 칩을 눌렀을 때의 동작을 바깥에서 가로챈다.
   * 캘린더 역산 미리보기처럼 아직 저장하면 안 되는 상황에서 쓴다.
   */
  onDueChange?: (date: DateStr | undefined) => void;
  /** 드래그 중인 원본 카드는 반투명 처리 */
  ghost?: boolean;
  dragHandle?: {
    attributes: Record<string, unknown> | DraggableAttributes;
    listeners: SyntheticListenerMap | undefined;
    setActivatorNodeRef?: (el: HTMLElement | null) => void;
  };
}

export function TaskCardBody({
  task,
  project,
  showProject,
  onEdit,
  onDueChange,
  ghost,
  dragHandle,
}: TaskCardProps) {
  const projects = useAppStore((s) => s.projects);
  const toggleTaskDone = useAppStore((s) => s.toggleTaskDone);
  const setTaskStatus = useAppStore((s) => s.setTaskStatus);
  const setTaskPriority = useAppStore((s) => s.setTaskPriority);
  const moveTask = useAppStore((s) => s.moveTask);
  const deleteTask = useAppStore((s) => s.deleteTask);
  const restoreTasks = useAppStore((s) => s.restoreTasks);
  const showUndo = useToastStore((s) => s.showUndo);

  const updateTask = useAppStore((s) => s.updateTask);
  const done = task.status === 'done';
  const prio = effectivePriority(task, project);
  const inherited = isInherited(task);

  /** 드래그로 가능한 모든 동작의 대체 경로 (헌법 V) */
  const menuItems: MenuItem[] = useMemo(() => {
    const others = [...projects].sort((a, b) => a.order - b.order);
    const items: MenuItem[] = [
      { kind: 'header', label: '상태' },
      ...STATUS_ORDER.map<MenuItem>((s) => ({
        kind: 'item',
        label: STATUS_LABEL[s],
        checked: task.status === s,
        onSelect: () => setTaskStatus(task.id, s),
      })),
      { kind: 'divider' },
      { kind: 'header', label: '우선순위' },
      {
        kind: 'item',
        label: '큰 과업 따라가기',
        checked: inherited,
        onSelect: () => setTaskPriority(task.id, null),
      },
      ...PRIORITY_ORDER.map<MenuItem>((p) => ({
        kind: 'item',
        label: PRIORITY_LABEL[p],
        checked: !inherited && task.priority === p,
        onSelect: () => setTaskPriority(task.id, p),
      })),
    ];

    if (others.length > 1) {
      items.push({ kind: 'divider' }, { kind: 'header', label: '다른 과업으로 이동' });
      for (const p of others) {
        if (p.id === task.projectId) continue;
        items.push({
          kind: 'item',
          label: p.title,
          onSelect: () => {
            const before = task;
            moveTask(task.id, p.id);
            showUndo(`"${task.title}" 을(를) ${p.title} 으로 옮겼어요`, () =>
              restoreTasks([before]),
            );
          },
        });
      }
    }

    items.push(
      { kind: 'divider' },
      { kind: 'item', label: '편집', icon: <Icon name="pencil" size={14} />, onSelect: () => onEdit(task) },
      {
        kind: 'item',
        label: '삭제',
        icon: <Icon name="trash" size={14} />,
        danger: true,
        // 되돌릴 수 있는 동작은 묻지 않는다 — 실행하고 되돌릴 기회를 준다
        onSelect: () => {
          const before = task;
          deleteTask(task.id);
          showUndo(`"${task.title}" 을(를) 삭제했어요`, () => restoreTasks([before]));
        },
      },
    );
    return items;
  }, [
    projects,
    task,
    inherited,
    setTaskStatus,
    setTaskPriority,
    moveTask,
    deleteTask,
    restoreTasks,
    showUndo,
    onEdit,
  ]);

  return (
    <div
        data-color={project?.color}
        className="group rounded-lg border p-2.5 transition-colors"
        style={{
          background: 'var(--surface)',
          borderColor: 'var(--border)',
          opacity: ghost ? 0.35 : done ? 0.62 : 1,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
      >
        <div className="flex items-start gap-2.5">
          <div className="pt-0.5">
            <Checkbox
              checked={done}
              partial={task.status === 'in_progress'}
              onChange={() => toggleTaskDone(task.id)}
              label={`${task.title} 완료 표시`}
            />
          </div>

          <button
            type="button"
            onClick={() => onEdit(task)}
            className="min-w-0 flex-1 cursor-pointer text-left"
            {...(dragHandle?.attributes ?? {})}
            {...(dragHandle?.listeners ?? {})}
            ref={dragHandle?.setActivatorNodeRef}
          >
            <p
              className="text-[13.5px] leading-snug break-words"
              style={{
                textDecoration: done ? 'line-through' : 'none',
                color: done ? 'var(--text-muted)' : 'var(--text)',
              }}
            >
              {task.title}
            </p>
            {task.notes && (
              <p
                className="mt-1 line-clamp-2 text-[11.5px] leading-snug break-words"
                style={{ color: 'var(--text-faint)' }}
              >
                {task.notes}
              </p>
            )}
          </button>

          <Menu items={menuItems} label={`${task.title} 메뉴`} />
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-[26px]">
          {showProject && <ProjectBadge project={project} />}
          <PriorityBadge priority={prio} inherited={inherited} />
          {/* 날짜 칩을 눌러 그 자리에서 마감일을 바꾼다 — 다이얼로그를 열지 않는다 */}
          <DueDatePicker
            value={task.dueDate}
            onChange={(d) =>
              onDueChange ? onDueChange(d) : updateTask(task.id, { dueDate: d })
            }
          />

          {task.status === 'in_progress' && (
            <span
              className="rounded px-1.5 py-0.5 text-[11px]"
              style={{
                background: 'color-mix(in srgb, var(--status-progress) 15%, transparent)',
                color: 'var(--status-progress)',
              }}
            >
              진행 중
            </span>
          )}
        </div>
    </div>
  );
}

/** 보드 뷰에서 쓰는 드래그 가능한 카드. DndContext + SortableContext 안에서만 사용한다. */
export default function SortableTaskCard(props: Omit<TaskCardProps, 'dragHandle' | 'ghost'>) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: props.task.id, data: { type: 'task', task: props.task } });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className="touch-manipulation"
    >
      <TaskCardBody
        {...props}
        ghost={isDragging}
        dragHandle={{ attributes, listeners, setActivatorNodeRef }}
      />
    </div>
  );
}

/** 목록형 뷰(마감기한·캘린더)에서 쓰는 드래그 없는 카드 */
export function StaticTaskCard(props: Omit<TaskCardProps, 'dragHandle' | 'ghost'>) {
  return <TaskCardBody {...props} />;
}
