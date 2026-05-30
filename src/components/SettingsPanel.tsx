import React, { useEffect, useRef, useState } from 'react';
import { CodeBlockStyle } from '../utils/markdownRenderer';
import WechatConfigDialog from './WechatConfigDialog';
import './SettingsPanel.css';

interface Props {
  font: string;
  setFont: (font: string) => void;
  showH1: boolean;
  onToggleH1: () => void;
  invertH1: boolean;
  onToggleInvertH1: () => void;
  alignH1Left: boolean;
  onToggleAlignH1Left: () => void;
  showHorizontalRule: boolean;
  onToggleHorizontalRule: () => void;
  tableShadow: boolean;
  onToggleTableShadow: () => void;
  imageBorderStyle: 'border' | 'shadow' | 'default';
  onToggleImageBorder: () => void;
  codeBlockStyle: CodeBlockStyle;
  onToggleCodeBlockStyle: () => void;
  isOpen: boolean;
  onClose: () => void;
  wechatConfigured: boolean;
  onSaveWechatConfig: (appId: string, appSecret: string) => Promise<{ success: boolean; error?: string }>;
  onDeleteWechatConfig: () => Promise<void>;
}

const fonts = [
  { key: 'default', name: '默认字体' },
  { key: 'microsoft-yahei', name: '微软雅黑' },
  { key: 'simsun', name: '宋体' },
  { key: 'simhei', name: '黑体' },
  { key: 'arial', name: 'Arial' },
  { key: 'helvetica', name: 'Helvetica' },
  { key: 'times', name: 'Times New Roman' },
  { key: 'georgia', name: 'Georgia' },
  { key: 'verdana', name: 'Verdana' },
  { key: 'courier', name: 'Courier New' },
  { key: 'roboto', name: 'Roboto' },
  { key: 'open-sans', name: 'Open Sans' },
  { key: 'lato', name: 'Lato' },
  { key: 'montserrat', name: 'Montserrat' },
  { key: 'raleway', name: 'Raleway' },
  { key: 'poppins', name: 'Poppins' },
];

const SettingsPanel: React.FC<Props> = ({
  font,
  setFont,
  showH1,
  onToggleH1,
  invertH1,
  onToggleInvertH1,
  alignH1Left,
  onToggleAlignH1Left,
  showHorizontalRule,
  onToggleHorizontalRule,
  tableShadow,
  onToggleTableShadow,
  imageBorderStyle,
  onToggleImageBorder,
  codeBlockStyle,
  onToggleCodeBlockStyle,
  isOpen,
  onClose,
  wechatConfigured,
  onSaveWechatConfig,
  onDeleteWechatConfig,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const [wechatDialogOpen, setWechatDialogOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // 延迟绑定，避免触发按钮的点击立刻关闭
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="settings-panel" ref={panelRef}>
      <div className="settings-section">
        <label className="settings-label">字体</label>
        <select
          className="settings-select"
          value={font}
          onChange={(e) => setFont(e.target.value)}
        >
          {fonts.map((f) => (
            <option key={f.key} value={f.key}>
              {f.name}
            </option>
          ))}
        </select>
      </div>

      <div className="settings-section">
        <label className="settings-label">H1 样式</label>
        <div className="settings-toggles">
          <button
            className={`settings-toggle ${showH1 ? 'active' : ''}`}
            onClick={onToggleH1}
          >
            H1 底线
          </button>
          <button
            className={`settings-toggle ${invertH1 ? 'active' : ''}`}
            onClick={onToggleInvertH1}
          >
            H1 反色
          </button>
          <button
            className={`settings-toggle ${alignH1Left ? 'active' : ''}`}
            onClick={onToggleAlignH1Left}
          >
            {alignH1Left ? 'H1 左对齐' : 'H1 居中'}
          </button>
        </div>
      </div>

      <div className="settings-section">
        <label className="settings-label">分割线</label>
        <button
          className={`settings-toggle ${showHorizontalRule ? 'active' : ''}`}
          onClick={onToggleHorizontalRule}
        >
          {showHorizontalRule ? '显示' : '隐藏'}
        </button>
      </div>

      <div className="settings-section">
        <label className="settings-label">表格阴影</label>
        <button
          className={`settings-toggle ${tableShadow ? 'active' : ''}`}
          onClick={onToggleTableShadow}
        >
          {tableShadow ? '显示' : '隐藏'}
        </button>
      </div>

      <div className="settings-section">
        <label className="settings-label">图片模式</label>
        <div className="settings-toggles">
          <button
            className={`settings-toggle ${imageBorderStyle === 'default' ? 'active' : ''}`}
            onClick={imageBorderStyle !== 'default' ? onToggleImageBorder : undefined}
          >
            默认
          </button>
          <button
            className={`settings-toggle ${imageBorderStyle === 'border' ? 'active' : ''}`}
            onClick={imageBorderStyle !== 'border' ? onToggleImageBorder : undefined}
          >
            边框
          </button>
          <button
            className={`settings-toggle ${imageBorderStyle === 'shadow' ? 'active' : ''}`}
            onClick={imageBorderStyle !== 'shadow' ? onToggleImageBorder : undefined}
          >
            阴影
          </button>
        </div>
      </div>

      <div className="settings-section">
        <label className="settings-label">代码块</label>
        <div className="settings-toggles">
          <button
            className={`settings-toggle ${codeBlockStyle === 'classic' ? 'active' : ''}`}
            onClick={codeBlockStyle === 'modern' ? onToggleCodeBlockStyle : undefined}
          >
            极简
          </button>
          <button
            className={`settings-toggle ${codeBlockStyle === 'modern' ? 'active' : ''}`}
            onClick={codeBlockStyle === 'classic' ? onToggleCodeBlockStyle : undefined}
          >
            现代
          </button>
        </div>
      </div>

      <div className="settings-divider" />

      <div className="settings-section">
        <label className="settings-label">公众号配置</label>
        <div className="wechat-config-status">
          {wechatConfigured && (
            <span className="wechat-config-badge wechat-config-badge--ok">已配置</span>
          )}
          <button
            className="wechat-config-btn"
            onClick={() => setWechatDialogOpen(true)}
          >
            {wechatConfigured ? '修改配置' : '去配置'}
          </button>
        </div>
      </div>

      <WechatConfigDialog
        open={wechatDialogOpen}
        configured={wechatConfigured}
        onClose={() => setWechatDialogOpen(false)}
        onSave={onSaveWechatConfig}
        onDelete={onDeleteWechatConfig}
      />
    </div>
  );
};

export default SettingsPanel;
