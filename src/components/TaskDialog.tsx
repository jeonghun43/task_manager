'use client';

import { useMemo, useState } from 'react';
import {
  PRIORITY_ICON,
  PRIORITY_LABEL,
  PRIORITY_ORDER,
  STATUS_LABEL,
  STATUS_ORDER,
} from '@/lib/constants';
import { useAppStore } from '@/store/useAppStore';
import type { Priority, Status, Task } from '@/lib/types';
import Modal from './ui/Modal';
import { Button, DateInput, Field, Select, TextArea, TextInput } from './ui/Field';

interface Props {
  open: boolean;
  /** 편집할 할 일. null 이면 새로 만들기 */
  task: Task | null;
  /** 새로 만들 때 기본 소속 */
  defaultProjectId?: string;
  onClose: () => void;
}

/** 열릴 때마다 새로 마운트해 초기값을 잡는다 (효과로 폼 상태를 되돌리지 않는다) */
export default function TaskDialog({ open, task, defaultProjectId, onClose }: Props) {
  if (!open) return null;
  return (
    <TaskForm
      key={task?.id ?? `new:${defaultProjectId ?? ''}`}
      task={task}
      defaultProjectId={defaultProjectId}
      onClose={onClose}
    />
  );
}

function TaskForm({ task, defaultProjectId, onClose }: Omit<Props, 'open'>) {
  const projects = useAppStore((s) => s.projects);
  const addTask = useAppStore((s) => s.addTask);
  const updateTask = useAppStore((s) => s.updateTask);
  const moveTask = useAppStore((s) => s.moveTask);

  const sorted = useMemo(() => [...projects].sort((a, b) => a.order - b.order), [projects]);

  const [projectId, setProjectId] = useState(
    () => task?.projectId ?? defaultProjectId ?? sorted[0]?.id ?? '',
  );
  const [title, setTitle] = useState(task?.title ?? '');
  const [notes, setNotes] = useState(task?.notes ?? '');
  const [status, setStatus] = useState<Status>(task?.status ?? 'todo');
  const [dueDate, setDueDate] = useState<string | undefined>(task?.dueDate);
  /** null = 상속 (spec.md §4) */
  const [priority, setPriority] = useState<Priority | null>(task?.priority ?? null);

  const parent = sorted.find((p) => p.id === projectId);
  const inheritedPriority = parent?.priority ?? 'medium';

  const submit = () => {
    const clean = title.trim();
    if (!clean || !projectId) return;

    if (task) {
      updateTask(task.id, { title: clean, notes: notes.trim() || undefined, status, dueDate, priority });
      if (task.projectId !== projectId) moveTask(task.id, projectId);
    } else {
      addTask(projectId, clean, { notes: notes.trim() || undefined, status, dueDate, priority });
    }
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={task ? '할 일 편집' : '새 할 일'}
      footer={
        <>
          <Button onClick={onClose}>취소</Button>
          <Button variant="primary" onClick={submit} disabled={!title.trim() || !projectId}>
            {task ? '저장' : '추가'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="소속 큰 과업">
          <Select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            {sorted.length === 0 && <option value="">먼저 큰 과업을 만들어주세요</option>}
            {sorted.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="제목">
          <TextInput
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="실제로 착수할 수 있는 단위로 적어주세요"
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
          />
        </Field>

        <Field label="메모">
          <TextArea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="선택 사항"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="상태">
            <Select value={status} onChange={(e) => setStatus(e.target.value as Status)}>
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="마감일">
            <DateInput value={dueDate} onChange={setDueDate} />
          </Field>
        </div>

        {/* 우선순위 — 상속 / 개별 지정 (FR-2.5, AC-4, AC-5) */}
        <div>
          <span className="mb-1.5 block text-[12px] font-medium" style={{ color: 'var(--text-muted)' }}>
            우선순위
          </span>
          <div
            className="rounded-lg border p-3"
            style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
          >
            <label className="flex cursor-pointer items-start gap-2.5">
              <input
                type="radio"
                className="mt-0.5 accent-[var(--accent)]"
                checked={priority === null}
                onChange={() => setPriority(null)}
              />
              <span className="text-[13px]">
                <span className="font-medium">큰 과업 따라가기</span>
                <span className="ml-1.5" style={{ color: 'var(--text-muted)' }}>
                  현재 {PRIORITY_ICON[inheritedPriority]} {PRIORITY_LABEL[inheritedPriority]}
                </span>
                <span className="mt-0.5 block text-[11px]" style={{ color: 'var(--text-faint)' }}>
                  큰 과업의 우선순위를 바꾸면 이 할 일도 함께 바뀌어요
                </span>
              </span>
            </label>

            <label className="mt-2.5 flex cursor-pointer items-center gap-2.5">
              <input
                type="radio"
                className="accent-[var(--accent)]"
                checked={priority !== null}
                onChange={() => setPriority(inheritedPriority)}
              />
              <span className="text-[13px] font-medium">직접 지정</span>
              <Select
                value={priority ?? inheritedPriority}
                disabled={priority === null}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="!w-auto"
                style={{ opacity: priority === null ? 0.45 : 1 }}
              >
                {PRIORITY_ORDER.map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_LABEL[p]}
                  </option>
                ))}
              </Select>
            </label>
          </div>
        </div>
      </div>
    </Modal>
  );
}
