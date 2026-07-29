import type { DateStr } from './types';

/**
 * 날짜 유틸 — 마감일은 항상 "YYYY-MM-DD" 로컬 날짜 문자열이다.
 * toISOString() 을 마감일 계산에 쓰지 않는다 (UTC 변환으로 하루가 밀린다).
 */

const pad = (n: number) => String(n).padStart(2, '0');

/** Date → "YYYY-MM-DD" (로컬 기준) */
export function toDateStr(d: Date): DateStr {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "YYYY-MM-DD" → 로컬 자정 Date */
export function parseDateStr(s: DateStr): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function todayStr(): DateStr {
  return toDateStr(new Date());
}

export function isValidDateStr(s: unknown): s is DateStr {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

/** a - b 를 일수로. 음수면 a가 과거. */
export function diffDays(a: DateStr, b: DateStr): number {
  const ms = parseDateStr(a).getTime() - parseDateStr(b).getTime();
  return Math.round(ms / 86_400_000);
}

/** 오늘 기준 남은 일수 */
export function daysFromToday(s: DateStr): number {
  return diffDays(s, todayStr());
}

export function addDays(s: DateStr, n: number): DateStr {
  const d = parseDateStr(s);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

export function addMonths(s: DateStr, n: number): DateStr {
  const d = parseDateStr(s);
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  return toDateStr(d);
}

/** "2025년 5월 23일" */
export function formatKorean(s: DateStr): string {
  const d = parseDateStr(s);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

/** "5월 23일" */
export function formatKoreanShort(s: DateStr): string {
  const d = parseDateStr(s);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토'];

export function weekdayKo(s: DateStr): string {
  return WEEKDAY_KO[parseDateStr(s).getDay()];
}

/** 마감일 사람이 읽는 표현: "3일 지남", "오늘", "내일", "5월 23일" */
export function humanDue(s: DateStr): string {
  const n = daysFromToday(s);
  if (n < 0) return `${-n}일 지남`;
  if (n === 0) return '오늘';
  if (n === 1) return '내일';
  if (n <= 7) return `${n}일 뒤`;
  return formatKoreanShort(s);
}

/** 월 표기 "2026년 7월" */
export function formatMonth(s: DateStr): string {
  const d = parseDateStr(s);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
}

/**
 * 달력 그리드 6주(42칸)를 만든다. 일요일 시작.
 * 각 칸은 날짜 문자열과 해당 월 소속 여부를 갖는다.
 */
export function monthMatrix(anchor: DateStr): { date: DateStr; inMonth: boolean }[] {
  const a = parseDateStr(anchor);
  const first = new Date(a.getFullYear(), a.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());

  const cells: { date: DateStr; inMonth: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push({ date: toDateStr(d), inMonth: d.getMonth() === a.getMonth() });
  }
  return cells;
}
