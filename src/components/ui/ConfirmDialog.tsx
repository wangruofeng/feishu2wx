import React, { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import Button from './Button';
import './ConfirmDialog.css';

interface ConfirmDialogProps {
  message: string;
  onResult: (confirmed: boolean) => void;
}

/** 使用浏览器模态层管理焦点和背景隔离，外观统一由项目 token 控制。 */
export function ConfirmDialog({ message, onResult }: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    dialog?.showModal();
    cancelRef.current?.focus();
    return () => {
      dialog?.close();
      if (previous?.isConnected) previous.focus();
    };
  }, []);

  return (
    <dialog ref={dialogRef} className="confirm-dialog" aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-message" onCancel={(event) => {
        event.preventDefault();
        onResult(false);
      }} onKeyDown={(event) => event.stopPropagation()}>
      <h2 id="confirm-dialog-title">确认操作</h2>
      <p id="confirm-dialog-message">{message}</p>
      <div className="confirm-dialog-actions">
        <Button ref={cancelRef} variant="editorToolbar" className="confirm-dialog-button" onClick={() => onResult(false)}>取消</Button>
        <Button variant="editorToolbar" className="confirm-dialog-button confirm-dialog-button--confirm" onClick={() => onResult(true)}>确认</Button>
      </div>
    </dialog>
  );
}

let pending: Promise<boolean> | null = null;

/** 弹窗打开期间拒绝重复请求，只有明确点击确认才执行操作。 */
export function confirmAction(message: string): Promise<boolean> {
  if (pending) return Promise.resolve(false);
  const host = document.createElement('div');
  (document.querySelector('.app') ?? document.body).appendChild(host);
  const root = createRoot(host);
  pending = new Promise<boolean>((resolve) => {
    let settled = false;
    root.render(<ConfirmDialog message={message} onResult={(confirmed) => {
      if (settled) return;
      settled = true;
      root.unmount();
      host.remove();
      pending = null;
      resolve(confirmed);
    }} />);
  });
  return pending;
}
