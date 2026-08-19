'use client';

/**
 * 하나의 아이콘 언어.
 *
 * 이전에는 이모지(📅 🔥 ⏳ 💤 🚩)와 기하 문자(⚟ ⤺ ⇅ ⋯)가 뒤섞여 있었다.
 * 이모지는 OS마다 모양이 달라 통제할 수 없고, ⚟ 같은 문자는 어디에도
 * "필터"라는 관습이 없다. 전부 같은 규격의 선 아이콘으로 통일한다.
 *
 * 규격: 16×16 viewBox, stroke 1.6, currentColor, 채우기 없음.
 */

export type IconName =
  | 'search'
  | 'filter'
  | 'settings'
  | 'plus'
  | 'more-vertical'
  | 'calendar'
  | 'flag'
  | 'trash'
  | 'pencil'
  | 'check'
  | 'close'
  | 'chevron-left'
  | 'chevron-right'
  | 'chevron-up'
  | 'chevron-down'
  | 'dash'
  | 'sun'
  | 'moon'
  | 'download'
  | 'upload'
  | 'sparkle'
  | 'rewind'
  | 'link'
  | 'undo'
  | 'arrow-left'
  | 'arrow-right'
  | 'board'
  | 'columns'
  | 'list'
  | 'sun-today'
  | 'grip'
  | 'user'
  | 'cloud'
  | 'cloud-off'
  | 'reset';

const PATHS: Record<IconName, React.ReactNode> = {
  search: (
    <>
      <circle cx="7.2" cy="7.2" r="4.4" />
      <path d="M10.5 10.5 13.5 13.5" />
    </>
  ),
  filter: <path d="M2.5 3.5h11l-4.2 5v4.2l-2.6 1.3V8.5z" />,
  /*
   * 톱니바퀴. 예전 아이콘은 원 + 8방향 방사선이라 바로 아래 `sun` 과 같은 그림이었고,
   * 실제로 "해 모양" 으로 읽혔다. 둘을 가르는 것은 **바깥 링**이다 —
   * 해는 살이 공중에 떠 있고, 톱니는 링에 붙어 있다.
   */
  settings: (
    <>
      <circle cx="8" cy="8" r="2.2" />
      <circle cx="8" cy="8" r="5.2" />
      <path d="M8 2.8V1.5M8 13.2v1.3M13.2 8h1.3M2.8 8H1.5M11.68 4.32l.92-.92M4.32 11.68l-.92.92M11.68 11.68l.92.92M4.32 4.32l-.92-.92" />
    </>
  ),
  plus: <path d="M8 3.2v9.6M3.2 8h9.6" />,
  'more-vertical': (
    <>
      <circle cx="8" cy="3.4" r="1.05" />
      <circle cx="8" cy="8" r="1.05" />
      <circle cx="8" cy="12.6" r="1.05" />
    </>
  ),
  calendar: (
    <>
      <rect x="2.4" y="3.4" width="11.2" height="10.2" rx="1.6" />
      <path d="M2.4 6.6h11.2M5.6 2.2v2.2M10.4 2.2v2.2" />
    </>
  ),
  flag: <path d="M3.8 14V2.6h8L10 5.6l1.8 3H3.8" />,
  trash: (
    <>
      <path d="M2.8 4.4h10.4M6.2 4.4V2.8h3.6v1.6" />
      <path d="M4.2 4.4l.7 8.4a.9.9 0 0 0 .9.8h4.4a.9.9 0 0 0 .9-.8l.7-8.4" />
    </>
  ),
  pencil: (
    <>
      <path d="M11.2 2.6 13.4 4.8 5.6 12.6 2.6 13.4l.8-3z" />
    </>
  ),
  check: <path d="M3 8.4 6.4 11.8 13 5.2" />,
  close: <path d="M3.8 3.8l8.4 8.4M12.2 3.8l-8.4 8.4" />,
  'chevron-left': <path d="M10 3.2 5.2 8l4.8 4.8" />,
  'chevron-right': <path d="M6 3.2 10.8 8 6 12.8" />,
  'chevron-up': <path d="M3.2 10 8 5.2 12.8 10" />,
  'chevron-down': <path d="M3.2 6 8 10.8 12.8 6" />,
  dash: <path d="M3.6 8h8.8" />,
  sun: (
    <>
      <circle cx="8" cy="8" r="3" />
      <path d="M8 1.4v1.4M8 13.2v1.4M14.6 8h-1.4M2.8 8H1.4M12.7 3.3l-1 1M4.3 11.7l-1 1M12.7 12.7l-1-1M4.3 4.3l-1-1" />
    </>
  ),
  moon: <path d="M13 9.4A5.6 5.6 0 0 1 6.6 3a5.6 5.6 0 1 0 6.4 6.4z" />,
  download: <path d="M8 2.6v7.6M4.8 7.4 8 10.6l3.2-3.2M3 13.2h10" />,
  upload: <path d="M8 10.6V3M4.8 6.2 8 3l3.2 3.2M3 13.2h10" />,
  sparkle: <path d="M8 2.2 9.3 6.2 13.4 7.5 9.3 8.8 8 12.8 6.7 8.8 2.6 7.5 6.7 6.2z" />,
  /** 역산 배치 — 마감일에서 거꾸로 되감는다 */
  rewind: (
    <>
      <path d="M13.4 12.2a5.4 5.4 0 1 0-4.6-8.2" />
      <path d="M8.8 1.2 8.8 4.2 11.8 4.2" />
    </>
  ),
  /** 우선순위 상속 — 큰 과업에 매여 있다 */
  link: (
    <>
      <path d="M6.6 9.4a2.6 2.6 0 0 0 3.9.3l1.9-1.9a2.6 2.6 0 1 0-3.7-3.7l-1.1 1" />
      <path d="M9.4 6.6a2.6 2.6 0 0 0-3.9-.3L3.6 8.2a2.6 2.6 0 1 0 3.7 3.7l1.1-1" />
    </>
  ),
  undo: (
    <>
      <path d="M3 7.2h6.8a3.4 3.4 0 0 1 0 6.8H6" />
      <path d="M5.6 4.2 2.6 7.2l3 3" />
    </>
  ),
  'arrow-left': <path d="M12.4 8H3.6M7 4.6 3.6 8 7 11.4" />,
  'arrow-right': <path d="M3.6 8h8.8M9 4.6 12.4 8 9 11.4" />,
  /** 과업별 보드 */
  board: (
    <>
      <rect x="2.2" y="3" width="4.2" height="10" rx="1.2" />
      <rect x="9.6" y="3" width="4.2" height="6.6" rx="1.2" />
    </>
  ),
  /** 상태 칸반 */
  columns: (
    <>
      <rect x="2.2" y="3.4" width="3.2" height="9.2" rx="1" />
      <rect x="6.4" y="3.4" width="3.2" height="9.2" rx="1" />
      <rect x="10.6" y="3.4" width="3.2" height="9.2" rx="1" />
    </>
  ),
  /** 마감기한 목록 */
  list: <path d="M5.4 4.2h8.4M5.4 8h8.4M5.4 11.8h8.4M2.4 4.2h.02M2.4 8h.02M2.4 11.8h.02" />,
  /** 오늘 */
  'sun-today': (
    <>
      <circle cx="8" cy="8" r="2.6" />
      <path d="M8 1.6v1.2M8 13.2v1.2M14.4 8h-1.2M2.8 8H1.6M12.5 3.5l-.85.85M4.35 11.65l-.85.85M12.5 12.5l-.85-.85M4.35 4.35l-.85-.85" />
    </>
  ),
  reset: (
    <>
      <path d="M2.8 8a5.2 5.2 0 1 0 1.6-3.8" />
      <path d="M2.2 2.6v3.2h3.2" />
    </>
  ),
  user: (
    <>
      <circle cx="8" cy="5.6" r="2.6" />
      <path d="M2.9 13.6a5.1 5.1 0 0 1 10.2 0" />
    </>
  ),
  cloud: <path d="M4.6 12.4a2.9 2.9 0 0 1 .3-5.78 3.9 3.9 0 0 1 7.4.6 2.6 2.6 0 0 1-.5 5.18z" />,
  'cloud-off': (
    <>
      <path d="M4.6 12.4a2.9 2.9 0 0 1 .3-5.78 3.9 3.9 0 0 1 7.4.6 2.6 2.6 0 0 1-.5 5.18z" />
      <path d="M2.6 2.6 13.4 13.4" />
    </>
  ),
  // 잡아서 끌 수 있다는 신호. 세로 점 두 줄 (표준 grip)
  grip: (
    <>
      <circle cx="6" cy="4" r="0.95" />
      <circle cx="10" cy="4" r="0.95" />
      <circle cx="6" cy="8" r="0.95" />
      <circle cx="10" cy="8" r="0.95" />
      <circle cx="6" cy="12" r="0.95" />
      <circle cx="10" cy="12" r="0.95" />
    </>
  ),
};

interface Props {
  name: IconName;
  /** px. 기본 16 */
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export default function Icon({ name, size = 16, className, style }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ flexShrink: 0, ...style }}
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
