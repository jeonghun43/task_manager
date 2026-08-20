'use client';

import { useRef, useState } from 'react';
import { PRIORITY_ICON, PRIORITY_LABEL, PRIORITY_ORDER } from '@/lib/constants';
import { isFilterActive, type TaskFilter } from '@/lib/derive';
import { todayStr } from '@/lib/date';
import { readStoredAuth } from '@/lib/supabase/client';
import { useAppStore } from '@/store/useAppStore';
import { useSyncStore } from '@/store/useSyncStore';
import { useToastStore } from '@/store/useToastStore';
import { useUiStore } from '@/store/useUiStore';
import type { Priority } from '@/lib/types';
import AccountButton from './AccountButton';
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

  const [searchOpen, setSearchOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [diagnosis, setDiagnosis] = useState<string | null>(null);
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

  /**
   * 동기화 진단 (FR-22).
   * "왜 로그인이 풀렸나" 는 브라우저 설정이나 origin 문제인 경우가 있어 코드로 못 고친다.
   * 대신 **어느 쪽인지 사용자가 알 수 있게** 사실만 보여준다.
   */
  const runDiagnosis = () => {
    const a = readStoredAuth();
    const state =
      syncState === 'synced'
        ? '연결됨'
        : syncState === 'paused'
          ? '동기화 대기 (사용자가 미룸)'
          : syncState === 'error'
            ? '연결 끊김'
            : '로그인 안 됨';

    setDiagnosis(
      [
        `상태: ${state}`,
        '',
        '로그인 유지 방식: localStorage (쿠키 아님)',
        `저장 키: ${a.key ?? '알 수 없음'}`,
        `저장된 로그인 정보: ${a.present ? '있음' : '없음'}`,
        `토큰 만료: ${a.expiresAt ? a.expiresAt.toLocaleString('ko-KR') : '알 수 없음'}`,
        `저장소 쓰기 가능: ${a.writable ? '예' : '아니오 — 이러면 탭을 닫는 순간 로그인이 날아갑니다'}`,
        `현재 주소: ${window.location.origin}`,
        '',
        '로그인이 자꾸 풀린다면:',
        '· "저장된 로그인 정보: 없음" 이면 → 브라우저가 종료 시 사이트 데이터를 지우고 있을 수 있어요.',
        '  (설정 → 개인정보 → 쿠키 및 사이트 데이터 → "종료 시 삭제" 확인)',
        '· 로그인할 때와 다시 열 때의 주소가 다르면 → 로그인 정보는 주소마다 따로 저장돼요.',
        '  (localhost 와 배포 주소는 서로 다른 저장소입니다)',
      ].join('\n'),
    );
  };

  const dataItems: MenuItem[] = [
    ...(syncConfigured
      ? ([
          { kind: 'header', label: '동기화' },
          {
            kind: 'item',
            label: '동기화 진단',
            icon: <Icon name="cloud" size={14} />,
            onSelect: runDiagnosis,
          },
          { kind: 'divider' },
        ] as MenuItem[])
      : []),
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
              title="검색"
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

        {/* 계정은 오른쪽 끝 — 거의 모든 앱의 관습이고, 상태를 상시 보여주는 자리다 (FR-18) */}
        <AccountButton />
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
        open={diagnosis !== null}
        title="동기화 진단"
        message={diagnosis ?? ''}
        danger={false}
        confirmLabel="닫기"
        showCancel={false}
        onConfirm={() => setDiagnosis(null)}
        onCancel={() => setDiagnosis(null)}
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
