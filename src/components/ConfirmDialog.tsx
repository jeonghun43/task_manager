'use client';

import Modal from './ui/Modal';
import { Button } from './ui/Field';

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /**
   * 선택지가 셋인 경우(예: 저장 / 저장 안 함 / 취소)에만 쓴다.
   * 보통은 확인·취소 둘이면 충분하다.
   */
  secondaryLabel?: string;
  onSecondary?: () => void;
}

/** 파괴적 동작은 확인 없이 실행되지 않는다 (헌법 VI) */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = '삭제',
  danger = true,
  onConfirm,
  onCancel,
  secondaryLabel,
  onSecondary,
}: Props) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <>
          <Button onClick={onCancel}>취소</Button>
          {secondaryLabel && onSecondary && (
            <Button onClick={onSecondary}>{secondaryLabel}</Button>
          )}
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p
        className="whitespace-pre-line text-sm leading-relaxed"
        style={{ color: 'var(--text-muted)' }}
      >
        {message}
      </p>
    </Modal>
  );
}
