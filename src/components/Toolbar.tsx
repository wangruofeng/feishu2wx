import React from 'react';
import { CodeBlockStyle } from '../utils/markdownRenderer';
import exampleMd from '../data/example';
import './Toolbar.css';

interface Props {
  markdown: string;
  setMarkdown: (md: string) => void;
  onCopyToWeChat: () => void;
  isCopying: boolean;
  showH1: boolean;
  onToggleH1: () => void;
  invertH1: boolean;
  onToggleInvertH1: () => void;
  imageBorderStyle: 'border' | 'shadow';
  onToggleImageBorder: () => void;
  codeBlockStyle: CodeBlockStyle;
  onToggleCodeBlockStyle: () => void;
  showHorizontalRule: boolean;
  onToggleHorizontalRule: () => void;
}

const Toolbar: React.FC<Props> = ({ markdown, setMarkdown, onCopyToWeChat, isCopying, showH1, onToggleH1, invertH1, onToggleInvertH1, imageBorderStyle, onToggleImageBorder, codeBlockStyle, onToggleCodeBlockStyle, showHorizontalRule, onToggleHorizontalRule }) => {
  const handleClear = () => {
    if (window.confirm('确定要清空所有内容吗？')) {
      setMarkdown('');
    }
  };

  const handleLoadExample = () => {
    setMarkdown(exampleMd);
  };

  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <button className="toolbar-btn" onClick={handleLoadExample}>
          📄 加载示例
        </button>
        <button className="toolbar-btn" onClick={handleClear}>
          🗑️ 清空
        </button>
        <button
          className="toolbar-btn"
          onClick={onToggleH1}
          title={showH1 ? '隐藏 H1 底部横线' : '显示 H1 底部横线'}
        >
          {showH1 ? '👁️ 隐藏 H1 底线' : '📝 显示 H1 底线'}
        </button>
        <button
          className="toolbar-btn"
          onClick={onToggleInvertH1}
          title={invertH1 ? '关闭 H1 反显' : '开启 H1 反显'}
        >
          {invertH1 ? '🎛️ 关闭 H1 反显' : '🎨 开启 H1 反显'}
        </button>
        <button
          className="toolbar-btn"
          onClick={onToggleHorizontalRule}
          title={showHorizontalRule ? '隐藏分割线' : '显示分割线'}
        >
          {showHorizontalRule ? '➖ 隐藏分割线' : '➕ 显示分割线'}
        </button>
        <button
          className="toolbar-btn"
          onClick={onToggleImageBorder}
          title={imageBorderStyle === 'border' ? '切换为阴影模式' : '切换为边框模式'}
        >
          {imageBorderStyle === 'border' ? '🖼️ 边框模式' : '🌫️ 阴影模式'}
        </button>
        <button
          className="toolbar-btn"
          onClick={onToggleCodeBlockStyle}
          title={codeBlockStyle === 'classic' ? '切换为现代代码块样式' : '切换为极简代码块样式'}
        >
          {codeBlockStyle === 'classic' ? '💻 极简代码块' : '🎨 现代代码块'}
        </button>
      </div>
      <div className="toolbar-right">
        <button
          className="toolbar-btn toolbar-btn-primary"
          onClick={onCopyToWeChat}
          disabled={isCopying || !markdown.trim()}
        >
          {isCopying ? '⏳ 复制中...' : '📋 一键复制公众号'}
        </button>
      </div>
    </div>
  );
};

export default Toolbar;
