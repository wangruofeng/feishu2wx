import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './ExportMenu.css';

export type ExportFormat = 'md' | 'html' | 'pdf';

interface Props {
  open: boolean;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onExport: (format: ExportFormat) => void;
}

const EXPORT_OPTIONS: { format: ExportFormat; label: string; hint: string; description: string }[] = [
  { format: 'md', label: 'Markdown', hint: '.md', description: '源码，可继续编辑' },
  { format: 'html', label: 'HTML', hint: '.html', description: '公众号内联样式' },
  { format: 'pdf', label: 'PDF', hint: '.pdf', description: '通过打印对话框另存' },
];

/** 顶栏「导出」下拉菜单，复用历史文档浮层的定位与点击外部关闭模式 */
const ExportMenu: React.FC<Props> = ({ open, anchorRef, onClose, onExport }) => {
  const [position, setPosition] = useState({ top: 0, left: 0, rightAligned: false });
  const popRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const menuWidth = 280;
    // 锚点右侧空间不足时右对齐，避免菜单溢出视口
    const rightAligned = window.innerWidth - rect.right < menuWidth;
    setPosition({
      top: rect.bottom + 6,
      left: rightAligned ? rect.right : rect.left,
      rightAligned,
    });
  }, [open, anchorRef]);

  // 点击菜单与锚点按钮之外关闭
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (popRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, anchorRef, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      ref={popRef}
      className="export-menu"
      role="menu"
      aria-label="导出格式"
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        transform: position.rightAligned ? 'translateX(-100%)' : undefined,
      }}
    >
      {EXPORT_OPTIONS.map((opt) => (
        <button
          key={opt.format}
          type="button"
          role="menuitem"
          className="export-menu-item"
          onClick={() => {
            onExport(opt.format);
            onClose();
          }}
        >
          <span className="export-menu-item-name">
            {opt.label}
            <span className="export-menu-item-hint">{opt.hint}</span>
          </span>
          <span className="export-menu-item-desc">{opt.description}</span>
        </button>
      ))}
    </div>,
    document.body
  );
};

export default ExportMenu;
