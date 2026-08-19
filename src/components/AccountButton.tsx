'use client';

import { useSyncStore } from '@/store/useSyncStore';
import Icon from './ui/Icon';
import Menu, { type MenuItem } from './ui/Menu';

/**
 * 계정과 동기화 상태 (FR-18).
 *
 * 예전에는 로그인이 `설정 및 데이터` 서랍 안에 들어 있었다. 두 가지가 잘못이었다.
 *
 *  1. **발견성** — 새 기기에서 가장 먼저 해야 할 일인데 메뉴를 열고 목록을 훑어야 찾았다.
 *  2. **상태** — "지금 동기화되고 있나" 는 상시로 보여야 하는 정보다.
 *     열어봐야만 알 수 있다면 그건 상태 표시가 아니라 숨긴 것이다.
 *
 * 그래서 로그아웃 상태에서는 **아이콘이 아니라 글자**로 둔다.
 * 아이콘만 두면 "무슨 뜻인지 몰라 안 누른다" 는 같은 문제를 되풀이할 뿐이다.
 */
export default function AccountButton() {
  const configured = useSyncStore((s) => s.configured);
  const state = useSyncStore((s) => s.state);
  const email = useSyncStore((s) => s.email);
  const message = useSyncStore((s) => s.message);
  const signIn = useSyncStore((s) => s.signIn);
  const signOut = useSyncStore((s) => s.signOut);

  // 동기화를 설정하지 않은 배포에서는 계정이라는 개념 자체가 없다
  if (!configured) return null;

  if (state !== 'synced') {
    const connecting = state === 'connecting';
    const failed = state === 'error';
    return (
      <button
        type="button"
        onClick={() => void signIn()}
        disabled={connecting}
        title={
          failed
            ? `동기화에 실패했어요: ${message ?? '알 수 없는 오류'} — 눌러서 다시 시도`
            : '구글 계정으로 로그인하면 다른 기기에서도 같은 일정이 보여요'
        }
        className="tap-44 flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[12.5px] font-medium transition-colors"
        style={{
          border: '1px solid var(--border-strong)',
          // 실패는 조용히 지나가면 안 된다 — 그 기기의 변경이 서버에 가지 않는 상태다
          color: failed ? 'var(--p-red)' : 'var(--text-muted)',
          borderColor: failed ? 'var(--p-red)' : 'var(--border-strong)',
        }}
      >
        {/* 폭이 빠듯한 모바일에서는 아이콘을 접고 글자를 남긴다 — 뜻을 지니는 쪽은 글자다 */}
        <span className="hidden sm:inline-flex">
          <Icon name={failed ? 'cloud-off' : 'cloud'} size={14} />
        </span>
        {connecting ? '연결 중…' : failed ? '동기화 실패' : '로그인'}
      </button>
    );
  }

  const items: MenuItem[] = [
    { kind: 'header', label: email ?? '로그인됨' },
    {
      kind: 'item',
      label: '기기 간 동기화 중',
      icon: <Icon name="cloud" size={14} />,
      onSelect: () => {},
    },
    { kind: 'divider' },
    {
      kind: 'item',
      label: '로그아웃',
      icon: <Icon name="cloud-off" size={14} />,
      onSelect: () => void signOut(),
    },
  ];

  return (
    <Menu
      items={items}
      label={`계정 ${email ?? ''}`}
      trigger={
        <span
          className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold uppercase"
          style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
        >
          {email ? email[0] : <Icon name="user" size={13} />}
        </span>
      }
    />
  );
}
