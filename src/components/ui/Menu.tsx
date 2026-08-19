'use client';

import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';

export type MenuItem =
  | { kind: 'header'; label: string }
  | { kind: 'divider' }
  | {
      kind: 'item';
      label: string;
      icon?: React.ReactNode;
      danger?: boolean;
      checked?: boolean;
      onSelect: () => void;
    };

interface Props {
  items: MenuItem[];
  /** 트리거 버튼 내용 (기본: ⋮) */
  trigger?: React.ReactNode;
  label: string;
  align?: 'left' | 'right';
}

/**
 * ⋮ 드롭다운.
 * 드래그로 하는 모든 조작에는 이 메뉴를 통한 대체 경로가 있어야 한다 (헌법 V).
 */
export default function Menu({ items, trigger, label, align = 'right' }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

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

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-label={label}
        // 아이콘만 있는 버튼은 스크린 리더는 읽지만 마우스 사용자는 눌러봐야 안다 (FR-18 F4)
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="tap-44 flex h-8 w-8 items-center justify-center rounded-md text-sm transition-colors"
        style={{ color: 'var(--text-muted)' }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        {trigger ?? <Icon name="more-vertical" />}
      </button>

      {open && (
        <div
          role="menu"
          className={`thin-scroll pop-in absolute z-40 mt-1 max-h-80 min-w-48 overflow-y-auto rounded-lg border py-1 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
          style={{
            background: 'var(--bg-elevated)',
            borderColor: 'var(--border)',
            boxShadow: 'var(--shadow)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {items.map((item, i) => {
            if (item.kind === 'divider') {
              return (
                <div
                  key={i}
                  className="my-1 h-px"
                  style={{ background: 'var(--border)' }}
                  role="separator"
                />
              );
            }
            if (item.kind === 'header') {
              return (
                <div
                  key={i}
                  className="px-3 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--text-faint)' }}
                >
                  {item.label}
                </div>
              );
            }
            return (
              <button
                key={i}
                type="button"
                role="menuitem"
                onClick={() => {
                  item.onSelect();
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] transition-colors"
                style={{ color: item.danger ? 'var(--p-red)' : 'var(--text)' }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = 'var(--surface-hover)')
                }
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                {item.icon && (
                  <span className="flex w-4 shrink-0 items-center justify-center">{item.icon}</span>
                )}
                <span className="flex-1 truncate">{item.label}</span>
                {item.checked && <Icon name="check" size={14} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
