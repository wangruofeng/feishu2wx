import React from 'react';

export type WorkspaceMode = 'editor' | 'preview';

interface Props {
  mode: WorkspaceMode;
}

/** 工作区显示模式图标：矩形代表保留的窗格（编辑在左、预览在右），细竖线代表收起的另一侧 */
const WorkspaceModeIcon: React.FC<Props> = ({ mode }) => (
  <svg
    className="workspace-mode-icon"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {mode === 'editor' ? (
      <>
        <rect x="3.5" y="5" width="12" height="14" rx="2" />
        <path d="M19.5 7.5v9" />
      </>
    ) : (
      <>
        <path d="M4.5 7.5v9" />
        <rect x="8.5" y="5" width="12" height="14" rx="2" />
      </>
    )}
  </svg>
);

export default WorkspaceModeIcon;
