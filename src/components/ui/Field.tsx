'use client';

/**
 * background 단축 속성을 쓰면 안 된다.
 * 단축 속성은 background-repeat 등 하위 속성을 전부 초기값으로 되돌리는데,
 * 인라인 스타일이라 Tailwind 의 bg-no-repeat 클래스보다 우선한다.
 * 그러면 Select 의 화살표 아이콘이 타일링되어 지그재그 무늬가 된다.
 */
const inputStyle: React.CSSProperties = {
  backgroundColor: 'var(--surface)',
  borderColor: 'var(--border)',
  color: 'var(--text)',
};

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span
        className="mb-1.5 block text-[12px] font-medium"
        style={{ color: 'var(--text-muted)' }}
      >
        {label}
      </span>
      {children}
      {hint && (
        <span className="mt-1 block text-[11px]" style={{ color: 'var(--text-faint)' }}>
          {hint}
        </span>
      )}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--accent)] ${props.className ?? ''}`}
      style={{ ...inputStyle, ...props.style }}
    />
  );
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full resize-y rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--accent)] ${props.className ?? ''}`}
      style={{ ...inputStyle, ...props.style }}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full appearance-none rounded-lg border bg-no-repeat px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--accent)] ${props.className ?? ''}`}
      style={{
        ...inputStyle,
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1.5 6 6.5 11 1.5' fill='none' stroke='%239b9b9b' stroke-width='1.6' stroke-linecap='round'/%3E%3C/svg%3E\")",
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 10px center',
        paddingRight: '30px',
        ...props.style,
      }}
    />
  );
}

/** 마감일 입력 — 값은 항상 "YYYY-MM-DD" 문자열이다 */
export function DateInput({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (v: string | undefined) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <TextInput
        type="date"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || undefined)}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className="shrink-0 rounded-lg border px-2.5 py-2 text-xs transition-colors"
          style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
        >
          지우기
        </button>
      )}
    </div>
  );
}

export function Button({
  variant = 'ghost',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'danger';
}) {
  const style: React.CSSProperties =
    variant === 'primary'
      ? { background: 'var(--accent)', color: 'var(--accent-contrast)', borderColor: 'transparent' }
      : variant === 'danger'
        ? {
            background: 'color-mix(in srgb, var(--p-red) 14%, transparent)',
            color: 'var(--p-red)',
            borderColor: 'transparent',
          }
        : { background: 'transparent', color: 'var(--text-muted)', borderColor: 'var(--border)' };

  return (
    <button
      {...props}
      className={`rounded-lg border px-3.5 py-2 text-[13px] font-medium transition-opacity hover:opacity-85 disabled:opacity-45 ${props.className ?? ''}`}
      style={{ ...style, ...props.style }}
    />
  );
}
