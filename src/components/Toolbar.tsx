'use client';

import { useRef, useState } from 'react';
import { PRIORITY_ICON, PRIORITY_LABEL, PRIORITY_ORDER } from '@/lib/constants';
import { isFilterActive, type TaskFilter } from '@/lib/derive';
import { todayStr } from '@/lib/date';
import { useAppStore } from '@/store/useAppStore';
import { useSyncStore } from '@/store/useSyncStore';
import { useToastStore } from '@/store/useToastStore';
import { useUiStore } from '@/store/useUiStore';
import type { Priority } from '@/lib/types';
import ConfirmDialog from './ConfirmDialog';
import Icon from './ui/Icon';
import Menu, { type MenuItem } from './ui/Menu';

interface Props {
  filter: TaskFilter;
  onNewProject: () => void;
  onNewTask: () => void;
}

export default function Toolbar({ filter, onNewProject, onNewTask }: Props) {
  const projects = useAppStore((s) => s.projects);
  const exportJson = useAppStore((s) => s.exportJson);
  const importJson = useAppStore((s) => s.importJson);
  const clearAll = useAppStore((s) => s.clearAll);
  const loadSeed = useAppStore((s) => s.loadSeed);

  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const search = useUiStore((s) => s.search);
  const setSearch = useUiStore((s) => s.setSearch);
  const setProjectFilter = useUiStore((s) => s.setProjectFilter);
  const setPriorityFilter = useUiStore((s) => s.setPriorityFilter);
  const setHideCompleted = useUiStore((s) => s.setHideCompleted);
  const resetFilters = useUiStore((s) => s.resetFilters);

  const syncConfigured = useSyncStore((s) => s.configured);
  const syncState = useSyncStore((s) => s.state);
  const syncEmail = useSyncStore((s) => s.email);
  const signIn = useSyncStore((s) => s.signIn);
  const signOut = useSyncStore((s) => s.signOut);

  const [searchOpen, setSearchOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const flash = useToastStore((s) => s.show);

  const doExport = () => {
    const blob = new Blob([exportJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `task-manager-${todayStr()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const doImport = async (file: File) => {
    const text = await file.text();
    const res = importJson(text);
    flash(res.message);
  };

  const filterItems: MenuItem[] = [
    { kind: 'header', label: '큰 과업' },
    {
      kind: 'item',
      label: '전체',
      checked: filter.projectId === null,
      onSelect: () => setProjectFilter(null),
    },
    ...[...projects]
      .sort((a, b) => a.order - b.order)
      .map<MenuItem>((p) => ({
        kind: 'item',
        label: p.title,
        checked: filter.projectId === p.id,
        onSelect: () => setProjectFilter(p.id),
      })),
    { kind: 'divider' },
    { kind: 'header', label: '우선순위' },
    {
      kind: 'item',
      label: '전체',
      checked: filter.priority === null,
      onSelect: () => setPriorityFilter(null),
    },
    ...PRIORITY_ORDER.map<MenuItem>((p) => ({
      kind: 'item',
      label: PRIORITY_LABEL[p],
      icon: <Icon name={PRIORITY_ICON[p]} size={14} />,
      checked: filter.priority === p,
      onSelect: () => setPriorityFilter(p as Priority),
    })),
    { kind: 'divider' },
    {
      kind: 'item',
      label: '완료 항목 숨기기',
      checked: filter.hideCompleted,
      onSelect: () => setHideCompleted(!filter.hideCompleted),
    },
    {
      kind: 'item',
      label: '필터 초기화',
      icon: <Icon name="reset" size={14} />,
      onSelect: resetFilters,
    },
  ];

  /*
   * 동기화 항목은 환경변수가 설정된 배포에서만 나타난다.
   * 설정하지 않은 채로도 앱은 지금까지처럼 이 기기 안에서 온전히 동작한다.
   */
  const syncItems: MenuItem[] = !syncConfigured
    ? []
    : [
        { kind: 'header', label: '동기화' },
        syncState === 'synced'
          ? {
              kind: 'item',
              label: `로그아웃 (${syncEmail ?? '연결됨'})`,
              icon: <Icon name="cloud-off" size={14} />,
              onSelect: () => void signOut(),
            }
          : {
              kind: 'item',
              label: syncState === 'connecting' ? '연결하는 중…' : '구글 로그인해서 기기 간 동기화',
              icon: <Icon name="cloud" size={14} />,
              onSelect: () => void signIn(),
            },
        { kind: 'divider' },
      ];

  const dataItems: MenuItem[] = [
    ...syncItems,
    { kind: 'header', label: '화면' },
    {
      kind: 'item',
      label: theme === 'dark' ? '라이트 모드' : '다크 모드',
      icon: <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={14} />,
      onSelect: toggleTheme,
    },
    { kind: 'divider' },
    { kind: 'header', label: '데이터' },
    {
      kind: 'item',
      label: 'JSON 내보내기',
      icon: <Icon name="download" size={14} />,
      onSelect: doExport,
    },
    {
      kind: 'item',
      label: 'JSON 가져오기',
      icon: <Icon name="upload" size={14} />,
      onSelect: () => fileRef.current?.click(),
    },
    {
      kind: 'item',
      label: '샘플 데이터 불러오기',
      icon: <Icon name="sparkle" size={14} />,
      onSelect: () => loadSeed(),
    },
    { kind: 'divider' },
    {
      kind: 'item',
      label: '전부 비우기',
      icon: <Icon name="trash" size={14} />,
      danger: true,
      onSelect: () => setConfirmClear(true),
    },
  ];

  const newItems: MenuItem[] = [
    { kind: 'item', label: '큰 과업', icon: <Icon name="board" size={14} />, onSelect: onNewProject },
    { kind: 'item', label: '할 일', icon: <Icon name="check" size={14} />, onSelect: onNewTask },
  ];

  return (
    <>
      <div className="flex items-center gap-1">
        {/* 검색 */}
        <div className="flex items-center">
          {searchOpen || search ? (
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onBlur={() => !search && setSearchOpen(false)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setSearch('');
                  setSearchOpen(false);
                }
              }}
              placeholder="검색"
              className="w-32 rounded-md border px-2.5 py-1.5 text-[13px] outline-none transition-all focus:w-44 sm:w-40 sm:focus:w-56"
              style={{
                background: 'var(--surface)',
                borderColor: 'var(--border)',
                color: 'var(--text)',
              }}
            />
          ) : (
            <button
              type="button"
              aria-label="검색"
              onClick={() => setSearchOpen(true)}
              className="tap-44 flex h-8 w-8 items-center justify-center rounded-md"
              style={{ color: 'var(--text-muted)' }}
            >
              <Icon name="search" />
            </button>
          )}
        </div>

        <Menu
          items={filterItems}
          label="필터"
          trigger={
            <span style={{ color: isFilterActive(filter) ? 'var(--accent)' : undefined }}>
              <Icon name="filter" />
            </span>
          }
        />

        <Menu items={dataItems} label="설정 및 데이터" trigger={<Icon name="settings" />} />

        <Menu
          items={newItems}
          label="새로 만들기"
          trigger={
            <span
              className="flex h-full w-full items-center justify-center rounded-md"
              style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
            >
              <Icon name="plus" />
            </span>
          }
        />
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void doImport(f);
          e.target.value = '';
        }}
      />

      <ConfirmDialog
        open={confirmClear}
        title="전부 비우기"
        message={'모든 큰 과업과 할 일이 삭제돼요.\n먼저 JSON 으로 내보내두는 걸 권해요.'}
        confirmLabel="전부 삭제"
        onCancel={() => setConfirmClear(false)}
        onConfirm={() => {
          clearAll();
          setConfirmClear(false);
        }}
      />
    </>
  );
}
