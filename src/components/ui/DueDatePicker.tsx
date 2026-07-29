'use client';

import { useEffect, useRef, useState } from 'react';
import { addDays, daysFromToday, humanDue, todayStr } from '@/lib/date';
import type { DateStr } from '@/lib/types';
import { DueBadge } from './Badge';
import Icon from './Icon';

interface Props {
  value: DateStr | undefined;
  onChange: (v: DateStr | undefined) => void;
  /** 날짜가 없을 때도 항상 트리거를 보여줄지 */
  alwaysShow?: boolean;
}

/**
 * 카드 위에서 마감일을 바로 바꾸는 팝오버 (다이얼로그를 열지 않는다).
 * 배치 후 "하루 당기자" 같은 미세 조정을 값싸게 만들기 위한 것.
 */
export default function DueDatePicker({ value, onChange, alwaysShow = true }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const today = todayStr();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!value && !alwaysShow) return null;

  const tone: 'overdue' | 'today' | 'normal' = value
    ? daysFromToday(value) < 0
      ? 'overdue'
      : daysFromToday(value) === 0
        ? 'today'
        : 'normal'
    : 'normal';

  const quick: { label: string; date: DateStr }[] = [
    { label: '오늘', date: today },
    { label: '내일', date: addDays(today, 1) },
    { label: '모레', date: addDays(today, 2) },
    { label: '다음 주', date: addDays(today, 7) },
  ];

  const pick = (d: DateStr | undefined) => {
    onChange(d);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        aria-label={value ? `마감일 ${value} 변경` : '마감일 지정'}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="tap-44 inline-flex items-center rounded transition-colors"
      >
        {value ? (
          <DueBadge text={humanDue(value)} tone={tone} />
        ) : (
          <span
            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] transition-colors"
            style={{ color: 'var(--text-faint)' }}
          >
            <Icon name="calendar" size={12} /> 날짜
          </span>
        )}
      </button>

      {open && (
        <div
          className="pop-in absolute left-0 top-full z-40 mt-1 w-56 rounded-lg border p-2"
          style={{
            background: 'var(--bg-elevated)',
            borderColor: 'var(--border)',
            boxShadow: 'var(--shadow)',
          }}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="mb-2 grid grid-cols-2 gap-1">
            {quick.map((q) => (
              <button
                key={q.label}
                type="button"
                onClick={() => pick(q.date)}
                className="rounded-md px-2 py-2.5 text-left text-[12px] transition-colors"
                style={{
                  background: value === q.date ? 'var(--surface-hover)' : 'transparent',
                  color: 'var(--text)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover)')}
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background =
                    value === q.date ? 'var(--surface-hover)' : 'transparent')
                }
              >
                {q.label}
              </button>
            ))}
          </div>

          <input
            type="date"
            value={value ?? ''}
            onChange={(e) => pick(e.target.value || undefined)}
            className="w-full rounded-md border px-2 py-1.5 text-[12px] outline-none"
            style={{
              background: 'var(--surface)',
              borderColor: 'var(--border)',
              color: 'var(--text)',
            }}
          />

          {value && (
            <button
              type="button"
              onClick={() => pick(undefined)}
              className="mt-1.5 w-full rounded-md px-2 py-2.5 text-[12px] transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              마감일 지우기
            </button>
          )}
        </div>
      )}
    </div>
  );
}
