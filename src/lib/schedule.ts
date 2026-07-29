import { addDays, diffDays } from './date';
import type { DateStr } from './types';

/**
 * 역산 배치 (backward scheduling)
 *
 * 최종 목표의 마감일을 앵커로 두고, 오늘부터 마감일까지 남은 날에
 * 하위 과업을 "순서를 지키며" 고르게 흩뿌린다.
 * 마지막 항목은 항상 마감일에, 첫 항목은 오늘에 놓인다.
 *
 * 이 결과는 어디까지나 출발점 제안이다. 항목별 소요 시간은 제각각이므로
 * 호출부는 반드시 미리보기 → 사용자 조정 → 확정 순서를 거쳐야 한다.
 *
 * 주말도 작업일로 포함한다 (사용자 결정).
 */
export function backwardSchedule(
  deadline: DateStr,
  today: DateStr,
  orderedTaskIds: string[],
): Map<string, DateStr> {
  const result = new Map<string, DateStr>();
  const n = orderedTaskIds.length;
  if (n === 0) return result;

  // 오늘을 포함해 마감일까지 며칠 남았는가
  const span = diffDays(deadline, today) + 1;

  // 마감일이 오늘이거나 이미 지났으면 나눌 여지가 없다 — 전부 오늘로
  if (span <= 1) {
    for (const id of orderedTaskIds) result.set(id, today);
    return result;
  }

  // 항목이 하나면 마감일에 붙인다
  if (n === 1) {
    result.set(orderedTaskIds[0], deadline);
    return result;
  }

  // i번째 항목 → 오늘(0) ~ 마감일(span-1) 사이 균등 분할
  // 항목 수가 남은 날보다 많으면 반올림으로 자연스럽게 같은 날에 겹친다
  for (let i = 0; i < n; i++) {
    const dayIndex = Math.round((i * (span - 1)) / (n - 1));
    result.set(orderedTaskIds[i], addDays(today, dayIndex));
  }
  return result;
}

/** 오늘부터 마감일까지 남은 일수 (오늘 포함). 지났으면 음수 */
export function daysUntil(deadline: DateStr, today: DateStr): number {
  return diffDays(deadline, today);
}
