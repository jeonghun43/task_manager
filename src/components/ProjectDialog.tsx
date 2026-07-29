'use client';

import { useState } from 'react';
import {
  PRIORITY_LABEL,
  PRIORITY_ORDER,
  PROJECT_COLORS,
  PROJECT_COLOR_LABEL,
  STATUS_LABEL,
  STATUS_ORDER,
} from '@/lib/constants';
import { useAppStore } from '@/store/useAppStore';
import type { Priority, Project, ProjectColor, Status } from '@/lib/types';
import Modal from './ui/Modal';
import { Button, DateInput, Field, Select, TextArea, TextInput } from './ui/Field';

interface Props {
  open: boolean;
  /** null 이면 새로 만들기 */
  project: Project | null;
  onClose: () => void;
}

/**
 * 열릴 때마다 새로 마운트해 초기값을 잡는다 (아래 key 참고).
 * 효과로 폼 상태를 되돌리지 않으므로 값이 어긋날 여지가 없다.
 */
export default function ProjectDialog({ open, project, onClose }: Props) {
  if (!open) return null;
  return <ProjectForm key={project?.id ?? 'new'} project={project} onClose={onClose} />;
}

function ProjectForm({ project, onClose }: Omit<Props, 'open'>) {
  const addProject = useAppStore((s) => s.addProject);
  const updateProject = useAppStore((s) => s.updateProject);

  const [title, setTitle] = useState(project?.title ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [status, setStatus] = useState<Status>(project?.status ?? 'todo');
  const [priority, setPriority] = useState<Priority>(project?.priority ?? 'medium');
  const [dueDate, setDueDate] = useState<string | undefined>(project?.dueDate);
  const [color, setColor] = useState<ProjectColor>(project?.color ?? PROJECT_COLORS[0]);

  const submit = () => {
    const clean = title.trim();
    if (!clean) return;
    if (project) {
      updateProject(project.id, {
        title: clean,
        description: description.trim() || undefined,
        status,
        priority,
        dueDate,
        color,
      });
    } else {
      addProject({
        title: clean,
        description: description.trim() || undefined,
        status,
        priority,
        dueDate,
        color,
      });
    }
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={project ? '큰 과업 편집' : '새 큰 과업'}
      footer={
        <>
          <Button onClick={onClose}>취소</Button>
          <Button variant="primary" onClick={submit} disabled={!title.trim()}>
            {project ? '저장' : '만들기'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="제목" hint={project ? undefined : '예: 포트폴리오 사이트 만들기'}>
          <TextInput
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="달성하려는 목표를 적어주세요"
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
          />
        </Field>

        <Field label="설명">
          <TextArea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
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

          <Field label="우선순위" hint="상속받는 할 일에 함께 적용돼요">
            <Select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
              {PRIORITY_ORDER.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABEL[p]}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="마감일">
          <DateInput value={dueDate} onChange={setDueDate} />
        </Field>

        <Field label="색상" hint="모든 화면에서 이 과업을 알아보는 표식이 돼요">
          <div className="flex flex-wrap gap-2">
            {PROJECT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                data-color={c}
                aria-label={PROJECT_COLOR_LABEL[c]}
                aria-pressed={color === c}
                onClick={() => setColor(c)}
                className="h-7 w-7 rounded-full transition-transform"
                style={{
                  background: 'var(--pc)',
                  outline: color === c ? '2px solid var(--text)' : 'none',
                  outlineOffset: '2px',
                  transform: color === c ? 'scale(1.06)' : 'none',
                }}
              />
            ))}
          </div>
        </Field>
      </div>
    </Modal>
  );
}
