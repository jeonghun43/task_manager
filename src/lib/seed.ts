import { addDays, todayStr } from './date';
import { newId, nowIso } from './id';
import type { AppData, Priority, Project, ProjectColor, Status, Task } from './types';

/**
 * 첫 실행 샘플 데이터 (FR-6.3).
 * "큰 과업 → 작은 과업" 구조와 우선순위 상속을 한눈에 보여주는 것이 목적이다.
 * 날짜는 오늘 기준 상대값으로 만들어 언제 켜도 자연스럽게 보이게 한다.
 */
export function createSeedData(): AppData {
  const now = nowIso();
  const today = todayStr();

  const mkProject = (
    title: string,
    description: string,
    status: Status,
    priority: Priority,
    dueOffset: number | null,
    color: ProjectColor,
    order: number,
  ): Project => ({
    id: newId(),
    title,
    description,
    status,
    priority,
    dueDate: dueOffset === null ? undefined : addDays(today, dueOffset),
    color,
    order,
    createdAt: now,
    updatedAt: now,
  });

  const p1 = mkProject(
    '포트폴리오 사이트 만들기',
    '개인 작업물을 정리해 보여줄 웹사이트를 처음부터 끝까지 완성한다.',
    'in_progress',
    'high',
    14,
    'violet',
    0,
  );
  const p2 = mkProject(
    '3분기 마케팅 리포트',
    '지난 분기 성과를 정리하고 다음 분기 계획을 제안한다.',
    'todo',
    'medium',
    5,
    'blue',
    1,
  );
  const p3 = mkProject(
    '이사 준비',
    '9월 이사를 위해 처리해야 할 일들.',
    'todo',
    'low',
    null,
    'green',
    2,
  );

  let seq = 0;
  const mkTask = (
    project: Project,
    title: string,
    status: Status,
    dueOffset: number | null,
    priority: Priority | null,
    notes?: string,
  ): Task => ({
    id: newId(),
    projectId: project.id,
    title,
    notes,
    status,
    dueDate: dueOffset === null ? undefined : addDays(today, dueOffset),
    priority,
    order: seq++,
    createdAt: now,
    updatedAt: now,
    completedAt: status === 'done' ? now : undefined,
  });

  const tasks: Task[] = [
    mkTask(p1, '레퍼런스 사이트 5개 수집', 'done', -3, null),
    mkTask(p1, '와이어프레임 그리기', 'done', -1, null),
    mkTask(p1, '메인 페이지 퍼블리싱', 'in_progress', 2, null, '섹션 4개: 히어로 / 작업물 / 소개 / 연락'),
    mkTask(p1, '작업물 상세 페이지 6개 작성', 'todo', 7, null),
    mkTask(p1, '도메인 연결 및 배포', 'todo', 13, 'low', '배포 후 모바일에서 한 번 확인'),

    mkTask(p2, '지표 원본 데이터 내려받기', 'done', -2, null),
    mkTask(p2, '채널별 성과 표 정리', 'in_progress', 0, 'high', '오늘 안에 끝내야 다음 단계 진행 가능'),
    mkTask(p2, '초안 작성', 'todo', 3, null),
    mkTask(p2, '팀 공유 및 피드백 반영', 'todo', 5, null),

    mkTask(p3, '이사 업체 3곳 견적 받기', 'todo', 0, 'high', '개별 지정한 "높음" — 같은 날짜라도 위로 올라온다'),
    mkTask(p3, '안 쓰는 물건 정리', 'todo', 0, null, '큰 과업을 따라 "낮음" — 같은 오늘 마감이지만 아래로 내려간다'),
    mkTask(p3, '인터넷 이전 신청', 'todo', null, null),
  ];

  return { version: 1, projects: [p1, p2, p3], tasks };
}
