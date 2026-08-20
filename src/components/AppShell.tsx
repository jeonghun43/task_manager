'use client';

import { useEffect, useMemo, useState } from 'react';
import { todayStr } from '@/lib/date';
import type { TaskFilter } from '@/lib/derive';
import { useAppStore } from '@/store/useAppStore';
import { usePlanStore } from '@/store/usePlanStore';
import { teardownSync, useSyncStore } from '@/store/useSyncStore';
import { useUiStore } from '@/store/useUiStore';
import type { Project, Task, ViewKey } from '@/lib/types';
import ConfirmDialog from './ConfirmDialog';
import FilterBar from './FilterBar';
import ProjectDialog from './ProjectDialog';
import TaskDialog from './TaskDialog';
import Toaster from './Toaster';
import Toolbar from './Toolbar';
import ViewTabs from './ViewTabs';
import CalendarView from './views/CalendarView';
import DeadlineView from './views/DeadlineView';
import ProjectBoardView from './views/ProjectBoardView';
import StatusBoardView from './views/StatusBoardView';
import TodayView from './views/TodayView';

export default function AppShell() {
  const hydrate = useAppStore((s) => s.hydrate);
  const hydrated = useAppStore((s) => s.hydrated);
  const deleteProject = useAppStore((s) => s.deleteProject);
  const tasks = useAppStore((s) => s.tasks);

  const initSync = useSyncStore((s) => s.init);
  const syncState = useSyncStore((s) => s.state);
  const syncCounts = useSyncStore((s) => s.localCounts);
  const uploadAndSync = useSyncStore((s) => s.uploadAndSync);
  const postponeSync = useSyncStore((s) => s.postpone);
  const hydrateUi = useUiStore((s) => s.hydrateUi);
  const uiHydrated = useUiStore((s) => s.uiHydrated);
  const view = useUiStore((s) => s.view);
  const setView = useUiStore((s) => s.setView);
  const search = useUiStore((s) => s.search);
  const projectFilter = useUiStore((s) => s.projectFilter);
  const priorityFilter = useUiStore((s) => s.priorityFilter);
  const hideCompleted = useUiStore((s) => s.hideCompleted);

  // 편집 대상 (null = 새로 만들기)
  const [projectDialog, setProjectDialog] = useState<{ open: boolean; project: Project | null }>({
    open: false,
    project: null,
  });
  const [taskDialog, setTaskDialog] = useState<{
    open: boolean;
    task: Task | null;
    projectId?: string;
  }>({ open: false, task: null });
  const [deleting, setDeleting] = useState<Project | null>(null);

  // 확정하지 않은 역산 배치가 있는 상태에서 다른 뷰로 가려 할 때 붙잡아 둔다
  const preview = usePlanStore((s) => s.preview);
  const commitPreview = usePlanStore((s) => s.commitPreview);
  const discardPreview = usePlanStore((s) => s.discardPreview);
  const [pendingView, setPendingView] = useState<ViewKey | null>(null);

  /**
   * 뷰 전환의 단일 통로.
   * 탭이든 헤더의 "오늘 N" 칩이든 전부 여기를 거쳐야 저장 확인을 빠뜨리지 않는다.
   */
  const requestView = (next: ViewKey) => {
    if (next === view) return;
    if (view === 'calendar' && preview) {
      setPendingView(next);
      return;
    }
    setView(next);
  };

  useEffect(() => {
    hydrateUi();
    void hydrate();
    /*
     * 동기화는 로컬 하이드레이션 뒤에 붙는다.
     * 화면은 항상 로컬 데이터로 즉시 그려지고(오프라인에서도 뜬다),
     * 로그인되어 있으면 그 위에 서버 상태가 얹힌다.
     */
    void initSync();
    return () => teardownSync();
  }, [hydrate, hydrateUi, initSync]);

  const filter: TaskFilter = useMemo(
    () => ({ search, projectId: projectFilter, priority: priorityFilter, hideCompleted }),
    [search, projectFilter, priorityFilter, hideCompleted],
  );

  /** 역산의 결과물 — 오늘 끝내야 할 것 */
  const todayCount = useMemo(() => {
    const t = todayStr();
    return tasks.filter((x) => x.dueDate === t && x.status !== 'done').length;
  }, [tasks]);

  const openNewProject = () => setProjectDialog({ open: true, project: null });
  const openEditProject = (p: Project) => setProjectDialog({ open: true, project: p });
  const openNewTask = () => setTaskDialog({ open: true, task: null });
  const openEditTask = (t: Task) => setTaskDialog({ open: true, task: t });

  if (!hydrated || !uiHydrated) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <span className="text-[13px]" style={{ color: 'var(--text-faint)' }}>
          불러오는 중…
        </span>
      </div>
    );
  }

  const deletingTaskCount = deleting
    ? tasks.filter((t) => t.projectId === deleting.id).length
    : 0;

  return (
    <div className="flex h-dvh flex-col">
      <header className="shrink-0 px-4 pt-4">
        <div className="mb-3 flex items-center gap-3">
          {/*
            좁은 화면에서는 제목이 줄어들고 툴바가 온전히 남아야 한다.
            반대로 두면 오른쪽 끝의 로그인 버튼이 잘려 나간다 — 새 기기에서 가장 먼저 눌러야 할 버튼이다.
          */}
          <h1 className="min-w-0 flex-1 truncate text-[22px] font-bold tracking-tight sm:text-[26px]">
            정정쓰 TASK MANAGER
          </h1>

          <div className="ml-auto shrink-0">
            <Toolbar filter={filter} onNewProject={openNewProject} onNewTask={openNewTask} />
          </div>
        </div>
        <ViewTabs onSelect={requestView} todayCount={todayCount} />
      </header>

      <div className="shrink-0 pt-2">
        <FilterBar filter={filter} />
      </div>

      <main className="min-h-0 flex-1 pt-1">
        {view === 'today' && (
          <TodayView filter={filter} onEditTask={openEditTask} onGoToView={requestView} />
        )}
        {view === 'project' && (
          <ProjectBoardView
            filter={filter}
            onEditTask={openEditTask}
            onEditProject={openEditProject}
            onDeleteProject={setDeleting}
            onNewProject={openNewProject}
          />
        )}
        {view === 'status' && <StatusBoardView filter={filter} onEditTask={openEditTask} />}
        {view === 'deadline' && <DeadlineView filter={filter} onEditTask={openEditTask} />}
        {view === 'calendar' && (
          <CalendarView
            filter={filter}
            onEditTask={openEditTask}
            onEditProject={openEditProject}
            onGoToView={requestView}
          />
        )}
      </main>

      <ProjectDialog
        open={projectDialog.open}
        project={projectDialog.project}
        onClose={() => setProjectDialog({ open: false, project: null })}
      />

      <TaskDialog
        open={taskDialog.open}
        task={taskDialog.task}
        defaultProjectId={taskDialog.projectId}
        onClose={() => setTaskDialog({ open: false, task: null })}
      />

      <ConfirmDialog
        open={pendingView !== null}
        title="역산 배치를 저장할까요?"
        message={
          preview
            ? `아직 확정하지 않은 배치가 ${preview.size}개 있어요.\n다른 화면으로 옮기면 저장하지 않은 배치는 사라집니다.`
            : ''
        }
        danger={false}
        confirmLabel="저장하고 이동"
        secondaryLabel="저장 안 하고 이동"
        onSecondary={() => {
          discardPreview();
          if (pendingView) setView(pendingView);
          setPendingView(null);
        }}
        onConfirm={() => {
          commitPreview();
          if (pendingView) setView(pendingView);
          setPendingView(null);
        }}
        onCancel={() => setPendingView(null)}
      />

      <ConfirmDialog
        open={deleting !== null}
        title="큰 과업 삭제"
        message={
          deleting
            ? `"${deleting.title}" 을(를) 삭제하면 그 아래 할 일 ${deletingTaskCount}개도 함께 사라져요.\n이 동작은 되돌릴 수 없어요.`
            : ''
        }
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) deleteProject(deleting.id);
          setDeleting(null);
        }}
      />

      {/*
        로그인 직후, 이 기기에 데이터가 있으면 올릴지 먼저 묻는다 (FR-21).
        묻지 않고 합치면 "계정에는 없어야 할 것" 이 조용히 올라간다.
      */}
      <ConfirmDialog
        open={syncState === 'asking'}
        title="이 기기의 일정을 계정에 올릴까요?"
        message={`이 기기에 큰 과업 ${syncCounts.projects}개, 할 일 ${syncCounts.tasks}개가 있어요.
올리면 계정에 있던 일정과 합쳐집니다.

올리기 전에 정리하고 싶으면 "나중에" 를 고르세요.
동기화를 미뤄둔 채로 이 기기에서 계속 정리할 수 있어요.`}
        danger={false}
        confirmLabel="올리고 동기화 시작"
        secondaryLabel="나중에 — 먼저 정리할게요"
        onSecondary={postponeSync}
        onConfirm={() => void uploadAndSync()}
        onCancel={postponeSync}
      />

      <Toaster />
    </div>
  );
}
