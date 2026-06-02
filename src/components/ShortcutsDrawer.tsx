import React, { useEffect, useRef } from 'react';
import './ShortcutsDrawer.css';

interface Props {
  open: boolean;
  onClose: () => void;
}

interface ShortcutGroup {
  title: string;
  items: { keys: string[]; description: string }[];
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

const mod = isMac ? '⌘' : 'Ctrl';

const shortcutGroups: ShortcutGroup[] = [
  {
    title: '格式',
    items: [
      { keys: [mod, 'B'], description: '加粗 / 取消加粗' },
      { keys: [mod, 'I'], description: '斜体 / 取消斜体' },
      { keys: [mod, 'K'], description: '插入链接' },
      { keys: [mod, 'U'], description: '下划线 / 取消下划线' },
    ],
  },
  {
    title: '编辑',
    items: [
      { keys: [mod, 'Z'], description: '撤销' },
      { keys: [mod, '⇧', 'Z'], description: '重做' },
    ],
  },
  {
    title: '视图',
    items: [
      { keys: [mod, 'F'], description: '搜索' },
      { keys: ['⌥', 'E'], description: '编辑 / 预览' },
      { keys: ['Esc'], description: '退出全屏' },
    ],
  },
];

const ShortcutsDrawer: React.FC<Props> = ({ open, onClose }) => {
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // 点击遮罩关闭
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className={`shortcuts-overlay${open ? ' open' : ''}`}
      onClick={handleOverlayClick}
    >
      <div className={`shortcuts-drawer${open ? ' open' : ''}`} ref={drawerRef}>
        <div className="shortcuts-drawer-header">
          <h3>键盘快捷键</h3>
          <button className="shortcuts-close-btn" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4.646 4.646a.5.5 0 01.708 0L8 7.293l2.646-2.647a.5.5 0 01.708.708L8.707 8l2.647 2.646a.5.5 0 01-.708.708L8 8.707l-2.646 2.647a.5.5 0 01-.708-.708L7.293 8 4.646 5.354a.5.5 0 010-.708z" />
            </svg>
          </button>
        </div>
        <div className="shortcuts-drawer-body">
          {shortcutGroups.map((group) => (
            <div className="shortcut-group" key={group.title}>
              <div className="shortcut-group-title">{group.title}</div>
              {group.items.map((item) => (
                <div className="shortcut-item" key={item.description}>
                  <span className="shortcut-desc">{item.description}</span>
                  <span className="shortcut-keys">
                    {item.keys.map((key, i) => (
                      <React.Fragment key={key}>
                        {i > 0 && <span className="shortcut-plus">+</span>}
                        <kbd>{key}</kbd>
                      </React.Fragment>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ShortcutsDrawer;
