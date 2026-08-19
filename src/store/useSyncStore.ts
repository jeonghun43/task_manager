'use client';

import { create } from 'zustand';
import type { RealtimeChannel, Session } from '@supabase/supabase-js';
import { mergeAppData } from '@/lib/merge';
import { getSupabase, isSyncConfigured } from '@/lib/supabase/client';
import { localAdapter } from '@/lib/storage/local';
import { SupabaseAdapter } from '@/lib/storage/supabase';
import { setStorageAdapter, useAppStore } from './useAppStore';
import { useToastStore } from './useToastStore';
import type { AppData } from '@/lib/types';

/**
 * 기기 간 동기화 (FR-16).
 *
 * 로그인하지 않으면 지금까지와 똑같이 localStorage 만 쓴다 — 동기화는 얹는 기능이지 전제가 아니다.
 * 로그인하면 저장소를 SupabaseAdapter 로 갈아끼우고, 그 순간 한 번 로컬과 서버를 합친 뒤
 * 그 뒤로는 서버를 진실로 삼는다.
 */

export type SyncState = 'off' | 'connecting' | 'synced' | 'error';

interface SyncStore {
  configured: boolean;
  state: SyncState;
  email: string | null;
  message: string | null;
  /** 앱 시작 시 한 번 — 기존 세션이 있으면 그대로 이어간다 */
  init: () => Promise<void>;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

let channel: RealtimeChannel | null = null;
let unsubscribeAuth: (() => void) | null = null;
let adapter: SupabaseAdapter | null = null;
let pullTimer: ReturnType<typeof setTimeout> | null = null;
/** 마지막으로 이 기기가 서버에 쓴 시각 — 자기 변경을 되받아 덮어쓰지 않기 위한 기준 */
let lastLocalWriteAt = 0;
/** 내 변경이 서버에 반영되고 이벤트로 되돌아오기까지 기다려 줄 시간 */
const QUIET_MS = 1000;

function localSnapshot(): AppData {
  const s = useAppStore.getState();
  return { version: 1, projects: s.projects, tasks: s.tasks };
}

export const useSyncStore = create<SyncStore>((set) => ({
  configured: isSyncConfigured(),
  state: 'off',
  email: null,
  message: null,

  init: async () => {
    const db = getSupabase();
    if (!db) return;

    const { data } = await db.auth.getSession();
    if (data.session) await attach(data.session, set);

    // 로그인/로그아웃/토큰 갱신을 한 곳에서 받는다
    const { data: sub } = db.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) void attach(session, set);
      if (event === 'SIGNED_OUT') void detach(set);
    });
    unsubscribeAuth = () => sub.subscription.unsubscribe();
  },

  signIn: async () => {
    const db = getSupabase();
    if (!db) return;
    set({ state: 'connecting', message: null });
    const { error } = await db.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) set({ state: 'error', message: error.message });
  },

  signOut: async () => {
    const db = getSupabase();
    if (!db) return;
    await db.auth.signOut();
    void detach(set);
  },
}));

/* ------------------------------------------------------------------ */

type SetState = (partial: Partial<SyncStore>) => void;

async function attach(session: Session, set: SetState) {
  const db = getSupabase();
  if (!db) return;

  set({ state: 'connecting', email: session.user.email ?? null, message: null });

  try {
    adapter = new SupabaseAdapter(db, session.user.id, () => {
      lastLocalWriteAt = Date.now();
    });
    const server = await adapter.load();
    const local = localSnapshot();
    const localIsSample = useAppStore.getState().isSample;

    /*
     * 로그인 순간 딱 한 번의 병합.
     *
     *  · 이 기기의 데이터가 아직 손대지 않은 **샘플이면 올리지 않고 버린다** (FR-17).
     *    샘플은 구조를 설명하려고 우리가 만들어 보여준 것이지 사용자의 일정이 아니다.
     *    이 구분이 없으면 새 기기에서 로그인할 때마다 샘플 한 벌이 계정에 더 쌓인다.
     *  · 실제 데이터라면, 서버가 비었을 때 그대로 올리고(첫 로그인에서 잃지 않는다)
     *    양쪽에 있으면 항목별로 updatedAt 이 나중인 쪽이 남는다.
     */
    const merged: AppData = localIsSample
      ? (server ?? { version: 1, projects: [], tasks: [] })
      : server
        ? mergeAppData(local, server)
        : local;

    setStorageAdapter(adapter);
    useAppStore.getState().replaceAll(merged);

    // 로그인 결과로 화면의 일정이 바뀔 수 있다. 무슨 일이 있었는지 말해주지 않으면
    // "내 일정이 사라졌다" 로 읽힌다.
    useToastStore.getState().show(
      localIsSample
        ? server
          ? '계정에 저장된 일정을 불러왔어요'
          : '계정에 저장된 일정이 없어요. 여기서 새로 시작해요'
        : server
          ? '이 기기의 일정과 계정의 일정을 합쳤어요'
          : '이 기기의 일정을 계정에 올렸어요',
    );

    subscribeRealtime();
    set({ state: 'synced' });
  } catch (e) {
    // 동기화가 안 되더라도 앱은 계속 쓸 수 있어야 한다 — 로컬로 되돌린다
    setStorageAdapter(localAdapter);
    set({ state: 'error', message: e instanceof Error ? e.message : '동기화에 실패했어요' });
  }
}

async function detach(set: SetState) {
  channel?.unsubscribe();
  channel = null;
  adapter = null;
  if (pullTimer) clearTimeout(pullTimer);
  pullTimer = null;
  setStorageAdapter(localAdapter);
  // 로그아웃해도 화면의 데이터는 그대로 두고, 이 기기의 localStorage 에 남긴다.
  // 로그인 전으로 "되돌아가는" 것이지 데이터를 잃는 것이 아니다.
  await localAdapter.save(localSnapshot());
  set({ state: 'off', email: null, message: null });
}

/**
 * 다른 기기의 변경을 받아온다.
 *
 * 어떤 행이 바뀌었는지 따지지 않고 전체를 다시 읽는다. 개인용 규모(수백 행)에서는
 * 그게 더 싸고, 무엇보다 델타를 잘못 적용해 상태가 어긋날 여지가 없다.
 *
 * 다만 **내가 방금 쓴 변경도 이벤트로 되돌아온다.** 그때 곧바로 서버를 다시 읽어
 * 화면을 덮어쓰면, 연달아 입력하는 중에 방금 친 것이 사라져 보인다.
 * 그래서 이벤트가 오면 바로 읽지 않고, 이 기기의 쓰기가 잠잠해질 때까지 미룬다.
 */
function subscribeRealtime() {
  const db = getSupabase();
  if (!db) return;
  channel?.unsubscribe();

  channel = db
    .channel('sync')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, schedulePull)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, schedulePull)
    .subscribe();
}

function schedulePull() {
  if (pullTimer) clearTimeout(pullTimer);
  pullTimer = setTimeout(async () => {
    pullTimer = null;
    // 아직 내 쓰기가 이어지고 있으면 조금 더 기다린다
    if (Date.now() - lastLocalWriteAt < QUIET_MS) {
      schedulePull();
      return;
    }
    if (!adapter) return;
    try {
      const server = await adapter.load();
      // load() 가 어댑터의 기준 상태도 새로 맞춰 두므로, 이어지는 save 는 다시 델타만 보낸다
      useAppStore.getState().replaceAll(server ?? { version: 1, projects: [], tasks: [] });
    } catch {
      // 일시적인 네트워크 문제로 앱을 멈추지 않는다. 다음 이벤트나 재접속 때 다시 맞춘다.
    }
  }, 700);
}

/** 개발 중 HMR 로 리스너가 쌓이는 것을 막는다 */
export function teardownSync() {
  channel?.unsubscribe();
  channel = null;
  unsubscribeAuth?.();
  unsubscribeAuth = null;
}
