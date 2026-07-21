import React, { useEffect, useRef, useState } from 'react';
import { CodeBlockStyle } from '../utils/markdownRenderer';
import { MdSyntaxThemeKey } from '../utils/mdSourceHighlight';
import { Button } from './ui';
import WechatConfigDialog from './WechatConfigDialog';
import './SettingsPanel.css';

interface Props {
  font: string;
  setFont: (font: string) => void;
  shouldConvertPastedHtml: boolean;
  onToggleShouldConvertPastedHtml: () => void;
  showH1Underline: boolean;
  onToggleH1Underline: () => void;
  invertH1: boolean;
  onToggleInvertH1: () => void;
  alignH1Left: boolean;
  onToggleAlignH1Left: () => void;
  invertH2: boolean;
  onToggleInvertH2: () => void;
  alignH2Left: boolean;
  onToggleAlignH2Left: () => void;
  blockquoteBackgroundMode: 'none' | 'theme';
  onChangeBlockquoteBackgroundMode: (mode: 'none' | 'theme') => void;
  blockquoteColorMode: 'default' | 'theme';
  onChangeBlockquoteColorMode: (mode: 'default' | 'theme') => void;
  blockquoteHeightMode: 'loose' | 'compact';
  onChangeBlockquoteHeightMode: (mode: 'loose' | 'compact') => void;
  showHorizontalRule: boolean;
  onToggleHorizontalRule: () => void;
  showFrontMatter: boolean;
  onToggleShowFrontMatter: () => void;
  textAlignMode: 'left' | 'justify';
  onChangeTextAlignMode: (mode: 'left' | 'justify') => void;
  tableShadow: boolean;
  onToggleTableShadow: () => void;
  headerTemplate: string;
  setHeaderTemplate: (value: string) => void;
  footerTemplate: string;
  setFooterTemplate: (value: string) => void;
  imageBorderStyle: 'border' | 'shadow' | 'default';
  onChangeImageBorderStyle: (style: 'border' | 'shadow' | 'default') => void;
  imageBorderRadius: boolean;
  onToggleImageBorderRadius: () => void;
  codeBlockStyle: CodeBlockStyle;
  onToggleCodeBlockStyle: () => void;
  isOpen: boolean;
  onClose: () => void;
  wechatConfigured: boolean;
  wechatLinkAutoAdapt: boolean;
  onToggleWechatLinkAutoAdapt: () => void;
  onSaveWechatConfig: (appId: string, appSecret: string) => Promise<{ success: boolean; error?: string }>;
  onDeleteWechatConfig: () => Promise<void>;
  darkMode: 'system' | 'light' | 'dark';
  onDarkModeChange: (mode: 'system' | 'light' | 'dark') => void;
  syntaxTheme: MdSyntaxThemeKey;
  onChangeSyntaxTheme: (theme: MdSyntaxThemeKey) => void;
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
  { key: 'pingfang', name: '苹方' },
];

/** Toggle 开关：底层为 button，保留文字标签以确保文本可被测试查找 */
const ToggleSwitch: React.FC<{ label: string; checked: boolean; onClick: () => void }> = ({
  label,
  checked,
  onClick,
}) => (
  <div className="settings-row">
    <span className="settings-row-label">{label}</span>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className="settings-switch"
      onClick={onClick}
    >
      <span className="sr-only" style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}>
        {label}
      </span>
    </button>
  </div>
);

/** Markdown 模板编辑：textarea，填写即启用（空则不插入） */
const TemplateField: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}> = ({ label, value, onChange, placeholder }) => (
  <div className="settings-row settings-row--block">
    <span className="settings-row-label">{label}</span>
    <textarea
      className="settings-textarea"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={4}
      spellCheck={false}
    />
  </div>
);

const SettingsPanel: React.FC<Props> = ({
  font,
  setFont,
  shouldConvertPastedHtml,
  onToggleShouldConvertPastedHtml,
  showH1Underline,
  onToggleH1Underline,
  invertH1,
  onToggleInvertH1,
  alignH1Left,
  onToggleAlignH1Left,
  invertH2,
  onToggleInvertH2,
  alignH2Left,
  onToggleAlignH2Left,
  showHorizontalRule,
  onToggleHorizontalRule,
  showFrontMatter,
  onToggleShowFrontMatter,
  textAlignMode,
  onChangeTextAlignMode,
  blockquoteBackgroundMode,
  onChangeBlockquoteBackgroundMode,
  blockquoteColorMode,
  onChangeBlockquoteColorMode,
  blockquoteHeightMode,
  onChangeBlockquoteHeightMode,
  tableShadow,
  onToggleTableShadow,
  headerTemplate,
  setHeaderTemplate,
  footerTemplate,
  setFooterTemplate,
  imageBorderStyle,
  onChangeImageBorderStyle,
  imageBorderRadius,
  onToggleImageBorderRadius,
  codeBlockStyle,
  onToggleCodeBlockStyle,
  isOpen,
  onClose,
  wechatConfigured,
  wechatLinkAutoAdapt,
  onToggleWechatLinkAutoAdapt,
  onSaveWechatConfig,
  onDeleteWechatConfig,
  darkMode,
  onDarkModeChange,
  syntaxTheme,
  onChangeSyntaxTheme,
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

      {/* ===== 通用 ===== */}
      <section className="settings-group">
        <h3 className="settings-group-title">通用</h3>
        <ToggleSwitch
          label="智能粘贴转换"
          checked={shouldConvertPastedHtml}
          onClick={onToggleShouldConvertPastedHtml}
        />
        {/* 源码配色：编辑器 Markdown 源码语法高亮配色方案 */}
        <div className="settings-row settings-row--block">
          <span className="settings-row-label">源码配色</span>
          <div className="settings-toggles">
            <Button
              variant="toggle"
              active={syntaxTheme === 'github'}
              onClick={() => onChangeSyntaxTheme('github')}
            >
              GitHub
            </Button>
            <Button
              variant="toggle"
              active={syntaxTheme === 'dracula'}
              onClick={() => onChangeSyntaxTheme('dracula')}
            >
              Dracula
            </Button>
            <Button
              variant="toggle"
              active={syntaxTheme === 'monokai'}
              onClick={() => onChangeSyntaxTheme('monokai')}
            >
              Monokai
            </Button>
            <Button
              variant="toggle"
              active={syntaxTheme === 'none'}
              onClick={() => onChangeSyntaxTheme('none')}
            >
              无
            </Button>
          </div>
        </div>
        {/* 主题模式：三选一 */}
        <div className="settings-row settings-row--block">
          <span className="settings-row-label">主题模式</span>
          <div className="settings-segmented">
            <button
              type="button"
              className={`settings-segmented-btn${darkMode === 'system' ? ' active' : ''}`}
              onClick={() => onDarkModeChange('system')}
            >
              跟随系统
            </button>
            <button
              type="button"
              className={`settings-segmented-btn${darkMode === 'light' ? ' active' : ''}`}
              onClick={() => onDarkModeChange('light')}
            >
              浅色
            </button>
            <button
              type="button"
              className={`settings-segmented-btn${darkMode === 'dark' ? ' active' : ''}`}
              onClick={() => onDarkModeChange('dark')}
            >
              深色
            </button>
          </div>
        </div>
      </section>

      {/* ===== 标题 ===== */}
      <section className="settings-group">
        <h3 className="settings-group-title">标题</h3>
        <ToggleSwitch label="H1 底线" checked={showH1Underline} onClick={onToggleH1Underline} />
        <ToggleSwitch label="H1 反色" checked={invertH1} onClick={onToggleInvertH1} />
        <ToggleSwitch
          label={alignH1Left ? 'H1 左对齐' : 'H1 居中'}
          checked={alignH1Left}
          onClick={onToggleAlignH1Left}
        />
        <ToggleSwitch label="H2 反色" checked={invertH2} onClick={onToggleInvertH2} />
        <ToggleSwitch
          label={alignH2Left ? 'H2 左对齐' : 'H2 居中'}
          checked={alignH2Left}
          onClick={onToggleAlignH2Left}
        />
      </section>

      {/* ===== 正文 ===== */}
      <section className="settings-group">
        <h3 className="settings-group-title">正文</h3>
        <div className="settings-row settings-row--block">
          <span className="settings-row-label">文本对齐</span>
          <div className="settings-toggles">
            <Button
              variant="toggle"
              active={textAlignMode === 'left'}
              onClick={() => onChangeTextAlignMode('left')}
            >
              左对齐
            </Button>
            <Button
              variant="toggle"
              active={textAlignMode === 'justify'}
              onClick={() => onChangeTextAlignMode('justify')}
            >
              两端对齐
            </Button>
          </div>
        </div>
        {/* 字体 */}
        <div className="settings-row settings-row--block">
          <span className="settings-row-label">字体</span>
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
        <ToggleSwitch label="分割线" checked={showHorizontalRule} onClick={onToggleHorizontalRule} />
        <ToggleSwitch label="元数据" checked={showFrontMatter} onClick={onToggleShowFrontMatter} />
        <ToggleSwitch label="表格阴影" checked={tableShadow} onClick={onToggleTableShadow} />
      </section>

      {/* ===== 引用块 ===== */}
      <section className="settings-group">
        <h3 className="settings-group-title">引用块</h3>
        <div className="settings-row settings-row--block">
          <span className="settings-row-label">背景</span>
          <div className="settings-toggles">
            <Button
              variant="toggle"
              active={blockquoteBackgroundMode === 'none'}
              onClick={() => onChangeBlockquoteBackgroundMode('none')}
            >
              无
            </Button>
            <Button
              variant="toggle"
              active={blockquoteBackgroundMode === 'theme'}
              onClick={() => onChangeBlockquoteBackgroundMode('theme')}
            >
              跟随主题
            </Button>
          </div>
        </div>
        <div className="settings-row settings-row--block">
          <span className="settings-row-label">边框色</span>
          <div className="settings-toggles">
            <Button
              variant="toggle"
              active={blockquoteColorMode === 'default'}
              onClick={() => onChangeBlockquoteColorMode('default')}
            >
              默认
            </Button>
            <Button
              variant="toggle"
              active={blockquoteColorMode === 'theme'}
              onClick={() => onChangeBlockquoteColorMode('theme')}
            >
              跟随主题
            </Button>
          </div>
        </div>
        <div className="settings-row settings-row--block">
          <span className="settings-row-label">间距</span>
          <div className="settings-toggles">
            <Button
              variant="toggle"
              active={blockquoteHeightMode === 'loose'}
              onClick={() => onChangeBlockquoteHeightMode('loose')}
            >
              宽松
            </Button>
            <Button
              variant="toggle"
              active={blockquoteHeightMode === 'compact'}
              onClick={() => onChangeBlockquoteHeightMode('compact')}
            >
              紧凑
            </Button>
          </div>
        </div>
      </section>

      {/* ===== 图片 ===== */}
      <section className="settings-group">
        <h3 className="settings-group-title">图片</h3>
        {/* 图片模式：独立选择 */}
        <div className="settings-row settings-row--block">
          <span className="settings-row-label">样式</span>
          <div className="settings-toggles">
            <Button
              variant="toggle"
              active={imageBorderStyle === 'default'}
              onClick={() => onChangeImageBorderStyle('default')}
            >
              默认
            </Button>
            <Button
              variant="toggle"
              active={imageBorderStyle === 'border'}
              onClick={() => onChangeImageBorderStyle('border')}
            >
              边框
            </Button>
            <Button
              variant="toggle"
              active={imageBorderStyle === 'shadow'}
              onClick={() => onChangeImageBorderStyle('shadow')}
            >
              阴影
            </Button>
          </div>
        </div>
        <ToggleSwitch label="圆角" checked={imageBorderRadius} onClick={onToggleImageBorderRadius} />
      </section>

      {/* ===== 代码块 ===== */}
      <section className="settings-group">
        <h3 className="settings-group-title">代码块</h3>
        {/* 二选一，保留循环 toggle */}
        <div className="settings-row settings-row--block">
          <span className="settings-row-label">样式</span>
          <div className="settings-toggles">
            <Button
              variant="toggle"
              active={codeBlockStyle === 'classic'}
              onClick={codeBlockStyle === 'modern' ? onToggleCodeBlockStyle : undefined}
            >
              极简
            </Button>
            <Button
              variant="toggle"
              active={codeBlockStyle === 'modern'}
              onClick={codeBlockStyle === 'classic' ? onToggleCodeBlockStyle : undefined}
            >
              现代
            </Button>
          </div>
        </div>
      </section>

      {/* ===== 模板 ===== */}
      <section className="settings-group">
        <h3 className="settings-group-title">模板</h3>
        <TemplateField
          label="文章首部片段"
          value={headerTemplate}
          onChange={setHeaderTemplate}
          placeholder="留空则不添加。支持 Markdown，会自动拼接到正文前"
        />
        <TemplateField
          label="文章尾部片段"
          value={footerTemplate}
          onChange={setFooterTemplate}
          placeholder="留空则不添加。支持 Markdown，会自动拼接到正文后"
        />
      </section>

      {/* ===== 公众号 ===== */}
      <section className="settings-group">
        <h3 className="settings-group-title">公众号</h3>
        <ToggleSwitch
          label="微信公众号链接自动适配"
          checked={wechatLinkAutoAdapt}
          onClick={onToggleWechatLinkAutoAdapt}
        />
        <div className="settings-config-row">
          <div className="settings-config-info">
            <span className="settings-config-name">草稿箱推送</span>
            {wechatConfigured ? (
              <span className="settings-config-badge settings-config-badge--ok">已配置</span>
            ) : (
              <span className="settings-config-badge settings-config-badge--empty">未配置</span>
            )}
          </div>
          <Button variant="wechatConfig" onClick={() => setWechatDialogOpen(true)}>
            {wechatConfigured ? '修改' : '去配置'}
          </Button>
        </div>
      </section>

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
