'use client';

import { useToastStore } from '@/store/useToastStore';
import Icon from './ui/Icon';

/** 화면 하단에 쌓이는 되돌리기 토스트 */
export default function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4"
      role="status"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pop-in pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-xl border px-4 py-2.5"
          style={{
            background: 'var(--bg-elevated)',
            borderColor: 'var(--border)',
            boxShadow: 'var(--shadow)',
          }}
        >
          <span className="min-w-0 flex-1 truncate text-[13px]">{t.message}</span>

          {t.action && (
            <button
              type="button"
              onClick={() => {
                t.action?.run();
                dismiss(t.id);
              }}
              className="tap-44 flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium"
              style={{
                background: 'color-mix(in srgb, var(--accent) 16%, transparent)',
                color: 'var(--accent)',
              }}
            >
              {t.action.label}
              <Icon name="arrow-right" size={14} />
            </button>
          )}

          {t.undo && (
            <button
              type="button"
              onClick={() => {
                t.undo?.();
                dismiss(t.id);
              }}
              className="tap-44 flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium"
              style={{
                background: 'color-mix(in srgb, var(--accent) 16%, transparent)',
                color: 'var(--accent)',
              }}
            >
              <Icon name="undo" size={14} />
              실행 취소
            </button>
          )}

          <button
            type="button"
            aria-label="알림 닫기"
            onClick={() => dismiss(t.id)}
            className="tap-44 flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
            style={{ color: 'var(--text-faint)' }}
          >
            <Icon name="close" size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
