/**
 * 도메인 모델 — spec.md §4, plan.md §3
 *
 * 핵심 규칙:
 *  - 계층은 정확히 2단계다. Project(큰 과업) → Task(작은 과업).
 *  - Task.priority === null 은 "소속 Project의 우선순위를 상속" 을 뜻한다.
 *    별도의 inherited 플래그를 두지 않는다 (두 필드가 어긋날 여지를 없애기 위함).
 *  - 마감일은 "YYYY-MM-DD" 로컬 날짜 문자열이다. Date/ISO 로 저장하지 않는다.
 */

export type Status = 'todo' | 'in_progress' | 'done';

export type Priority = 'high' | 'medium' | 'low';

/** "YYYY-MM-DD" 형식의 로컬 날짜. 타임존 변환 대상이 아니다. */
export type DateStr = string;

export type ProjectColor =
  | 'blue'
  | 'violet'
  | 'pink'
  | 'red'
  | 'orange'
  | 'amber'
  | 'green'
  | 'teal';

/** 큰 과업 */
export interface Project {
  id: string;
  title: string;
  description?: string;
  /** 수동 지정. 하위 완료율에 따라 자동 전환되지 않는다. */
  status: Status;
  priority: Priority;
  dueDate?: DateStr;
  color: ProjectColor;
  order: number;
  createdAt: string;
  updatedAt: string;
}

/** 작은 과업 */
export interface Task {
  id: string;
  projectId: string;
  title: string;
  notes?: string;
  status: Status;
  dueDate?: DateStr;
  /** null = 소속 큰 과업에서 상속 */
  priority: Priority | null;
  order: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

/** 영속화 단위 */
export interface AppData {
  /** 스키마 버전 — 향후 마이그레이션 대비 (NFR-3) */
  version: 1;
  /**
   * 첫 실행에 우리가 만들어 보여준 샘플이며 **사용자가 아직 손대지 않았다** 는 표시 (FR-17).
   *
   * 사용자가 무엇이든 바꾸는 순간 사라진다. 이 구분이 없으면 새 기기에서 로그인할 때
   * 그 기기의 샘플이 "이 기기의 데이터" 로 취급되어 계정에 올라간다.
   */
  sample?: boolean;
  projects: Project[];
  tasks: Task[];
}

export const EMPTY_DATA: AppData = { version: 1, projects: [], tasks: [] };

/** 화면 전환 단위 */
export type ViewKey = 'today' | 'project' | 'status' | 'deadline' | 'calendar';

export type ThemeMode = 'dark' | 'light';
