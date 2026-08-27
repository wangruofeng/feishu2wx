import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DocHistoryEntry, loadDocHistory, removeDocHistory, clearDocHistory } from '../utils/docHistory';
import './DocHistoryPopover.css';

interface Props {
  open: boolean;
  position: { top: number; left: number };
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onRestore: (entry: DocHistoryEntry) => void;
  /** 历史条数变化时通知父组件刷新按钮禁用态 */
  onCountChange: (count: number) => void;
}

/** 相对时间：刚刚 / N 分钟前 / N 小时前 / N 天前，超过 7 天显示日期 */
function formatRelativeTime(savedAt: number): string {
  const diff = Date.now() - savedAt;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return '刚刚';
  if (diff < hour) return `${Math.floor(diff / minute)} 分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`;
  if (diff < 7 * day) return `${Math.floor(diff / day)} 天前`;
  const d = new Date(savedAt);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const DocHistoryPopover: React.FC<Props> = ({ open, position, anchorRef, onClose, onRestore, onCountChange }) => {
  const [entries, setEntries] = useState<DocHistoryEntry[]>([]);
  const popRef = useRef<HTMLDivElement>(null);

  // 打开时从 localStorage 现读列表
  useEffect(() => {
    if (open) {
      setEntries(loadDocHistory());
    }
  }, [open]);

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

  const handleRemove = useCallback((id: string) => {
    const rest = removeDocHistory(id);
    setEntries(rest);
    onCountChange(rest.length);
  }, [onCountChange]);

  const handleClear = useCallback(() => {
    if (window.confirm('确定要清空全部历史文档吗？')) {
      clearDocHistory();
      setEntries([]);
      onCountChange(0);
    }
  }, [onCountChange]);

  const handleRestore = useCallback((entry: DocHistoryEntry) => {
    onRestore(entry);
    onClose();
  }, [onRestore, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      ref={popRef}
      className="doc-history-pop"
      role="dialog"
      aria-label="历史文档"
      style={{ position: 'fixed', top: position.top, left: position.left }}
    >
      <div className="doc-history-pop-header">
        <span>历史文档</span>
        <div className="doc-history-header-actions">
          {entries.length > 0 && (
            <button type="button" className="doc-history-clear" onClick={handleClear}>清空全部</button>
          )}
          <button type="button" className="doc-history-close" onClick={onClose} aria-label="关闭">&times;</button>
        </div>
      </div>
      <div className="doc-history-pop-body">
        {entries.length === 0 ? (
          <div className="doc-history-empty">暂无历史文档</div>
        ) : (
          <ul className="doc-history-list">
            {entries.map((entry) => (
              <li key={entry.id} className="doc-history-item">
                <button
                  type="button"
                  className="doc-history-restore"
                  onClick={() => handleRestore(entry)}
                  title={`${entry.title}（点击恢复）`}
                >
                  <span className="doc-history-title">{entry.title}</span>
                  <span className="doc-history-time">{formatRelativeTime(entry.savedAt)}</span>
                </button>
                <button
                  type="button"
                  className="doc-history-delete"
                  onClick={() => handleRemove(entry.id)}
                  aria-label={`删除 ${entry.title}`}
                  title="删除"
                >
                  &#128465;
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>,
    document.body
  );
};

export default DocHistoryPopover;
