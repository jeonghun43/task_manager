'use client';

import { create } from 'zustand';
import type { RealtimeChannel, Session } from '@supabase/supabase-js';
import { mergeAppData } from '@/lib/merge';
import { getSupabase, isSyncConfigured } from '@/lib/supabase/client';
import { localAdapter } from '@/lib/storage/local';
import { SupabaseAdapter } from '@/lib/storage/supabase';
import type { StorageAdapter } from '@/lib/storage/adapter';
import { setStorageAdapter, useAppStore } from './useAppStore';
import { useToastStore } from './useToastStore';
import type { AppData } from '@/lib/types';

/**
 * 기기 간 동기화 (FR-16).
 *
 * 로그인하지 않으면 지금까지와 똑같이 localStorage 만 쓴다 — 동기화는 얹는 기능이지 전제가 아니다.
 * 로그인하면 저장소를 서버로 갈아끼운다.
 */

export type SyncState =
  | 'off'
  /** 로그인은 됐지만 이 기기 데이터를 올릴지 사용자에게 묻는 중 (FR-21) */
  | 'asking'
  /** 사용자가 "나중에" 를 골라 동기화를 미뤄둔 상태 */
  | 'paused'
  | 'connecting'
  | 'synced'
  | 'error';

interface SyncStore {
  configured: boolean;
  state: SyncState;
  email: string | null;
  message: string | null;
  /** 묻는 화면에 보여줄 이 기기의 데이터 규모 */
  localCounts: { projects: number; tasks: number };
  init: () => Promise<void>;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  /** "이 기기 것도 올리기" — 로컬과 계정을 합친 뒤 동기화 시작 */
  uploadAndSync: () => Promise<void>;
  /** "나중에" — 정리할 시간을 준다. 아무것도 올리지도 내려받지도 않는다 */
  postpone: () => void;
}

let channel: RealtimeChannel | null = null;
let unsubscribeAuth: (() => void) | null = null;
let adapter: StorageAdapter | null = null;
let pullTimer: ReturnType<typeof setTimeout> | null = null;
/** 로그인은 됐지만 아직 붙이지 않은 세션 (사용자에게 묻는 중) */
let heldSession: Session | null = null;
/** 이미 붙인 사용자 — SIGNED_IN 이 중복으로 와도 다시 붙지 않게 한다 */
let attachedUserId: string | null = null;
let lastLocalWriteAt = 0;
const QUIET_MS = 1000;

/**
 * "이 페이지에서 로그인을 시작했다" 는 표시.
 * OAuth 는 페이지를 떠났다 돌아오므로 메모리로는 이어지지 않는다. 탭 단위 저장소에 남긴다.
 */
const SIGNIN_INTENT_KEY = 'vtm.signin-intent';

function markSignInIntent() {
  try {
    sessionStorage.setItem(SIGNIN_INTENT_KEY, '1');
  } catch {
    /* 저장이 막혀 있으면 묻는 단계를 건너뛸 뿐, 앱은 계속 동작한다 */
  }
}

/** 표시가 있으면 지우고 true — 한 번만 쓰인다 */
function consumeSignInIntent(): boolean {
  try {
    if (sessionStorage.getItem(SIGNIN_INTENT_KEY) === null) return false;
    sessionStorage.removeItem(SIGNIN_INTENT_KEY);
    return true;
  } catch {
    return false;
  }
}

function localSnapshot(): AppData {
  const s = useAppStore.getState();
  return { version: 1, projects: s.projects, tasks: s.tasks };
}

/**
 * 서버에 쓰면서 **localStorage 에도 같은 내용을 남기는** 어댑터 (FR-21.4).
 *
 * 이것이 없으면 로그인한 뒤로 localStorage 가 로그인 시점에 멈춘다.
 * 그 상태로 앱을 다시 열면 `hydrate()` 가 낡은 사본을 읽어 오고,
 * 서버에서 지운 항목이 화면에 되살아난다 — "삭제가 동기화되지 않는" 것처럼 보이던 원인이다.
 * 겸사겸사 오프라인에서 첫 화면을 그릴 때 쓸 캐시가 된다.
 */
class MirroredAdapter implements StorageAdapter {
  readonly name = 'supabase+local';
  constructor(private readonly remote: SupabaseAdapter) {}

  load() {
    return this.remote.load();
  }

  async save(data: AppData) {
    await this.remote.save(data);
    // 서버에 성공적으로 반영된 것만 캐시에 남긴다
    await localAdapter.save(data);
  }

  async clear() {
    await this.remote.clear();
    await localAdapter.clear();
  }
}

export const useSyncStore = create<SyncStore>((set) => ({
  configured: isSyncConfigured(),
  state: 'off',
  email: null,
  message: null,
  localCounts: { projects: 0, tasks: 0 },

  init: async () => {
    const db = getSupabase();
    if (!db) return;

    const { data } = await db.auth.getSession();
    if (data.session) {
      /*
       * 방금 로그인하고 돌아온 것인지, 그냥 앱을 다시 연 것인지 갈라야 한다.
       *
       * 구글에서 돌아온 직후에는 `detectSessionInUrl` 이 이미 세션을 만들어 두는 일이 잦아서,
       * getSession() 이 곧바로 세션을 돌려준다. 그걸 "다시 연 것" 으로 처리해 버리면
       * **묻지도 않고 서버 데이터로 갈아치워** 이 기기의 일정이 조용히 사라진 것처럼 보인다.
       * 그래서 로그인 버튼을 누른 시점에 남겨둔 표시로 판별한다 (URL 형태에 기대지 않는다).
       */
      if (consumeSignInIntent()) await beginSignIn(data.session, set);
      /*
       * 앱을 다시 연 경우 — **묻지 않고 서버를 그대로 따른다.**
       * 이미 한 번 합치기로 결정한 계정이고, 이 시점의 로컬 사본은 캐시일 뿐이다.
       * 캐시를 다시 합치면 서버에서 지운 항목이 되살아난다.
       */
      else await attach(data.session, set, 'restore');
    }

    const { data: sub } = db.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        if (attachedUserId === session.user.id) return; // 중복 이벤트
        if (heldSession) return; // 이미 묻는 중
        consumeSignInIntent();
        void beginSignIn(session, set);
      }
      if (event === 'SIGNED_OUT') void detach(set);
    });
    unsubscribeAuth = () => sub.subscription.unsubscribe();
  },

  signIn: async () => {
    const db = getSupabase();
    if (!db) return;
    set({ state: 'connecting', message: null });
    markSignInIntent();
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

  uploadAndSync: async () => {
    if (!heldSession) return;
    const s = heldSession;
    heldSession = null;
    await attach(s, set, 'adopt');
  },

  postpone: () => {
    // 붙이지 않는다. 로컬 데이터도 화면도 그대로 두고 사용자가 정리할 시간을 준다.
    set({ state: 'paused' });
  },
}));

/* ------------------------------------------------------------------ */

type SetState = (partial: Partial<SyncStore>) => void;

/** 방금 로그인했다. 이 기기에 데이터가 있으면 올릴지 먼저 묻는다 (FR-21). */
async function beginSignIn(session: Session, set: SetState) {
  const local = localSnapshot();
  const hasLocal = local.projects.length > 0 || local.tasks.length > 0;

  if (!hasLocal) {
    await attach(session, set, 'restore');
    return;
  }

  heldSession = session;
  set({
    state: 'asking',
    email: session.user.email ?? null,
    localCounts: { projects: local.projects.length, tasks: local.tasks.length },
  });
}

/**
 * 저장소를 서버로 갈아끼운다.
 *
 * `restore` — 서버가 진실이다. 앱을 다시 열었거나, 이 기기에 올릴 것이 없을 때.
 * `adopt`  — 이 기기의 데이터를 계정에 합친다. 사용자가 그러겠다고 고른 경우에만.
 *
 * 합치기를 **로그인하는 순간으로 한정**하는 이유: 병합은 삭제를 표현할 수 없다.
 * 사라진 항목과 아직 안 온 항목을 구분할 방법이 없어서, 앱을 열 때마다 합치면
 * 서버에서 지운 것이 로컬 사본을 통해 계속 되살아난다.
 */
async function attach(session: Session, set: SetState, mode: 'restore' | 'adopt') {
  const db = getSupabase();
  if (!db) return;

  set({ state: 'connecting', email: session.user.email ?? null, message: null });

  try {
    const remote = new SupabaseAdapter(db, session.user.id, () => {
      lastLocalWriteAt = Date.now();
    });
    adapter = new MirroredAdapter(remote);

    const server = await remote.load();
    const local = localSnapshot();
    const localHasData = local.projects.length > 0 || local.tasks.length > 0;

    const next: AppData =
      mode === 'adopt'
        ? server
          ? mergeAppData(local, server)
          : local
        : (server ?? { version: 1, projects: [], tasks: [] });

    setStorageAdapter(adapter);
    useAppStore.getState().replaceAll(next);
    attachedUserId = session.user.id;

    if (mode === 'adopt') {
      useToastStore
        .getState()
        .show(server ? '이 기기의 일정을 계정과 합쳤어요' : '이 기기의 일정을 계정에 올렸어요');
    } else if (localHasData && !server) {
      useToastStore.getState().show('계정에 저장된 일정이 없어요');
    }

    subscribeRealtime();
    set({ state: 'synced' });
  } catch (e) {
    // 동기화가 안 되더라도 앱은 계속 쓸 수 있어야 한다 — 로컬로 되돌린다
    adapter = null;
    setStorageAdapter(localAdapter);
    set({ state: 'error', message: e instanceof Error ? e.message : '동기화에 실패했어요' });
  }
}

async function detach(set: SetState) {
  channel?.unsubscribe();
  channel = null;
  adapter = null;
  attachedUserId = null;
  heldSession = null;
  if (pullTimer) clearTimeout(pullTimer);
  pullTimer = null;
  setStorageAdapter(localAdapter);
  // 로그아웃해도 화면의 데이터는 그대로 두고, 이 기기의 localStorage 에 남긴다.
  await localAdapter.save(localSnapshot());
  set({ state: 'off', email: null, message: null });
}

/**
 * 다른 기기의 변경을 받아온다.
 *
 * 어떤 행이 바뀌었는지 따지지 않고 전체를 다시 읽는다. 개인용 규모(수백 행)에서는
 * 그게 더 싸고, 델타를 잘못 적용해 상태가 어긋날 여지가 없다.
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
