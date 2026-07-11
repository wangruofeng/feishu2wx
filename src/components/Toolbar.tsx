import React from 'react';
import { CodeBlockStyle } from '../utils/markdownRenderer';
import { Button } from './ui';
import exampleMd from '../data/example';
import './Toolbar.css';

interface Props {
  markdown: string;
  setMarkdown: (md: string) => void;
  onCopyToWeChat: () => void;
  isCopying: boolean;
  showH1Underline: boolean;
  onToggleH1Underline: () => void;
  invertH1: boolean;
  onToggleInvertH1: () => void;
  imageBorderStyle: 'border' | 'shadow' | 'default';
  onToggleImageBorder: () => void;
  codeBlockStyle: CodeBlockStyle;
  onToggleCodeBlockStyle: () => void;
  showHorizontalRule: boolean;
  onToggleHorizontalRule: () => void;
}

const Toolbar: React.FC<Props> = ({ markdown, setMarkdown, onCopyToWeChat, isCopying, showH1Underline, onToggleH1Underline, invertH1, onToggleInvertH1, imageBorderStyle, onToggleImageBorder, codeBlockStyle, onToggleCodeBlockStyle, showHorizontalRule, onToggleHorizontalRule }) => {
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
        <Button variant="toolbar" onClick={handleLoadExample}>
          📄 加载示例
        </Button>
        <Button variant="toolbar" onClick={handleClear}>
          🗑️ 清空
        </Button>
        <Button
          variant="toolbar"
          onClick={onToggleH1Underline}
          title={showH1Underline ? '隐藏 H1 底部横线' : '显示 H1 底部横线'}
        >
          {showH1Underline ? '👁️ 隐藏 H1 底线' : '📝 显示 H1 底线'}
        </Button>
        <Button
          variant="toolbar"
          onClick={onToggleInvertH1}
          title={invertH1 ? '关闭 H1 反显' : '开启 H1 反显'}
        >
          {invertH1 ? '🎛️ 关闭 H1 反显' : '🎨 开启 H1 反显'}
        </Button>
        <Button
          variant="toolbar"
          onClick={onToggleHorizontalRule}
          title={showHorizontalRule ? '隐藏分割线' : '显示分割线'}
        >
          {showHorizontalRule ? '➖ 隐藏分割线' : '➕ 显示分割线'}
        </Button>
        <Button
          variant="toolbar"
          onClick={onToggleImageBorder}
          title={imageBorderStyle === 'border' ? '切换为阴影模式' : '切换为边框模式'}
        >
          {imageBorderStyle === 'border' ? '🖼️ 边框模式' : '🌫️ 阴影模式'}
        </Button>
        <Button
          variant="toolbar"
          onClick={onToggleCodeBlockStyle}
          title={codeBlockStyle === 'classic' ? '切换为现代代码块样式' : '切换为极简代码块样式'}
        >
          {codeBlockStyle === 'classic' ? '💻 极简代码块' : '🎨 现代代码块'}
        </Button>
      </div>
      <div className="toolbar-right">
        <Button
          variant="toolbarPrimary"
          onClick={onCopyToWeChat}
          disabled={isCopying || !markdown.trim()}
        >
          {isCopying ? '⏳ 复制中...' : '📋 一键复制公众号'}
        </Button>
      </div>
    </div>
  );
};

export default Toolbar;
