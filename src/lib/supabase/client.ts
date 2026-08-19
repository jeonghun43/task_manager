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
        // 새로고침해도 로그인 상태가 유지되고, 만료 전에 조용히 갱신된다.
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}
