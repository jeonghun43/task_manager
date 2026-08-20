'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * 트리거 옆에 떠 있는 레이어 (메뉴 · 팝오버).
 *
 * 카드 안에 `absolute` 로 띄우면 **컬럼의 `overflow-y-auto` 에 잘린다.**
 * 과업별 뷰의 카드 목록이 스크롤 영역이라, 카드 아래쪽에서 연 팝오버가 통째로 잘려 보였다.
 * 그래서 `document.body` 로 옮겨 `position: fixed` 로 그린다 — 조상의 overflow 와 무관해진다.
 *
 * 대신 두 가지를 직접 책임져야 한다.
 *  · **위치**: 트리거의 화면 좌표를 재서 붙인다. 아래 공간이 부족하면 위로 뒤집고,
 *    좌우로 넘치면 화면 안으로 밀어 넣는다.
 *  · **따라다니기**: 스크롤·리사이즈에 다시 계산한다. 캡처 단계로 들으면
 *    컬럼처럼 안쪽에서 스크롤되는 요소의 이동도 잡힌다.
 */
export default function FloatingLayer({
  anchorRef,
  open,
  onClose,
  align = 'left',
  width,
  children,
}: {
  anchorRef: React.RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  /** 트리거의 어느 모서리에 맞출지 */
  align?: 'left' | 'right';
  /** 레이어 폭(px). 없으면 내용에 맡긴다 */
  width?: number;
  children: React.ReactNode;
}) {
  const layerRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    // 닫혀 있으면 아무것도 하지 않는다. 위치를 굳이 비우지 않는 것은,
    // 다시 열릴 때 place() 가 페인트 전에 새 좌표로 덮어쓰기 때문이다.
    if (!open) return;

    const place = () => {
      const a = anchorRef.current;
      if (!a) return;
      const r = a.getBoundingClientRect();
      const w = width ?? layerRef.current?.offsetWidth ?? 224;
      const h = layerRef.current?.offsetHeight ?? 0;
      const gap = 4;
      const margin = 8;

      // 아래가 좁으면 위로 뒤집는다 (카드가 목록 맨 아래에 있을 때가 그렇다)
      const belowRoom = window.innerHeight - r.bottom;
      const flipUp = h > 0 && belowRoom < h + gap + margin && r.top > belowRoom;
      let top = flipUp ? r.top - h - gap : r.bottom + gap;
      top = Math.max(margin, Math.min(top, window.innerHeight - h - margin));

      let left = align === 'right' ? r.right - w : r.left;
      left = Math.max(margin, Math.min(left, window.innerWidth - w - margin));

      setPos({ top, left });
    };

    place();
    // 레이어 높이는 그린 뒤에야 알 수 있으므로 한 번 더 맞춘다
    const raf = requestAnimationFrame(place);

    // 캡처 단계 — 안쪽 스크롤 컨테이너의 스크롤까지 잡는다
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open, anchorRef, align, width]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (anchorRef.current?.contains(t) || layerRef.current?.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, anchorRef]);

  // 레이어는 사용자가 연 뒤에만 존재하므로 서버 렌더링 시점에는 이 지점에 오지 않는다.
  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={layerRef}
      className="pop-in fixed z-50"
      style={{
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        width,
        // 자리를 잡기 전 한 프레임 동안 엉뚱한 곳에 번쩍이지 않게 한다
        visibility: pos ? 'visible' : 'hidden',
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
