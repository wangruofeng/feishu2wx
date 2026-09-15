import React, { useEffect, useRef, useState } from 'react';
import { SavedArticleTheme } from '../utils/savedThemes';
import { THEME_PRESETS } from '../utils/themePresets';
import { Button } from './ui';
import SavedThemeMenu from './SavedThemeMenu';
import './ThemeSwitcher.css';

interface Props {
  theme: string;
  setTheme: (theme: string) => void;
  customThemeColor?: string;
  savedThemes: SavedArticleTheme[];
  onApplySavedTheme: (id: string) => void;
  onOpenPresetTheme: () => void;
  onOpenCustomTheme: () => void;
  customThemeOpen: boolean;
}

interface ThemeIconProps {
  color: string;
}

const ThemeIcon: React.FC<ThemeIconProps> = ({ color }) => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <circle cx="7" cy="7" r="6" fill={color} stroke={color} strokeWidth="1" />
  </svg>
);

const ChevronIcon = () => (
  <svg className="theme-entry-chevron" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m6 3.5 4.5 4.5L6 12.5" />
  </svg>
);

const ThemeSwitcher: React.FC<Props> = ({
  theme,
  setTheme,
  customThemeColor = '',
  savedThemes,
  onApplySavedTheme,
  onOpenPresetTheme,
  onOpenCustomTheme,
  customThemeOpen,
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const [presetOpen, setPresetOpen] = useState(false);

  useEffect(() => {
    if (!presetOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setPresetOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPresetOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [presetOpen]);

  return (
    <div className="theme-switcher" ref={rootRef}>
      <div className="theme-entry-wrap">
        <Button
          variant="themeOption"
          active={THEME_PRESETS.some((preset) => preset.key === theme)}
          className="preset-theme-trigger"
          aria-haspopup="menu"
          aria-expanded={presetOpen}
          aria-controls="preset-theme-menu"
          onClick={() => setPresetOpen((open) => {
            const nextOpen = !open;
            if (nextOpen) onOpenPresetTheme();
            return nextOpen;
          })}
        >
          <span className="theme-preset-dots" aria-hidden="true">
            {THEME_PRESETS.slice(0, 3).map((preset) => (
              <span key={preset.key} style={{ backgroundColor: preset.color }} />
            ))}
          </span>
          <span className="theme-name">预设主题色</span>
          <ChevronIcon />
        </Button>
        {presetOpen && (
          <div id="preset-theme-menu" className="preset-theme-menu" role="menu" aria-label="预设主题色">
            {THEME_PRESETS.map((preset) => (
              <button
                key={preset.key}
                type="button"
                role="menuitemradio"
                aria-checked={theme === preset.key}
                className={`preset-theme-item${theme === preset.key ? ' active' : ''}`}
                onClick={() => {
                  setTheme(preset.key);
                  setPresetOpen(false);
                }}
              >
                <ThemeIcon color={preset.color} />
                <span>{preset.name}</span>
                {theme === preset.key && <span className="preset-theme-check" aria-hidden="true">✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>
      <Button
        variant="themeOption"
        active={theme === 'custom'}
        className="custom-theme-trigger"
        aria-haspopup="dialog"
        aria-expanded={customThemeOpen}
        onClick={() => {
          setPresetOpen(false);
          onOpenCustomTheme();
        }}
      >
        <span className="custom-theme-swatch" style={{ backgroundColor: customThemeColor || '#7C3AED' }} aria-hidden="true" />
        <span className="theme-name">自定义主题</span>
        <ChevronIcon />
      </Button>
      <SavedThemeMenu themes={savedThemes} onApply={onApplySavedTheme} />
    </div>
  );
};

export default ThemeSwitcher;
