'use client';

import {
  PRIORITY_ICON,
  PRIORITY_LABEL,
  STATUS_DOT,
  STATUS_LABEL,
} from '@/lib/constants';
import type { Priority, Project, Status } from '@/lib/types';
import Icon from './Icon';

export function StatusBadge({ status, size = 'sm' }: { status: Status; size?: 'sm' | 'md' }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full font-medium ${
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
      }`}
      style={{
        background: `color-mix(in srgb, ${STATUS_DOT[status]} 16%, transparent)`,
        color: STATUS_DOT[status],
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: STATUS_DOT[status] }}
        aria-hidden
      />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function PriorityBadge({
  priority,
  inherited = false,
}: {
  priority: Priority;
  /** 상속받은 값이면 옅게 표시해 직접 지정한 것과 구분한다 */
  inherited?: boolean;
}) {
  const color =
    priority === 'high'
      ? 'var(--p-red)'
      : priority === 'medium'
        ? 'var(--p-amber)'
        : 'var(--p-blue)';

  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium"
      style={{
        background: `color-mix(in srgb, ${color} ${inherited ? 10 : 18}%, transparent)`,
        color: inherited ? `color-mix(in srgb, ${color} 72%, var(--text-muted))` : color,
      }}
      title={
        inherited
          ? `우선순위 ${PRIORITY_LABEL[priority]} — 큰 과업을 따라감`
          : `우선순위 ${PRIORITY_LABEL[priority]} — 직접 지정`
      }
    >
      <Icon name={PRIORITY_ICON[priority]} size={12} />
      {PRIORITY_LABEL[priority]}
      {inherited && (
        <Icon name="link" size={11} style={{ opacity: 0.7 }} />
      )}
      <span className="sr-only">
        {inherited ? '큰 과업에서 상속받은 우선순위' : '직접 지정한 우선순위'}
      </span>
    </span>
  );
}

/** 어느 큰 과업에 속한 할 일인지 알려주는 배지 (헌법 I) */
export function ProjectBadge({
  project,
  onClick,
}: {
  project: Project | undefined;
  onClick?: () => void;
}) {
  if (!project) return null;
  const Tag = onClick ? 'button' : 'span';
  return (
    <Tag
      {...(onClick ? { type: 'button' as const, onClick } : {})}
      data-color={project.color}
      className="inline-flex max-w-full shrink items-center gap-1.5 truncate rounded px-1.5 py-0.5 text-[11px] font-medium"
      style={{
        background: 'color-mix(in srgb, var(--pc) 15%, transparent)',
        color: 'var(--pc)',
      }}
      title={project.title}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: 'var(--pc)' }} aria-hidden />
      <span className="truncate">{project.title}</span>
    </Tag>
  );
}

/** 마감일 칩. 지났거나 오늘이면 강조한다. */
export function DueBadge({ text, tone }: { text: string; tone: 'overdue' | 'today' | 'normal' }) {
  const color =
    tone === 'overdue'
      ? 'var(--p-red)'
      : tone === 'today'
        ? 'var(--status-progress)'
        : 'var(--text-muted)';
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[11px]"
      style={{
        background:
          tone === 'normal' ? 'transparent' : `color-mix(in srgb, ${color} 14%, transparent)`,
        color,
      }}
    >
      <Icon name="calendar" size={12} />
      {text}
    </span>
  );
}
