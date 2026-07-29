# Implementation Plan: 계층형 시각 태스크 매니저

**Spec**: [spec.md](./spec.md)
**Constitution**: [.specify/memory/constitution.md](../../.specify/memory/constitution.md)
**Date**: 2026-07-28

---

## 1. 기술 결정

| 항목 | 선택 | 근거 |
|---|---|---|
| 프레임워크 | **Next.js 15 (App Router)** | 반응형 웹, Vercel 무료 배포, 향후 API Route로 백엔드 확장이 자연스러움 |
| 언어 | **TypeScript (strict)** | 상속 우선순위·상태 전이 등 규칙을 타입으로 강제 |
| 스타일 | **Tailwind CSS v4** | 두 번째 참고 이미지(노션 다크)와 유사한 밀도 높은 UI를 빠르게 구성 |
| 상태 관리 | **Zustand** | 단일 스토어 + selector. Context 리렌더 문제 없이 4개 뷰가 같은 데이터를 구독 |
| DnD | **@dnd-kit** | 포인터·터치 센서 동시 지원, 접근성 키보드 센서 내장 |
| 영속화 | **localStorage (어댑터 경유)** | 헌법 III |
| ID | `crypto.randomUUID()` | 외부 의존성 불필요 |
| 날짜 | 자체 유틸 (`YYYY-MM-DD` 문자열) | 타임존 버그 회피. 마감일은 "날짜"이지 "순간"이 아니므로 Date 객체로 저장하지 않는다 |

**날짜 표현 원칙**: 마감일은 `"2025-05-23"` 형식의 로컬 날짜 문자열로만 저장한다. `new Date().toISOString()`을 마감일에 쓰지 않는다 (UTC 변환으로 하루가 밀린다).

## 2. 아키텍처

```
UI 컴포넌트 (뷰 4종 + 편집 다이얼로그)
        │  읽기: selector   쓰기: action
        ▼
   Zustand Store  ──(파생 계산은 lib/derive)
        │  persist(스냅샷)
        ▼
   StorageAdapter (interface)
        ▼
  LocalStorageAdapter   ← 향후 SupabaseAdapter로 교체 지점
```

- **컴포넌트는 localStorage를 모른다.** 스토어만이 어댑터를 호출한다.
- **파생 값은 저장하지 않는다.** 진행률·유효 우선순위는 항상 `lib/derive.ts`에서 계산한다 (AC-4/AC-5의 상속 규칙을 한 곳에서 보장).
- **뷰는 순수 투영이다.** 각 뷰는 `projects`, `tasks`, `filter`를 받아 자기 방식으로 그룹핑만 한다.

## 3. 데이터 모델

```ts
type Status   = 'todo' | 'in_progress' | 'done';
type Priority = 'high' | 'medium' | 'low';
type DateStr  = string; // "YYYY-MM-DD"

interface Project {          // 큰 과업
  id: string;
  title: string;
  description?: string;
  status: Status;            // 수동 지정 (자동 전환 없음)
  priority: Priority;
  dueDate?: DateStr;
  color: ProjectColor;       // 8색 팔레트 키
  order: number;
  createdAt: string;         // ISO
  updatedAt: string;
}

interface Task {             // 작은 과업
  id: string;
  projectId: string;
  title: string;
  notes?: string;
  status: Status;
  dueDate?: DateStr;
  priority: Priority | null; // null = 소속 큰 과업에서 상속  ★핵심
  order: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

interface AppData {
  version: 1;                // NFR-3 마이그레이션 대비
  projects: Project[];
  tasks: Task[];
}
```

**`priority: null`이 상속을 표현한다.** 별도의 `inherited: boolean` 플래그를 두지 않는다 — 두 필드가 어긋날 여지를 없애기 위함.

파생 함수 (`lib/derive.ts`):
- `effectivePriority(task, project): Priority` → `task.priority ?? project.priority`
- `projectProgress(projectId, tasks): { done, total, percent }`
- `isInherited(task): boolean` → `task.priority === null`

## 4. 상태 · 체크박스 상호작용

체크박스와 3단계 상태를 하나로 통합한다.

| 동작 | 결과 |
|---|---|
| 체크박스 ON | `status = 'done'`, `completedAt` 기록 |
| 체크박스 OFF | `status = 'todo'`, `completedAt` 제거 |
| 상태 셀렉트로 `진행 중` 선택 | `status = 'in_progress'` (체크박스는 해제 상태로 표시) |
| 상태별 뷰에서 완료 컬럼으로 드래그 | 체크박스 ON과 동일 |

즉 **체크박스 = `status === 'done'`** 이며 별도 `done` 필드를 만들지 않는다.

## 5. 정렬 규칙 (FR-3.3)

```
PRIORITY_RANK = { high: 0, medium: 1, low: 2 }

마감기한 뷰 정렬:
  1) dueDate 오름차순 (없으면 마지막 그룹)
  2) effectivePriority 랭크 오름차순   ← 같은 날짜면 높음이 위
  3) project.order
  4) task.order
```

그룹 경계는 "오늘"을 로컬 자정 기준으로 계산한다.
`지남(<오늘) / 오늘 / 내일 / 이번 주(2~7일 후) / 이후 / 기한 없음`

## 6. 화면 구성

```
┌──────────────────────────────────────────────┐
│  작업 관리 칸반            [검색][필터][⋯][+]  │  Header
│  → 상태  ↑ 우선순위  ▤ 과업별  ▦ 캘린더        │  ViewTabs
├──────────────────────────────────────────────┤
│                                              │
│              < 활성 뷰 렌더 >                  │
│                                              │
└──────────────────────────────────────────────┘
```

- 데스크톱: 보드 컬럼 가로 배치 + 가로 스크롤
- 모바일(<768px): 컬럼 폭 85vw로 스냅 스크롤, 툴바는 아이콘만
- 다크 모드가 기본. `data-theme` 속성으로 전환, 선택은 로컬 저장

## 7. 파일 구조

```
src/
  app/
    layout.tsx            루트 레이아웃, 테마 부트스트랩
    page.tsx              앱 진입 (client)
    globals.css           토큰 + Tailwind
  lib/
    types.ts              §3 모델
    constants.ts          상태/우선순위 라벨, 색 팔레트
    id.ts  date.ts        유틸
    derive.ts             파생 계산 (상속·진행률·정렬 키)
    seed.ts               샘플 데이터
    storage/
      adapter.ts          StorageAdapter 인터페이스
      local.ts            LocalStorageAdapter
  store/
    useAppStore.ts        Zustand 스토어 + 액션 + 영속화
    useUiStore.ts         뷰/필터/테마 (별도 영속화)
  components/
    AppShell.tsx  Toolbar.tsx  ViewTabs.tsx  FilterBar.tsx
    TaskCard.tsx  ProjectColumn.tsx  ProgressBar.tsx
    ProjectDialog.tsx  TaskDialog.tsx  ConfirmDialog.tsx
    ui/  Badge Checkbox Modal Select DatePicker Menu
    views/
      ProjectBoardView.tsx
      StatusBoardView.tsx
      DeadlineView.tsx
      CalendarView.tsx
```

## 8. 헌법 준수 확인

| 원칙 | 준수 방법 |
|---|---|
| I. 계층이 곧 기능 | 모든 카드에 큰 과업 색상 배지 표시 (`TaskCard`에 강제) |
| II. 하나의 데이터 4개 시선 | 뷰별 필드 없음. 4개 뷰 모두 동일 스토어 selector 사용 |
| III. 로컬 우선, 서버 준비 | `StorageAdapter` 경유. 컴포넌트의 `localStorage` 직접 접근 금지 |
| IV. 입력 비용 최소화 | 인라인 추가는 제목 1개만 필수, Enter 후 입력창 유지 |
| V. 어디서든 | 반응형 + 모든 드래그 동작에 ⋮ 메뉴 대체 경로 |
| VI. 데이터는 사용자 것 | JSON export/import, 삭제는 확인 다이얼로그 |

## 9. 리스크

| 리스크 | 대응 |
|---|---|
| SSR/localStorage 하이드레이션 불일치 | 스토어 hydrate 완료 전까지 스켈레톤 렌더 |
| 마감일 타임존 하루 밀림 | 날짜를 `YYYY-MM-DD` 문자열로만 취급, UTC 변환 금지 |
| 모바일에서 드래그와 스크롤 충돌 | dnd-kit `activationConstraint`(지연 200ms/이동 8px)로 분리 |
| 우선순위 상속 규칙 회귀 | `derive.ts` 단일 지점 + AC-4/AC-5 수동 검증 체크리스트 |

## 10. 향후 확장 (이번 범위 밖, 설계만 대비)

1. `SupabaseAdapter` 추가 → 스토어의 어댑터 주입만 교체
2. `AppData.version` 기반 마이그레이션 함수 체인
3. 계정/공유: `Project`에 `ownerId`, `sharedWith` 추가 (모델 확장으로 흡수)
