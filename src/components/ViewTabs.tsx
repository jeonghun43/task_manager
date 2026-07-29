'use client';

import { VIEWS } from '@/lib/constants';
import { useUiStore } from '@/store/useUiStore';
import type { ViewKey } from '@/lib/types';
import Icon from './ui/Icon';

/**
 * 뷰 전환은 반드시 onSelect 를 통한다.
 * 스토어의 setView 를 직접 부르면 저장하지 않은 역산 배치 확인을 건너뛰게 된다.
 */
export default function ViewTabs({
  onSelect,
  todayCount,
}: {
  onSelect: (v: ViewKey) => void;
  /** 오늘 탭에 붙는 배지. 헤더에 따로 칩을 두면 0일 때 사라져 버린다 */
  todayCount: number;
}) {
  const view = useUiStore((s) => s.view);

  return (
    <nav
      className="no-scrollbar flex shrink-0 items-center gap-1 overflow-x-auto"
      aria-label="보기 방식"
    >
      {VIEWS.map((v) => {
        const active = view === v.key;
        const showBadge = v.key === 'today' && todayCount > 0;

        return (
          <button
            key={v.key}
            type="button"
            aria-current={active ? 'page' : undefined}
            onClick={() => onSelect(v.key)}
            className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-medium transition-colors"
            style={{
              background: active ? 'var(--surface-hover)' : 'transparent',
              color: active ? 'var(--text)' : 'var(--text-muted)',
            }}
          >
            <Icon name={v.icon} size={15} />
            {v.label}
            {showBadge && (
              <span
                className="ml-0.5 rounded-full px-1.5 text-[11px] font-semibold"
                style={{
                  background: 'color-mix(in srgb, var(--status-progress) 20%, transparent)',
                  color: 'var(--status-progress)',
                }}
              >
                {todayCount}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
