'use client';

import type { Progress } from '@/lib/derive';

export default function ProgressBar({ progress }: { progress: Progress }) {
  const { done, total, percent } = progress;
  return (
    <div className="w-full">
      <div className="mb-1 flex items-baseline justify-between text-[11px]">
        <span style={{ color: 'var(--text-faint)' }}>
          {total === 0 ? '할 일 없음' : `${done}/${total}`}
        </span>
        <span style={{ color: percent === 100 ? 'var(--status-done)' : 'var(--text-faint)' }}>
          {percent}%
        </span>
      </div>
      <div
        className="h-1 w-full overflow-hidden rounded-full"
        style={{ background: 'var(--border)' }}
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${percent}%`,
            background: percent === 100 ? 'var(--status-done)' : 'var(--pc, var(--accent))',
          }}
        />
      </div>
    </div>
  );
}
