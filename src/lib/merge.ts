import type { AppData, Project, Task } from './types';

/**
 * 두 벌의 데이터를 합친다 (기기 A와 기기 B, 또는 로컬과 서버).
 *
 * 규칙은 하나다: **같은 id 는 updatedAt 이 나중인 쪽이 이긴다.** 한쪽에만 있으면 그대로 살린다.
 * 항목 단위로 판정하므로, 폰에서 A를 체크하고 노트북에서 B를 고쳤다면 둘 다 남는다.
 * 통째로 덮어쓰는 방식이라면 둘 중 하나가 통째로 사라졌을 상황이다.
 *
 * 삭제는 여기서 표현할 수 없다(사라진 것과 아직 안 온 것을 구분할 방법이 없으므로).
 * 그래서 이 병합은 **로그인 직후 한 번**만 쓴다. 그 뒤로는 서버가 진실이고,
 * 삭제는 어댑터가 서버에 직접 반영한다.
 */
export function mergeAppData(a: AppData, b: AppData): AppData {
  const projects = mergeById(a.projects, b.projects);
  const ids = new Set(projects.map((p) => p.id));
  // 소속을 잃은 할 일은 어느 화면에도 나타날 수 없으므로 버린다
  const tasks = mergeById(a.tasks, b.tasks).filter((t) => ids.has(t.projectId));
  return { version: 1, projects, tasks };
}

function mergeById<T extends Project | Task>(a: T[], b: T[]): T[] {
  const m = new Map<string, T>();
  for (const item of a) m.set(item.id, item);
  for (const item of b) {
    const prev = m.get(item.id);
    if (!prev || item.updatedAt > prev.updatedAt) m.set(item.id, item);
  }
  return [...m.values()];
}
