import type { AppData } from '../types';

/**
 * 영속화 경계 (헌법 III).
 * UI 컴포넌트는 물론 스토어 바깥의 어떤 코드도 localStorage 를 직접 만지지 않는다.
 * 향후 SupabaseAdapter 를 만들어 끼워 넣으면 UI 코드는 그대로 둘 수 있다.
 */
export interface StorageAdapter {
  readonly name: string;
  load(): Promise<AppData | null>;
  save(data: AppData): Promise<void>;
  clear(): Promise<void>;
}
