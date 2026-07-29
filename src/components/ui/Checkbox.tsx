'use client';

interface Props {
  checked: boolean;
  onChange: () => void;
  label: string;
  /** 진행 중 상태를 절반 채움으로 표현 */
  partial?: boolean;
}

/** 터치 타깃을 넉넉히 확보한 체크박스 (모바일 대응) */
export default function Checkbox({ checked, onChange, label, partial }: Props) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      className="tap-44 -m-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-md p-2 transition-colors"
    >
      <span
        className="flex h-[18px] w-[18px] items-center justify-center rounded-[5px] border-2 transition-all"
        style={{
          borderColor: checked
            ? 'var(--status-done)'
            : partial
              ? 'var(--status-progress)'
              : 'var(--border-strong)',
          background: checked ? 'var(--status-done)' : 'transparent',
        }}
      >
        {checked && (
          <svg viewBox="0 0 14 14" className="h-3 w-3" aria-hidden>
            <path
              d="M2 7.5 L5.5 11 L12 3.5"
              fill="none"
              stroke="#fff"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
        {!checked && partial && (
          <span
            className="h-[7px] w-[7px] rounded-[2px]"
            style={{ background: 'var(--status-progress)' }}
            aria-hidden
          />
        )}
      </span>
    </button>
  );
}
