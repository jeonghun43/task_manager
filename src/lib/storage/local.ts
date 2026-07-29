import { STORAGE_KEY_DATA } from '../constants';
import type { AppData } from '../types';
import type { StorageAdapter } from './adapter';

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

/** 저장된 값이 우리가 아는 스키마인지 최소한으로 검증한다. */
function normalize(raw: unknown): AppData | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Partial<AppData>;
  if (!Array.isArray(d.projects) || !Array.isArray(d.tasks)) return null;
  return { version: 1, projects: d.projects, tasks: d.tasks };
}

export class LocalStorageAdapter implements StorageAdapter {
  readonly name = 'local';

  async load(): Promise<AppData | null> {
    if (!isBrowser()) return null;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY_DATA);
      if (!raw) return null;
      return normalize(JSON.parse(raw));
    } catch {
      // 손상된 데이터로 앱이 죽지 않게 한다. null 이면 호출자가 초기 상태를 쓴다.
      return null;
    }
  }

  async save(data: AppData): Promise<void> {
    if (!isBrowser()) return;
    try {
      window.localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(data));
    } catch {
      // 용량 초과 등. 조용히 무시하되 앱 동작은 계속된다.
    }
  }

  async clear(): Promise<void> {
    if (!isBrowser()) return;
    try {
      window.localStorage.removeItem(STORAGE_KEY_DATA);
    } catch {
      /* noop */
    }
  }
}

export const localAdapter = new LocalStorageAdapter();
