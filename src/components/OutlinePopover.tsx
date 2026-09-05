import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { OutlineItem } from '../utils/outline';
import './OutlinePopover.css';

interface Props {
  open: boolean;
  items: OutlineItem[];
  /** 浮层 fixed 定位（由调用方按锚点计算） */
  position: { top: number; left: number };
  /** top：悬于锚点上方（编辑器底栏按钮）；bottom：垂于锚点下方（顶栏按钮） */
  placement?: 'top' | 'bottom';
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onSelect: (item: OutlineItem, index: number) => void;
}

/** 文章大纲浮层（编辑器底栏与全屏预览顶栏共用）：portal 进 .app 根节点继承暗黑/自定义主题 token */
const OutlinePopover: React.FC<Props> = ({
  open,
  items,
  position,
  placement = 'top',
  anchorRef,
  onClose,
  onSelect,
}) => {
  const popRef = useRef<HTMLDivElement>(null);

  // 点击浮层与锚点按钮之外关闭
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

  // Esc 关闭（先于 App 全屏态的 Esc 退出全屏生效）
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const appRoot = anchorRef.current?.closest('.app');
  const target = appRoot instanceof HTMLElement ? appRoot : document.body;

  return createPortal(
    <div
      ref={popRef}
      className="outline-pop"
      data-placement={placement}
      role="dialog"
      aria-label="文章大纲"
      style={{ position: 'fixed', top: position.top, left: position.left }}
    >
      <div className="outline-pop-header">
        <span>文章大纲</span>
        <button type="button" className="outline-pop-close" onClick={onClose} aria-label="关闭">&times;</button>
      </div>
      <div className="outline-pop-body">
        {items.length === 0 ? (
          <div className="outline-pop-empty">未发现标题（H1-H3）</div>
        ) : (
          <ul className="outline-pop-list">
            {items.map((item, idx) => (
              <li key={`${item.pos}-${idx}`} className={`outline-pop-item outline-pop-level-${item.level}`}>
                <button type="button" onClick={() => onSelect(item, idx)} title={item.text}>
                  <span className="outline-pop-text">{item.text}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>,
    target
  );
};

export default OutlinePopover;
