'use client';

import { useMemo } from 'react';
import { formatKorean, todayStr, weekdayKo } from '@/lib/date';
import { compareByPriority, filterTasks, projectMap, type TaskFilter } from '@/lib/derive';
import { useAppStore } from '@/store/useAppStore';
import { useToastStore } from '@/store/useToastStore';
import type { Task, ViewKey } from '@/lib/types';
import { StaticTaskCard } from '../TaskCard';
import Icon from '../ui/Icon';

interface Props {
  filter: TaskFilter;
  onEditTask: (task: Task) => void;
  onGoToView: (v: ViewKey) => void;
}

/**
 * 오늘 뷰 — 앱의 현관 (FR-9)
 *
 * 나머지 네 화면은 "내 일이 어떻게 생겼나"에 답한다.
 * 이 화면만이 "지금 뭐 하지"에 답한다. 그래서 기본 화면이다.
 */
export default function TodayView({ filter, onEditTask, onGoToView }: Props) {
  const projects = useAppStore((s) => s.projects);
  const tasks = useAppStore((s) => s.tasks);
  const setTaskDueDates = useAppStore((s) => s.setTaskDueDates);
  const loadSeed = useAppStore((s) => s.loadSeed);
  const restoreTasks = useAppStore((s) => s.restoreTasks);
  const showUndo = useToastStore((s) => s.showUndo);

  const today = todayStr();
  const pmap = useMemo(() => projectMap(projects), [projects]);

  const { overdue, dueToday, doneToday } = useMemo(() => {
    const visible = filterTasks(tasks, pmap, { ...filter, hideCompleted: false });
    const sort = (a: Task, b: Task) => compareByPriority(a, b, pmap);

    return {
      overdue: visible
        .filter((t) => t.status !== 'done' && t.dueDate && t.dueDate < today)
        .sort(sort),
      dueToday: visible
        .filter((t) => t.status !== 'done' && t.dueDate === today)
        .sort(sort),
      doneToday: visible.filter((t) => t.status === 'done' && t.dueDate === today),
    };
  }, [tasks, pmap, filter, today]);

  const pullOverdueToToday = () => {
    if (overdue.length === 0) return;
    const before = overdue.map((t) => ({ ...t }));
    setTaskDueDates(overdue.map((t) => ({ id: t.id, dueDate: today })));
    showUndo(`지난 ${overdue.length}개를 오늘로 옮겼어요`, () => restoreTasks(before));
  };

  const nothingPlanned = overdue.length === 0 && dueToday.length === 0;

  return (
    <div className="thin-scroll h-full overflow-y-auto px-4 pb-8">
      <div className="mx-auto max-w-2xl">
        {/* 오늘 날짜 + 남은 개수 */}
        <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="text-[17px] font-semibold">
            {formatKorean(today)} ({weekdayKo(today)})
          </h2>
          <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
            {dueToday.length === 0 && doneToday.length === 0
              ? '오늘 계획된 할 일이 없어요'
              : dueToday.length === 0
                ? `오늘 몫은 다 끝냈어요 · ${doneToday.length}개 완료`
                : `남은 ${dueToday.length}개 · 완료 ${doneToday.length}개`}
          </span>
        </div>

        {/* 지난 것 — 죄책감만 쌓지 않도록 해결 경로를 함께 준다 */}
        {overdue.length > 0 && (
          <section className="mb-5">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h3 className="text-[13px] font-semibold" style={{ color: 'var(--p-red)' }}>
                마감이 지난 {overdue.length}개
              </h3>
              <button
                type="button"
                onClick={pullOverdueToToday}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-opacity hover:opacity-85"
                style={{
                  background: 'color-mix(in srgb, var(--p-red) 14%, transparent)',
                  color: 'var(--p-red)',
                }}
              >
                <Icon name="arrow-right" size={13} />
                전부 오늘로 옮기기
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {overdue.map((t) => (
                <StaticTaskCard
                  key={t.id}
                  task={t}
                  project={pmap.get(t.projectId)}
                  showProject
                  onEdit={onEditTask}
                />
              ))}
            </div>
          </section>
        )}

        {/* 오늘 */}
        {dueToday.length > 0 && (
          <section className="mb-5">
            <h3 className="mb-2 text-[13px] font-semibold">오늘 할 일</h3>
            <div className="flex flex-col gap-2">
              {dueToday.map((t) => (
                <StaticTaskCard
                  key={t.id}
                  task={t}
                  project={pmap.get(t.projectId)}
                  showProject
                  onEdit={onEditTask}
                />
              ))}
            </div>
          </section>
        )}

        {/*
          아무 계획도 없을 때 — 다음 행동으로 안내한다.

          큰 과업이 아예 없는 경우와 있는데 날짜만 안 정한 경우는 다음 행동이 다르다.
          첫 실행에 샘플을 자동으로 만들지 않게 된 뒤로(FR-17) 처음 여는 화면이 바로 여기이므로,
          "과업이 없음" 쪽이 앱의 첫인사 노릇을 한다.
        */}
        {nothingPlanned && (
          <div
            className="rounded-xl border border-dashed px-5 py-8 text-center"
            style={{ borderColor: 'var(--border-strong)' }}
          >
            {projects.length === 0 ? (
              <>
                <p className="text-[14px] font-medium">아직 아무것도 없어요</p>
                <p
                  className="mx-auto mt-1.5 max-w-sm text-[12.5px] leading-relaxed"
                  style={{ color: 'var(--text-muted)' }}
                >
                  이루려는 목표를 <b>큰 과업</b>으로 만들고,
                  <br />
                  그 아래에 오늘 착수할 수 있는 <b>할 일</b>로 쪼개보세요.
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => onGoToView('project')}
                    className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-[13px] font-medium"
                    style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
                  >
                    <Icon name="plus" size={14} />첫 큰 과업 만들기
                  </button>
                  <button
                    type="button"
                    onClick={() => loadSeed()}
                    className="inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-[13px]"
                    style={{ borderColor: 'var(--border-strong)', color: 'var(--text-muted)' }}
                  >
                    <Icon name="sparkle" size={14} />
                    예시로 둘러보기
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-[14px] font-medium">오늘 할 일이 정해져 있지 않아요</p>
                <p
                  className="mx-auto mt-1.5 max-w-sm text-[12.5px] leading-relaxed"
                  style={{ color: 'var(--text-muted)' }}
                >
                  큰 과업의 마감일에서 거꾸로 날짜를 나누면
                  <br />
                  오늘 해야 할 몫이 여기에 나타나요.
                </p>
                <button
                  type="button"
                  onClick={() => onGoToView('calendar')}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-[13px] font-medium"
                  style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
                >
                  <Icon name="rewind" size={14} />
                  역산 배치하러 가기
                </button>
              </>
            )}
          </div>
        )}

        {/* 오늘 끝낸 것 */}
        {doneToday.length > 0 && (
          <section>
            <h3 className="mb-2 text-[13px] font-semibold" style={{ color: 'var(--status-done)' }}>
              오늘 끝낸 {doneToday.length}개
            </h3>
            <div className="flex flex-col gap-2">
              {doneToday.map((t) => (
                <StaticTaskCard
                  key={t.id}
                  task={t}
                  project={pmap.get(t.projectId)}
                  showProject
                  onEdit={onEditTask}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
