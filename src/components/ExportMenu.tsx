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

/* Lucide 风格 16px 线性图标，与 GearIcon / AI 面板图标同一约定 */
const FileTextIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);

const CodeIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </svg>
);

const PrinterIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="6 9 6 2 18 2 18 9" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </svg>
);

const EXPORT_OPTIONS: { format: ExportFormat; label: string; hint: string; description: string; icon: React.FC }[] = [
  { format: 'md', label: 'Markdown', hint: '.md', description: '源码，可继续编辑', icon: FileTextIcon },
  { format: 'html', label: 'HTML', hint: '.html', description: '公众号内联样式', icon: CodeIcon },
  { format: 'pdf', label: 'PDF', hint: '.pdf', description: '通过打印对话框另存', icon: PrinterIcon },
];

const MENU_WIDTH = 280;

/** 顶栏「导出」下拉菜单：portal 进 .app 根节点（继承暗黑主题与自定义主题 token），支持方向键导航与 Esc 关闭 */
const ExportMenu: React.FC<Props> = ({ open, anchorRef, onClose, onExport }) => {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const popRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const anchor = anchorRef.current;
    if (!anchor) return;
    const appRoot = anchor.closest('.app');
    setPortalTarget(appRoot instanceof HTMLElement ? appRoot : document.body);
    const rect = anchor.getBoundingClientRect();
    // 锚点右侧空间不足时改为右缘对齐（用 left 定位而非 transform，避免与进场动画的 transform 冲突）
    const rightAligned = window.innerWidth - rect.right < MENU_WIDTH;
    setPosition({
      top: rect.bottom + 6,
      left: rightAligned ? rect.right - MENU_WIDTH : rect.left,
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

  // 键盘交互：Esc/Tab 关闭（Esc 后焦点回锚点按钮），↑↓/Home/End 在条目间移动，Enter/Space 由按钮原生触发
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Tab') {
        if (e.key === 'Escape') {
          e.preventDefault();
          anchorRef.current?.focus();
        }
        onClose();
        return;
      }
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End') return;
      e.preventDefault();
      const items = Array.from(popRef.current?.querySelectorAll<HTMLButtonElement>('.export-menu-item') ?? []);
      if (items.length === 0) return;
      const currentIndex = items.findIndex((el) => el === document.activeElement);
      let next: number;
      if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = items.length - 1;
      else if (currentIndex === -1) next = e.key === 'ArrowDown' ? 0 : items.length - 1;
      else next = (currentIndex + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      items[next].focus();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, anchorRef, onClose]);

  if (!open || !portalTarget) return null;

  return createPortal(
    <div
      ref={popRef}
      className="export-menu"
      role="menu"
      aria-label="导出格式"
      style={{ position: 'fixed', top: position.top, left: position.left }}
    >
      {EXPORT_OPTIONS.map((opt) => (
        <button
          key={opt.format}
          type="button"
          role="menuitem"
          className="export-menu-item"
          onClick={() => {
            anchorRef.current?.focus();
            onExport(opt.format);
            onClose();
          }}
        >
          <span className="export-menu-item-icon"><opt.icon /></span>
          <span className="export-menu-item-text">
            <span className="export-menu-item-name">{opt.label}</span>
            <span className="export-menu-item-desc">{opt.description}</span>
          </span>
          <span className="export-menu-item-hint">{opt.hint}</span>
        </button>
      ))}
    </div>,
    portalTarget
  );
};

export default ExportMenu;
