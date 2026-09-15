import React from 'react';

export type SettingsCategory = 'appearance' | 'typography' | 'content' | 'editor' | 'publishing';

interface Props {
  category: SettingsCategory;
}

const iconPaths: Record<SettingsCategory, React.ReactNode> = {
  appearance: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41" />
    </>
  ),
  typography: <path d="M4 7V4h16v3M9 20h6M12 4v16" />,
  content: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M8 3v18M8 9h13" />
    </>
  ),
  editor: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M7 9h.01M11 9h.01M15 9h.01M19 9h.01M8 13h8M10 16h4" />
    </>
  ),
  publishing: (
    <>
      <path d="M12 16V4M7 9l5-5 5 5" />
      <path d="M5 20h14" />
    </>
  ),
};

const SettingsCategoryIcon: React.FC<Props> = ({ category }) => (
  <svg
    className="settings-category-icon"
    width="17"
    height="17"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {iconPaths[category]}
  </svg>
);

export default SettingsCategoryIcon;
