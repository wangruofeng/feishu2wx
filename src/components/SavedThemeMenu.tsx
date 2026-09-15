import React, { useEffect, useRef, useState } from 'react';
import { SavedArticleTheme } from '../utils/savedThemes';
import { Button } from './ui';
import './SavedThemeMenu.css';

interface Props {
  themes: SavedArticleTheme[];
  onApply: (id: string) => void;
}

const SavedThemeMenu: React.FC<Props> = ({ themes, onApply }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleMouseDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div className="saved-theme-menu" ref={rootRef}>
      <Button
        ref={buttonRef}
        variant="themeOption"
        className="saved-theme-menu-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        我的主题
        <span aria-hidden="true">⌄</span>
      </Button>
      {open && (
        <div className="saved-theme-menu-popover" role="menu" aria-label="我的主题">
          {themes.length === 0 ? (
            <span className="saved-theme-menu-empty">还没有保存的主题</span>
          ) : themes.map((theme) => (
            <button
              key={theme.id}
              type="button"
              role="menuitem"
              className="saved-theme-menu-item"
              title={theme.name}
              onClick={() => {
                onApply(theme.id);
                setOpen(false);
              }}
            >
              {theme.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SavedThemeMenu;
