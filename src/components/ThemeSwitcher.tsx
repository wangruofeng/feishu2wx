import React from 'react';
import './ThemeSwitcher.css';

interface Props {
  theme: string;
  setTheme: (theme: string) => void;
}

interface ThemeIconProps {
  color: string;
}

const ThemeIcon: React.FC<ThemeIconProps> = ({ color }) => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <circle cx="7" cy="7" r="6" fill={color} stroke={color} strokeWidth="1" />
  </svg>
);

const themes = [
  { key: 'classic', name: '经典', icon: <ThemeIcon color="#555" /> },
  { key: 'orange', name: '橙色', icon: <ThemeIcon color="#EA580C" /> },
  { key: 'blue', name: '蓝色', icon: <ThemeIcon color="#0F4C81" /> },
  { key: 'teal', name: '青绿', icon: <ThemeIcon color="#0D9488" /> },
];

const ThemeSwitcher: React.FC<Props> = ({ theme, setTheme }) => {
  return (
    <div className="theme-switcher">
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
  );
};

export default ThemeSwitcher;