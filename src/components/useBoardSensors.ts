'use client';

import {
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';

/**
 * 모바일에서 드래그와 스크롤이 충돌하지 않도록 활성화 조건을 둔다 (plan.md §9).
 * - 마우스: 6px 이동해야 드래그 시작
 * - 터치: 180ms 길게 눌러야 드래그 시작 (그 전엔 스크롤)
 * - 키보드: Space/Enter 로 잡고 방향키로 이동
 */
export function useBoardSensors() {
  return useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
}
