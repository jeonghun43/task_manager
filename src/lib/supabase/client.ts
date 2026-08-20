'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase 클라이언트 (기기 간 동기화용).
 *
 * 환경변수가 없으면 `null` 을 돌려준다 — 그 경우 앱은 지금까지처럼 localStorage 만 쓰고
 * 로그인 메뉴도 나타나지 않는다. 즉 **동기화는 선택 기능이고, 설정하지 않아도 앱은 그대로 동작한다.**
 *
 * anon 키는 공개되어도 되는 값이다. 데이터를 지키는 것은 키가 아니라 RLS 정책이며
 * (supabase/schema.sql), 그래서 브라우저 번들에 들어가는 NEXT_PUBLIC_ 접두사를 쓴다.
 *
 * ## 로그인 유지 방식 (FR-22)
 *
 * **쿠키를 쓰지 않는다.** 서버가 없는 정적 클라이언트 앱이라 서버 세션이라는 개념이 없고,
 * supabase-js 가 리프레시 토큰을 `localStorage` 에 넣어 둔다 (키: `sb-<프로젝트ref>-auth-token`).
 * 브라우저를 껐다 켜도 그 값이 남아 있으면 로그인이 이어진다.
 *
 * 따라서 로그인이 풀리는 경우는 셋 중 하나다.
 *  1. 저장소가 지워졌다 (브라우저의 "종료 시 사이트 데이터 삭제" 설정 등)
 *  2. 다른 origin 에서 열었다 (localStorage 는 origin 단위다)
 *  3. 토큰은 남아 있는데 갱신에 실패했다 (부팅 직후 네트워크 미연결 등) — 이건 복구할 수 있다
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

export function isSyncConfigured(): boolean {
  return Boolean(url && anonKey);
}

export function getSupabase(): SupabaseClient | null {
  if (!url || !anonKey) return null;
  if (!client) {
    client = createClient(url, anonKey, {
      auth: {
        // 새로고침해도, 브라우저를 껐다 켜도 로그인이 유지된다 (localStorage 에 저장)
        persistSession: true,
        // 만료 전에 조용히 갱신한다
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}

/* ------------------------------------------------------------------ */
/* 세션 진단 — "왜 로그인이 풀렸나" 를 추측이 아니라 사실로 답하기 위한 것      */
/* ------------------------------------------------------------------ */

/** supabase-js 가 쓰는 저장소 키. 프로젝트 ref 에서 만들어진다. */
export function authStorageKey(): string | null {
  if (!url) return null;
  try {
    return `sb-${new URL(url).hostname.split('.')[0]}-auth-token`;
  } catch {
    return null;
  }
}

export interface StoredAuth {
  key: string | null;
  /** 저장소에 토큰이 남아 있는가 */
  present: boolean;
  /** 액세스 토큰 만료 시각 (없으면 알 수 없음) */
  expiresAt: Date | null;
  /** localStorage 에 쓸 수 있는가. 못 쓰면 supabase 는 메모리로 물러나고 탭을 닫는 순간 날아간다 */
  writable: boolean;
}

export function readStoredAuth(): StoredAuth {
  const key = authStorageKey();
  const result: StoredAuth = { key, present: false, expiresAt: null, writable: false };
  if (typeof window === 'undefined') return result;

  try {
    const probe = '__vtm_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    result.writable = true;
  } catch {
    result.writable = false;
  }

  if (!key) return result;
  try {
    // 세션이 크면 supabase 가 `키.0`, `키.1` 로 쪼개 저장한다
    const raw = window.localStorage.getItem(key) ?? window.localStorage.getItem(`${key}.0`);
    if (!raw) return result;
    result.present = true;

    const parsed = JSON.parse(raw) as { expires_at?: number };
    if (typeof parsed.expires_at === 'number') {
      result.expiresAt = new Date(parsed.expires_at * 1000);
    }
  } catch {
    // 쪼개져 있거나 형식이 달라 파싱에 실패해도, 값이 있다는 사실은 이미 담았다
  }
  return result;
}
