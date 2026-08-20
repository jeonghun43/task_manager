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
  /**
   * 읽기만 하는 안내창처럼 "취소" 라는 선택지가 없는 경우에 끈다.
   * 같은 일을 하는 버튼이 둘이면(취소 · 닫기) 무엇이 다른지 생각하게 만든다.
   */
  showCancel?: boolean;
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
  showCancel = true,
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
          {showCancel && <Button onClick={onCancel}>취소</Button>}
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
