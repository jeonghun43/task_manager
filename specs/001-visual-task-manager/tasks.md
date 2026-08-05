# Tasks: 계층형 시각 태스크 매니저

**Spec**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md)

`[P]` = 앞 작업과 병렬 가능(다른 파일)

---

## Phase 1 — 프로젝트 셋업

- [x] **T001** Next.js 15 + TypeScript + Tailwind v4 스캐폴딩 (`src/` 디렉터리, `@/*` 별칭)
- [x] **T002** 의존성 추가: `zustand`, `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`
- [x] **T003** `src/app/globals.css` — 다크/라이트 CSS 변수 토큰, 8색 프로젝트 팔레트, 스크롤바 스타일
- [x] **T004** `src/app/layout.tsx` — 한국어 메타데이터, `viewport`, 플래시 방지 테마 부트스트랩 스크립트

## Phase 2 — 도메인 계층 (UI 없음)

- [x] **T005** `src/lib/types.ts` — `Status`, `Priority`, `DateStr`, `Project`, `Task`, `AppData` (plan §3)
- [x] **T006** [P] `src/lib/constants.ts` — 상태/우선순위 한글 라벨·아이콘·순위, `PROJECT_COLORS` 8색
- [x] **T007** [P] `src/lib/id.ts` — `newId()`
- [x] **T008** [P] `src/lib/date.ts` — `todayStr()`, `formatKorean()`, `diffDays()`, `monthMatrix()`, `parseDateStr()` (UTC 변환 금지)
- [x] **T009** `src/lib/derive.ts` — `effectivePriority`, `isInherited`, `projectProgress`, `compareByDeadline` ★AC-4/5/6의 단일 진실 지점
- [x] **T010** [P] `src/lib/storage/adapter.ts` — `StorageAdapter` 인터페이스 (`load`/`save`/`clear`)
- [x] **T011** `src/lib/storage/local.ts` — `LocalStorageAdapter` (SSR 가드, JSON 파싱 실패 시 안전 폴백)
- [x] **T012** [P] `src/lib/seed.ts` — 구조를 보여주는 샘플 큰 과업 3개 + 할 일 다수 (FR-6.3)

## Phase 3 — 상태 관리

- [x] **T013** `src/store/useAppStore.ts`
  - 프로젝트: `addProject` `updateProject` `deleteProject`(하위 연쇄 삭제) `reorderProjects`
  - 할 일: `addTask` `updateTask` `deleteTask` `toggleTaskDone` `moveTask`(프로젝트 이동+정렬) `setTaskStatus`
  - `hydrate()`, 모든 변경 후 어댑터 저장, `exportJson()` / `importJson()` / `clearAll()` / `loadSeed()`
- [x] **T014** [P] `src/store/useUiStore.ts` — `view`, `search`, `projectFilter`, `priorityFilter`, `hideCompleted`, `theme`, `calendarMonth` + 영속화 (FR-3.5/3.6, FR-7.1)

## Phase 4 — 공통 UI 프리미티브

- [x] **T015** [P] `src/components/ui/Modal.tsx` — ESC/배경 클릭 닫기, 모바일 바텀시트 형태
- [x] **T016** [P] `src/components/ui/Badge.tsx` — 상태·우선순위·프로젝트 배지
- [x] **T017** [P] `src/components/ui/Checkbox.tsx` — 44px 터치 타깃
- [x] **T018** [P] `src/components/ui/Menu.tsx` — ⋮ 드롭다운 (FR-5.2 대체 경로의 기반)
- [x] **T019** [P] `src/components/ui/Field.tsx` — 라벨/입력/셀렉트/날짜 입력 묶음
- [x] **T020** [P] `src/components/ProgressBar.tsx` — `3/7 · 43%`
- [x] **T021** [P] `src/components/ConfirmDialog.tsx` — 파괴적 동작 확인 (헌법 VI)

## Phase 5 — 편집 다이얼로그

- [x] **T022** `src/components/ProjectDialog.tsx` — 생성/수정: 제목·설명·상태·우선순위·마감일·색상 (FR-1.1)
- [x] **T023** `src/components/TaskDialog.tsx` — 생성/수정: 제목·메모·상태·마감일·소속 변경 + **우선순위 상속/개별 지정 토글** (FR-2.3, FR-2.5)

## Phase 6 — 뷰 4종

- [x] **T024** `src/components/TaskCard.tsx` — 체크박스, 제목(완료 시 취소선), 마감일, 우선순위 배지(상속 시 옅은 표시), 프로젝트 배지(옵션), ⋮ 메뉴(상태 변경·이동·삭제), 드래그 핸들
- [x] **T025** `src/components/views/ProjectBoardView.tsx` — 큰 과업 = 컬럼(헤더: 배지·마감일·진행률), 인라인 추가 입력, 카드 정렬/이동 DnD (FR-3.1, US-1)
- [x] **T026** [P] `src/components/views/StatusBoardView.tsx` — To-Do/진행 중/완료 3컬럼, 드롭 시 상태 변경 (FR-3.2, US-2)
- [x] **T027** [P] `src/components/views/DeadlineView.tsx` — 6개 그룹, `compareByDeadline` 정렬 (FR-3.3, AC-6)
- [x] **T028** [P] `src/components/views/CalendarView.tsx` — 월간 그리드, 이전/다음/오늘, 날짜 상세 패널 (FR-3.4)

## Phase 7 — 셸 통합

- [x] **T029** `src/components/ViewTabs.tsx` — 4개 뷰 탭 (참고 이미지의 탭 스타일)
- [x] **T030** `src/components/Toolbar.tsx` — 검색, 필터(큰 과업·우선순위·완료 숨김), 테마 토글, 데이터 메뉴(내보내기/가져오기/샘플/비우기), 새로 만들기 (FR-4, FR-6.2)
- [x] **T031** `src/components/AppShell.tsx` — 하이드레이션 게이트 + 헤더 + 활성 뷰 라우팅
- [x] **T032** `src/app/page.tsx` — `AppShell` 마운트

## Phase 8 — 마감 검증

- [x] **T033** `npm run build` 통과 (타입 오류 0)
- [x] **T034** 인수 기준 AC-1 ~ AC-10 수동 검증 → [verification.md](./verification.md)
- [x] **T035** 375px / 1280px 반응형 확인
- [x] **T036** `README.md` — 실행·배포·데이터 구조·향후 확장 안내

---

## Phase 9 — 역산 플래너 (2026-07-28 추가, FR-8 / FR-9)

- [x] **T037** `src/lib/schedule.ts` — `backwardSchedule(deadline, today, orderedIds)`, `daysUntil`. 순수 함수, 주말 포함
- [x] **T038** `useAppStore.setTaskDueDates(entries)` — 여러 항목 마감일 일괄 지정(확정 시 한 번만 저장)
- [x] **T039** [P] `src/components/ui/DueDatePicker.tsx` — 날짜 칩 팝오버(빠른 선택·직접 입력·지우기)
- [x] **T040** `TaskCard` — 마감일 칩을 `DueDatePicker` 로 교체, `onDueChange` 가로채기 훅 추가 (FR-9.4)
- [x] **T041** `CalendarView` — 계획 대상 큰 과업 선택, `마감까지 N일` 표시, 계획 구간 하이라이트
- [x] **T042** `PlanTray` — 미배치 항목 트레이(순번 표시), 트레이 드롭 시 마감일 해제, 역산 배치 버튼과 상황별 안내 문구
- [x] **T043** `DayCell` / `DayChip` — 날짜 칸 droppable, 배치된 항목 draggable, 미리보기 항목 점선 구분
- [x] **T044** 미리보기 상태 관리 — 확정/취소 배너, 확정 시에만 저장
- [x] **T045** 화면 밖 배치 알림 + 해당 달로 이동 (FR-8.6)
- [x] **T046** `AppShell` — 헤더 `오늘 N` 칩, 클릭 시 마감기한 뷰로 (FR-8.7)
- [x] **T047** 테마 부트스트랩 인라인 스크립트 제거 → `prefers-color-scheme` 기반으로 교체 (React 19 경고 해소, CSP 개선)
- [x] **T048** AC-11 ~ AC-14 검증 → [verification.md](./verification.md)
- [x] **T049** `Field.tsx` — `background` 단축 속성이 `background-repeat` 를 초기화해 Select 화살표가 타일링되던 문제 수정 (`backgroundColor` + 명시적 `backgroundRepeat`)
- [x] **T050** 큰 과업 선택기를 달력 툴바 → 트레이 안으로 이동, `계획할 큰 과업` 라벨·마감일·남은 일수 표시 (FR-8.1)
- [x] **T051** 트레이 sticky 고정 + 화면 높이 제한(목록만 내부 스크롤). aside 가 달력 높이만큼 늘어나야 sticky 가 끝까지 버틴다 (FR-8.2)
- [x] **T052** `src/store/usePlanStore.ts` — 미리보기 상태를 캘린더 지역 상태에서 스토어로 승격. `commitPreview` / `discardPreview` 를 한 곳에 모음 (영속화하지 않음)
- [x] **T053** `ConfirmDialog` — 선택지 셋(저장 / 저장 안 함 / 취소)을 위한 `secondaryLabel` · `onSecondary` 추가
- [x] **T054** `AppShell.requestView` — 뷰 전환의 단일 통로. 미확정 배치가 있으면 저장 확인 다이얼로그. `ViewTabs` 와 헤더 `오늘 N` 칩 모두 이 통로를 쓴다 (FR-8.9)
- [x] **T055** `useUiStore.boardSort` (`deadline` 기본 / `manual`) 추가 및 영속화
- [x] **T056** `ProjectBoardView` — 마감일 순 정렬 적용, 정렬 전환 버튼 노출, 마감일 순일 때 같은 컬럼 재배치 드래그 차단 (FR-3.1)
- [x] **T057** `useAppStore.addTask` — 새 할 일을 맨 위에 삽입(`min(order) - 1`), 입력창을 목록 위로 이동 (FR-2.1)

## Phase 10 — UX 검토 반영

- [x] **T058** `src/components/views/TodayView.tsx` — 지남 / 오늘 / 오늘 끝낸 것 + 빈 상태 안내 (FR-9.1~9.4)
- [x] **T059** `ViewKey` 에 `today` 추가, `VIEWS` 첫 번째로, `useUiStore` 기본값 `today`
- [x] **T060** 오늘 개수를 탭 배지로 이동, 헤더 칩 제거 (FR-9.5)
- [x] **T061** `src/store/useToastStore.ts` + `Toaster.tsx` — 되돌리기 토스트 (10초)
- [x] **T062** `useAppStore.restoreTasks` — 스냅샷 복구의 단일 경로 (FR-10.1)
- [x] **T063** 할 일 삭제 확인 다이얼로그 제거 → 되돌리기. 드래그(마감일·과업 이동·상태), 메뉴 이동, 지난 항목 일괄 이동에 되돌리기 부착 (FR-10)
- [x] **T064** `.tap-44` 유틸리티 + `⋮`·체크박스·닫기·달력 내비·날짜 칩에 적용 (FR-11.1)
- [x] **T065** 텍스트 토큰 재조정 — 다크 faint `#6f6f6f`→`#909090`(4.8:1), muted `#9b9b9b`→`#adadad`(6.8:1); 라이트도 동일 기준 (FR-11.2)
- [x] **T066** `.sr-only` + 우선순위 상속 설명 텍스트 (FR-11.3)
- [x] **T067** 과업별 뷰 정렬 토글 → 세그먼티드 컨트롤 (FR-12)
- [x] **T068** `src/components/ui/Icon.tsx` — 선 아이콘 세트로 이모지·기하 문자 전면 교체, 우선순위는 방향 기호로 (FR-13)

## Phase 11 — 큰 과업 순서 드래그 (FR-14)

- [x] **T069** `Icon.tsx` — `grip` 아이콘 추가 (세로 2열 점, 드래그 손잡이의 표준 기호)
- [x] **T070** `ProjectColumn.tsx` — `useSortable({ id: 'project:<id>' })`, 손잡이는 `setActivatorNodeRef` 로 헤더 grip 버튼에만. 컬럼이 하나면 `sortDisabled`
- [x] **T071** `ProjectColumn.tsx` — `ProjectColumnGhost` 로 DragOverlay 축약 표현 (컬럼 전체 복제는 무겁고 드롭 위치를 가린다)
- [x] **T072** `ProjectBoardView.tsx` — 가로 `SortableContext`, `resolveProjectId()` 로 드롭 대상(카드·컬럼 배경·컬럼 자체)을 큰 과업 id 로 환원
- [x] **T073** 드롭 자리 미리보기 — 원래 컬럼을 점선 자리 표시로 바꾸고(`data-dragging-column` + globals.css `visibility:hidden`) `여기에 놓입니다` 힌트. 결과가 미리 보이므로 되돌리기 토스트는 두지 않는다
- [x] **T074b** `boardCollisionDetection` — 컬럼 드래그 시 후보를 컬럼으로 한정하고 `closestCenter` 사용 (반 칸이면 자리가 열린다)
- [x] **T074** 회귀 확인 — 카드의 컬럼 간 이동·같은 컬럼 재배치가 그대로 동작 (AC-16)

## Phase 12 — 끝낸 일 아래로 (FR-15)

- [x] **T075** `derive.ts` — `compareDoneLast()` 신설, `compareByDeadline` 의 첫 번째 정렬 키로 편입 (과업별 `마감일 순` · 상태 · 캘린더 날짜별 목록에 함께 적용)
- [x] **T076** `ProjectBoardView.tsx` — `직접 순서` 모드에도 `compareDoneLast() || order` 적용
- [x] **T077** `derive.ts` — `DEADLINE_GROUPS` 에 `끝냄` 추가, `deadlineGroupOf(dueDate, status)` 가 완료 항목을 원래 날짜 그룹에서 빼낸다
- [x] **T078** `DeadlineView.tsx` — `끝냄` 그룹 제목은 흐리게(주의를 끌지 않도록), `완료 숨기기` 필터와 공존 확인

- [x] **T079** `CalendarView.tsx` — 날짜 이동의 되돌리기 토스트 제거 (FR-10.3)

## 의존 관계

```
T001 → T002 → T003,T004
T005 → T006..T012 → T013,T014 → T015..T021 → T022,T023 → T024 → T025..T028 → T029..T032 → T033..T036
```

## 추적 매트릭스

| 요구사항 | 태스크 |
|---|---|
| FR-1 큰 과업 | T013, T022, T025 |
| FR-2 작은 과업 | T013, T023, T024 |
| FR-3 뷰 4종 | T025, T026, T027, T028, T029 |
| FR-4 필터·검색 | T014, T030 |
| FR-5 조작 | T018, T024, T025, T026 |
| FR-6 데이터 | T010, T011, T012, T013, T030 |
| FR-7 표현 | T003, T004, T014, T030 |
| AC-4/AC-5 상속 | T009, T023 |
| AC-6 정렬 | T009, T027 |
| FR-8 역산 플래너 | T037, T038, T041~T046 |
| FR-9 인라인 날짜 편집 | T039, T040 |
| FR-14 큰 과업 순서 드래그 | T069~T073 |
| FR-15 끝낸 일 아래로 | T075~T078 |
| AC-17/AC-18/AC-19 | T075, T076, T077 |
| AC-15/AC-16 | T072, T073, T074 |
