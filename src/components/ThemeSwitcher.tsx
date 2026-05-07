import React from 'react';
import './ThemeSwitcher.css';

interface Props {
  theme: string;
  setTheme: (theme: string) => void;
}

const themes = [
  { key: 'classic', name: '经典', icon: '📄' },
  { key: 'green', name: '绿意', icon: '🌿' },
  { key: 'purple', name: '紫色', icon: '💜' },
  { key: 'orange', name: '橙色', icon: '🧡' },
  { key: 'pink', name: '粉色', icon: '🌸' },
  { key: 'blue', name: '蓝色', icon: '💙' },
  { key: 'red', name: '红色', icon: '❤️' },
  { key: 'cyan', name: '青色', icon: '💎' },
];

const ThemeSwitcher: React.FC<Props> = ({ theme, setTheme }) => {
  return (
    <div className="theme-switcher">
      <span className="theme-label">主题：</span>
      <div className="theme-options">
        {themes.map((t) => (
          <button
            key={t.key}
            className={`theme-option ${theme === t.key ? 'active' : ''}`}
            onClick={() => setTheme(t.key)}
            title={t.name}
          >
            <span className="theme-icon">{t.icon}</span>
            <span className="theme-name">{t.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ThemeSwitcher;
