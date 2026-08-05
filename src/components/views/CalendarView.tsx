'use client';

import { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  WEEKDAY_KO,
  addMonths,
  formatKorean,
  formatMonth,
  monthMatrix,
  parseDateStr,
  todayStr,
} from '@/lib/date';
import { compareByDeadline, filterTasks, projectMap, type TaskFilter } from '@/lib/derive';
import { PRIORITY_RANK } from '@/lib/constants';
import { backwardSchedule, daysUntil } from '@/lib/schedule';
import { useAppStore } from '@/store/useAppStore';
import { usePlanStore } from '@/store/usePlanStore';
import { useUiStore } from '@/store/useUiStore';
import type { DateStr, Project, Task } from '@/lib/types';
import { StaticTaskCard } from '../TaskCard';
import { useBoardSensors } from '../useBoardSensors';
import { Button } from '../ui/Field';
import Icon from '../ui/Icon';

interface Props {
  filter: TaskFilter;
  onEditTask: (task: Task) => void;
  onEditProject: (project: Project) => void;
}

/**
 * 캘린더 뷰 + 역산 플래너 (FR-3.4, FR-8)
 *
 * 최종 목표의 마감일을 앵커로 두고, 미배치 항목을 남은 날에 흩뿌린 뒤
 * 드래그로 조정한다. 오늘 칸에 남는 것이 곧 "오늘 해야 할 일" 이다.
 */
export default function CalendarView({ filter, onEditTask, onEditProject }: Props) {
  const projects = useAppStore((s) => s.projects);
  const tasks = useAppStore((s) => s.tasks);
  const updateTask = useAppStore((s) => s.updateTask);

  const anchor = useUiStore((s) => s.calendarAnchor);
  const setAnchor = useUiStore((s) => s.setCalendarAnchor);
  const projectFilter = useUiStore((s) => s.projectFilter);
  const setProjectFilter = useUiStore((s) => s.setProjectFilter);

  const sensors = useBoardSensors();
  const today = todayStr();

  const [selected, setSelected] = useState<DateStr>(today);
  const [activeId, setActiveId] = useState<string | null>(null);

  /**
   * 역산 배치 미리보기 — 확정 전까지 저장되지 않는다.
   * 뷰를 옮길 때 저장 여부를 물어보려면 캘린더 밖에서도 보여야 하므로 스토어에 둔다.
   */
  const preview = usePlanStore((s) => s.preview);
  const setPreview = usePlanStore((s) => s.setPreview);
  const commitPreview = usePlanStore((s) => s.commitPreview);
  const discardPreview = usePlanStore((s) => s.discardPreview);

  const pmap = useMemo(() => projectMap(projects), [projects]);
  const cells = useMemo(() => monthMatrix(anchor), [anchor]);
  const orderedProjects = useMemo(
    () => [...projects].sort((a, b) => a.order - b.order),
    [projects],
  );

  /** 미리보기를 얹은 실질 마감일 */
  const effectiveDue = useMemo(() => {
    return (t: Task): DateStr | undefined => (preview?.has(t.id) ? preview.get(t.id) : t.dueDate);
  }, [preview]);

  const visible = useMemo(() => filterTasks(tasks, pmap, filter), [tasks, pmap, filter]);

  const tasksByDate = useMemo(() => {
    const m = new Map<DateStr, Task[]>();
    for (const t of visible) {
      const d = effectiveDue(t);
      if (!d) continue;
      const list = m.get(d) ?? [];
      list.push(t);
      m.set(d, list);
    }
    for (const list of m.values()) list.sort((a, b) => compareByDeadline(a, b, pmap));
    return m;
  }, [visible, effectiveDue, pmap]);

  const projectsByDate = useMemo(() => {
    const m = new Map<DateStr, Project[]>();
    for (const p of projects) {
      if (!p.dueDate) continue;
      if (filter.projectId && p.id !== filter.projectId) continue;
      if (filter.priority && p.priority !== filter.priority) continue;
      const list = m.get(p.dueDate) ?? [];
      list.push(p);
      m.set(p.dueDate, list);
    }
    for (const list of m.values())
      list.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
    return m;
  }, [projects, filter.projectId, filter.priority]);

  /** 아직 날짜가 없는 미완료 항목 — 순서를 지켜 나열 */
  const trayTasks = useMemo(() => {
    return visible
      .filter((t) => !effectiveDue(t) && t.status !== 'done')
      .sort((a, b) => {
        const ao = pmap.get(a.projectId)?.order ?? 0;
        const bo = pmap.get(b.projectId)?.order ?? 0;
        return ao !== bo ? ao - bo : a.order - b.order;
      });
  }, [visible, effectiveDue, pmap]);

  /* --------------------------- 역산 배치 --------------------------- */

  const planProject = projectFilter ? pmap.get(projectFilter) : undefined;
  const remaining = planProject?.dueDate ? daysUntil(planProject.dueDate, today) : null;

  /** 계획 대상: 선택한 큰 과업의 미배치 미완료 항목 (순서 유지) */
  const planTargets = useMemo(() => {
    if (!planProject) return [];
    return trayTasks.filter((t) => t.projectId === planProject.id);
  }, [trayTasks, planProject]);

  const runBackwardSchedule = () => {
    if (!planProject?.dueDate || planTargets.length === 0) return;
    const next = backwardSchedule(
      planProject.dueDate,
      today,
      planTargets.map((t) => t.id),
    );
    setPreview(next);
    setAnchor(today);
  };


  /* ------------------------------ DnD ------------------------------ */

  const assign = (taskId: string, date: DateStr | undefined) => {
    if (preview) {
      const next = new Map(preview);
      if (date) next.set(taskId, date);
      else next.delete(taskId);
      setPreview(next);
      // 미리보기에서 빼낸 항목은 원래 날짜도 지워야 트레이로 돌아간다
      if (!date) {
        const t = tasks.find((x) => x.id === taskId);
        if (t?.dueDate) updateTask(taskId, { dueDate: undefined });
      }
      return;
    }

    /*
     * 달력에서 항목을 옮기는 일은 되돌리기를 붙이지 않는다.
     * 놓은 자리가 곧 결과라서 잘못 놓았는지 바로 보이고, 다시 끌면 그만이다.
     * 계획을 세우는 동안에는 이 동작을 연달아 하므로 매번 토스트가 뜨면 달력만 가린다.
     */
    updateTask(taskId, { dueDate: date });
  };

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const id = String(active.id);
    const overId = String(over.id);

    if (overId === 'plan-tray') assign(id, undefined);
    else if (overId.startsWith('day:')) assign(id, overId.slice('day:'.length));
  };

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : undefined;
  const selectedTasks = tasksByDate.get(selected) ?? [];
  const selectedProjects = projectsByDate.get(selected) ?? [];

  /**
   * 배치 결과가 이 달 화면 밖으로 넘어가는 경우 (마감일이 다음 달인 경우가 흔하다).
   * 알려주지 않으면 마지막 항목이 사라진 것처럼 보인다.
   */
  const offGrid = useMemo(() => {
    const first = cells[0].date;
    const last = cells[cells.length - 1].date;
    const outside = visible
      .map(effectiveDue)
      .filter((d): d is DateStr => !!d && (d < first || d > last));
    if (outside.length === 0) return null;
    const furthest = outside.reduce((a, b) => (a > b ? a : b));
    return { count: outside.length, furthest, after: furthest > last };
  }, [visible, effectiveDue, cells]);

  const goToday = () => {
    setAnchor(today);
    setSelected(today);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="thin-scroll h-full overflow-y-auto px-4 pb-8">
        {/*
          items-stretch(기본)를 유지해야 aside 가 달력 높이만큼 늘어난다.
          그래야 그 안의 sticky 트레이가 끝까지 스크롤해도 붙어 있을 수 있다.
        */}
        <div className="mx-auto flex max-w-6xl flex-col gap-4 lg:flex-row">
          {/* ------------------------- 그리드 ------------------------- */}
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <h2 className="text-[15px] font-semibold">{formatMonth(anchor)}</h2>

              {planProject && (
                <span
                  data-color={planProject.color}
                  className="inline-flex max-w-[240px] items-center gap-1.5 truncate rounded-full px-2 py-0.5 text-[11.5px]"
                  style={{
                    background: 'color-mix(in srgb, var(--pc) 15%, transparent)',
                    color: 'var(--pc)',
                  }}
                >
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: 'var(--pc)' }}
                    aria-hidden
                  />
                  <span className="truncate">{planProject.title}</span>
                </span>
              )}

              <div className="ml-auto flex items-center gap-1">
                <NavButton label="이전 달" onClick={() => setAnchor(addMonths(anchor, -1))}>
                  <Icon name="chevron-left" size={14} />
                </NavButton>
                <button
                  type="button"
                  onClick={goToday}
                  className="rounded-md border px-2.5 py-1 text-[12px] transition-colors"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                >
                  오늘
                </button>
                <NavButton label="다음 달" onClick={() => setAnchor(addMonths(anchor, 1))}>
                  <Icon name="chevron-right" size={14} />
                </NavButton>
              </div>
            </div>

            {preview && (
              <div
                className="pop-in mb-3 flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2"
                style={{
                  borderColor: 'var(--accent)',
                  background: 'color-mix(in srgb, var(--accent) 10%, transparent)',
                }}
              >
                <span className="text-[12.5px]">
                  역산 배치 미리보기 — 마음에 안 드는 항목은 다른 날로 끌어다 놓으세요.
                </span>
                <div className="ml-auto flex gap-1.5">
                  <Button onClick={discardPreview}>취소</Button>
                  <Button variant="primary" onClick={commitPreview}>
                    확정
                  </Button>
                </div>
              </div>
            )}

            <div
              className="overflow-hidden rounded-xl border"
              style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}
            >
              <div className="grid grid-cols-7">
                {WEEKDAY_KO.map((w, i) => (
                  <div
                    key={w}
                    className="border-b py-2 text-center text-[11px] font-medium"
                    style={{
                      borderColor: 'var(--border)',
                      color:
                        i === 0 ? 'var(--p-red)' : i === 6 ? 'var(--p-blue)' : 'var(--text-faint)',
                    }}
                  >
                    {w}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7">
                {cells.map((cell) => (
                  <DayCell
                    key={cell.date}
                    date={cell.date}
                    inMonth={cell.inMonth}
                    isToday={cell.date === today}
                    isSelected={cell.date === selected}
                    inPlanRange={
                      !!planProject?.dueDate &&
                      cell.date >= today &&
                      cell.date <= planProject.dueDate
                    }
                    tasks={tasksByDate.get(cell.date) ?? []}
                    projects={projectsByDate.get(cell.date) ?? []}
                    pmap={pmap}
                    previewIds={preview}
                    onSelect={() => setSelected(cell.date)}
                  />
                ))}
              </div>
            </div>

            {offGrid && (
              <div
                className="mt-2 flex flex-wrap items-center gap-2 px-1 text-[11.5px]"
                style={{ color: 'var(--text-faint)' }}
              >
                <span>
                  이 화면 밖에 {offGrid.count}개 · {formatKorean(offGrid.furthest)}까지 이어져요
                </span>
                <button
                  type="button"
                  onClick={() => setAnchor(addMonths(anchor, offGrid.after ? 1 : -1))}
                  className="underline"
                  style={{ color: 'var(--accent)' }}
                >
                  {offGrid.after ? '다음 달 보기' : '이전 달 보기'}
                </button>
              </div>
            )}
          </div>

          {/* --------------------- 트레이 + 상세 --------------------- */}
          <aside className="w-full space-y-3 lg:w-[340px] lg:shrink-0">
            {/*
              캘린더를 스크롤해도 트레이는 따라다닌다 — 드래그 거리를 짧게 유지하기 위함.
              창이 낮을 때 아래쪽(역산 배치 버튼)이 잘리지 않도록 화면 높이로 제한하고,
              넘치는 만큼은 안쪽 목록이 줄어든다.
            */}
            <div className="sticky top-0 z-20 flex max-h-[calc(100dvh-170px)] flex-col">
              <PlanTray
                tasks={trayTasks}
                pmap={pmap}
                projects={orderedProjects}
                selectedProjectId={projectFilter}
                onSelectProject={setProjectFilter}
                planProject={planProject}
                remaining={remaining}
                planTargetCount={planTargets.length}
                previewActive={preview !== null}
                onRun={runBackwardSchedule}
                onEditProject={onEditProject}
              />
            </div>

            <div
              className="rounded-xl border p-3"
              style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}
            >
              <h3 className="mb-2.5 text-[13px] font-semibold">
                {formatKorean(selected)}
                {selected === today && (
                  <span className="ml-1.5 text-[11px]" style={{ color: 'var(--accent)' }}>
                    오늘
                  </span>
                )}
              </h3>

              {selectedProjects.length > 0 && (
                <div className="mb-3">
                  <p
                    className="mb-1.5 text-[11px] font-medium"
                    style={{ color: 'var(--text-faint)' }}
                  >
                    큰 과업 마감
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {selectedProjects.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        data-color={p.color}
                        onClick={() => onEditProject(p)}
                        className="flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-[13px]"
                        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                      >
                        <span
                          className="h-3.5 w-1 shrink-0 rounded-full"
                          style={{ background: 'var(--pc)' }}
                          aria-hidden
                        />
                        <span className="truncate">{p.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selectedTasks.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {selectedTasks.map((t) => (
                    <StaticTaskCard
                      key={t.id}
                      // 미리보기 중이면 화면에 보이는 날짜와 카드의 날짜가 같아야 한다
                      task={preview ? { ...t, dueDate: effectiveDue(t) } : t}
                      project={pmap.get(t.projectId)}
                      showProject
                      onEdit={onEditTask}
                      onDueChange={preview ? (d) => assign(t.id, d) : undefined}
                    />
                  ))}
                </div>
              ) : (
                selectedProjects.length === 0 && (
                  <p className="py-6 text-center text-[12px]" style={{ color: 'var(--text-faint)' }}>
                    이 날짜에는 마감이 없어요
                  </p>
                )
              )}
            </div>
          </aside>
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeTask && (
          <span
            data-color={pmap.get(activeTask.projectId)?.color}
            className="inline-flex max-w-[240px] items-center gap-1.5 rounded-md border px-2 py-1 text-[12px]"
            style={{
              background: 'var(--bg-elevated)',
              borderColor: 'var(--pc, var(--border))',
              boxShadow: 'var(--shadow)',
            }}
          >
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: 'var(--pc, var(--accent))' }}
              aria-hidden
            />
            <span className="truncate">{activeTask.title}</span>
          </span>
        )}
      </DragOverlay>
    </DndContext>
  );
}

/* ------------------------------------------------------------------ */
/* 날짜 칸                                                              */
/* ------------------------------------------------------------------ */

function DayCell({
  date,
  inMonth,
  isToday,
  isSelected,
  inPlanRange,
  tasks,
  projects,
  pmap,
  previewIds,
  onSelect,
}: {
  date: DateStr;
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  inPlanRange: boolean;
  tasks: Task[];
  projects: Project[];
  pmap: Map<string, Project>;
  previewIds: Map<string, DateStr> | null;
  onSelect: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `day:${date}`, data: { type: 'day', date } });
  const dow = parseDateStr(date).getDay();

  const background = isOver
    ? 'color-mix(in srgb, var(--accent) 22%, transparent)'
    : isSelected
      ? 'color-mix(in srgb, var(--accent) 12%, transparent)'
      : inPlanRange
        ? 'color-mix(in srgb, var(--accent) 5%, transparent)'
        : 'transparent';

  return (
    <div
      ref={setNodeRef}
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      className="flex min-h-[76px] cursor-pointer flex-col items-start gap-1 border-b border-r p-1.5 text-left transition-colors sm:min-h-[104px]"
      style={{ borderColor: 'var(--border)', background, opacity: inMonth ? 1 : 0.38 }}
    >
      <span
        className="flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-medium"
        style={{
          background: isToday ? 'var(--accent)' : 'transparent',
          color: isToday
            ? 'var(--accent-contrast)'
            : dow === 0
              ? 'var(--p-red)'
              : dow === 6
                ? 'var(--p-blue)'
                : 'var(--text-muted)',
        }}
      >
        {parseDateStr(date).getDate()}
      </span>

      <div className="flex w-full flex-col gap-0.5">
        {projects.slice(0, 1).map((p) => (
          <span
            key={p.id}
            data-color={p.color}
            className="truncate rounded px-1 py-[1px] text-[10px] font-semibold"
            style={{
              background: 'color-mix(in srgb, var(--pc) 22%, transparent)',
              color: 'var(--pc)',
            }}
          >
            <Icon name="flag" size={10} className="mr-0.5 inline" />
            {p.title}
          </span>
        ))}
        {tasks.slice(0, 3).map((t) => (
          <DayChip
            key={t.id}
            task={t}
            project={pmap.get(t.projectId)}
            isPreview={!!previewIds?.has(t.id)}
          />
        ))}
        {tasks.length > 3 && (
          <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>
            +{tasks.length - 3}
          </span>
        )}
      </div>
    </div>
  );
}

/** 날짜 칸에 놓인 항목 — 다른 날로 끌어다 옮길 수 있다 */
function DayChip({
  task,
  project,
  isPreview,
}: {
  task: Task;
  project: Project | undefined;
  isPreview: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { type: 'task' },
  });

  return (
    <span
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      data-color={project?.color}
      className="flex cursor-grab items-center gap-1 truncate rounded px-0.5 text-[10px] touch-manipulation"
      style={{
        color: task.status === 'done' ? 'var(--text-faint)' : 'var(--text-muted)',
        textDecoration: task.status === 'done' ? 'line-through' : 'none',
        opacity: isDragging ? 0.3 : 1,
        border: isPreview ? '1px dashed var(--accent)' : '1px solid transparent',
      }}
      title={task.title}
    >
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: 'var(--pc, var(--accent))' }}
        aria-hidden
      />
      <span className="truncate">{task.title}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* 미배치 트레이 + 역산 배치                                            */
/* ------------------------------------------------------------------ */

function PlanTray({
  tasks,
  pmap,
  projects,
  selectedProjectId,
  onSelectProject,
  planProject,
  remaining,
  planTargetCount,
  previewActive,
  onRun,
  onEditProject,
}: {
  tasks: Task[];
  pmap: Map<string, Project>;
  projects: Project[];
  selectedProjectId: string | null;
  onSelectProject: (id: string | null) => void;
  planProject: Project | undefined;
  remaining: number | null;
  planTargetCount: number;
  previewActive: boolean;
  onRun: () => void;
  onEditProject: (p: Project) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: 'plan-tray', data: { type: 'tray' } });

  const canRun = !!planProject?.dueDate && planTargetCount > 0 && !previewActive;

  return (
    <div
      ref={setNodeRef}
      className="flex min-h-0 flex-col overflow-hidden rounded-xl border p-3 transition-colors"
      style={{
        borderColor: isOver ? 'var(--accent)' : 'var(--border)',
        background: 'var(--bg-elevated)',
        boxShadow: 'var(--shadow)',
      }}
    >
      {/* 무엇을 계획할지 고르는 곳 — 트레이 바로 위에 둬야 연결이 보인다 */}
      <div className="mb-3">
        <label
          className="mb-1.5 block text-[11px] font-semibold"
          style={{ color: 'var(--text-muted)' }}
          htmlFor="plan-project-select"
        >
          계획할 큰 과업
        </label>

        {projects.length === 0 ? (
          <p className="text-[12px]" style={{ color: 'var(--text-faint)' }}>
            아직 큰 과업이 없어요. 먼저 하나 만들어주세요.
          </p>
        ) : (
          <select
            id="plan-project-select"
            value={selectedProjectId ?? ''}
            onChange={(e) => onSelectProject(e.target.value || null)}
            className="w-full appearance-none rounded-lg border bg-no-repeat px-2.5 py-2 text-[13px] outline-none"
            style={{
              backgroundColor: 'var(--surface)',
              borderColor: planProject ? 'var(--accent)' : 'var(--border)',
              color: 'var(--text)',
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1.5 6 6.5 11 1.5' fill='none' stroke='%239b9b9b' stroke-width='1.6' stroke-linecap='round'/%3E%3C/svg%3E\")",
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 10px center',
              paddingRight: '30px',
            }}
          >
            <option value="">전체 보기 (계획 안 함)</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        )}

        {planProject && (
          <p className="mt-1.5 text-[11.5px]" style={{ color: 'var(--text-faint)' }}>
            {planProject.dueDate ? (
              <>
                마감 {formatKorean(planProject.dueDate)} ·{' '}
                <span
                  style={{
                    color:
                      remaining !== null && remaining < 0 ? 'var(--p-red)' : 'var(--text-muted)',
                  }}
                >
                  {remaining === null
                    ? ''
                    : remaining < 0
                      ? `${-remaining}일 지남`
                      : remaining === 0
                        ? '오늘이 마감'
                        : `${remaining}일 남음`}
                </span>
              </>
            ) : (
              '마감일 없음'
            )}
          </p>
        )}
      </div>

      <div
        className="mb-2 flex items-center gap-2 border-t pt-2.5"
        style={{ borderColor: 'var(--border)' }}
      >
        <h3 className="text-[13px] font-semibold">아직 날짜 없음</h3>
        <span className="text-[12px]" style={{ color: 'var(--text-faint)' }}>
          {tasks.length}
        </span>
        <span className="ml-auto text-[11px]" style={{ color: 'var(--text-faint)' }}>
          끌어서 날짜에 놓기
        </span>
      </div>

      {tasks.length > 0 ? (
        <div className="thin-scroll flex min-h-0 max-h-52 flex-1 flex-col gap-1 overflow-y-auto">
          {tasks.map((t, i) => (
            <TrayItem key={t.id} task={t} project={pmap.get(t.projectId)} index={i + 1} />
          ))}
        </div>
      ) : (
        <p className="py-4 text-center text-[12px]" style={{ color: 'var(--text-faint)' }}>
          {isOver
            ? '여기 놓으면 날짜가 지워져요'
            : planProject
              ? '이 과업의 할 일에는 모두 날짜가 있어요'
              : '모든 할 일에 날짜가 있어요'}
        </p>
      )}

      <div
        className="mt-2.5 shrink-0 border-t pt-2.5"
        style={{ borderColor: 'var(--border)' }}
      >
        <button
          type="button"
          disabled={!canRun}
          onClick={onRun}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-opacity disabled:opacity-40"
          style={{
            background: canRun ? 'var(--accent)' : 'var(--surface)',
            color: canRun ? 'var(--accent-contrast)' : 'var(--text-faint)',
          }}
        >
          <Icon name="rewind" size={14} /> 역산 배치
          {canRun && ` ${planTargetCount}개`}
        </button>

        <p className="mt-1.5 text-[11px] leading-snug" style={{ color: 'var(--text-faint)' }}>
          {projects.length === 0 ? (
            '큰 과업을 만들고 그 아래에 할 일을 넣으면 역산할 수 있어요.'
          ) : !planProject ? (
            '큰 과업을 고르면 그 과업의 할 일만 남고, 마감일에서 거꾸로 날짜를 나눠줘요.'
          ) : !planProject.dueDate ? (
            <>
              <button
                type="button"
                onClick={() => onEditProject(planProject)}
                className="underline"
                style={{ color: 'var(--accent)' }}
              >
                이 과업의 마감일
              </button>
              을 먼저 정해야 역산할 수 있어요.
            </>
          ) : previewActive ? (
            '미리보기를 확정하거나 취소한 뒤 다시 배치할 수 있어요.'
          ) : planTargetCount === 0 ? (
            '이 과업의 할 일에는 이미 모두 날짜가 있어요.'
          ) : (
            '마감일에서 거꾸로, 순서를 지켜 남은 날에 나눠 놓아요. 주말도 포함합니다.'
          )}
        </p>
      </div>
    </div>
  );
}

function TrayItem({
  task,
  project,
  index,
}: {
  task: Task;
  project: Project | undefined;
  index: number;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { type: 'task' },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      data-color={project?.color}
      className="flex cursor-grab items-center gap-2 rounded-lg border px-2 py-1.5 text-[12.5px] touch-manipulation"
      style={{
        background: 'var(--surface)',
        borderColor: 'var(--border)',
        opacity: isDragging ? 0.35 : 1,
      }}
      title={`${project?.title ?? ''} · ${task.title}`}
    >
      <span className="w-4 shrink-0 text-right text-[11px]" style={{ color: 'var(--text-faint)' }}>
        {index}
      </span>
      <span
        className="h-3 w-1 shrink-0 rounded-full"
        style={{ background: 'var(--pc, var(--accent))' }}
        aria-hidden
      />
      <span className="truncate">{task.title}</span>
    </div>
  );
}

function NavButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="tap-44 flex h-8 w-8 items-center justify-center rounded-md border transition-colors"
      style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
    >
      {children}
    </button>
  );
}
