import React from 'react';
import { Button } from './ui';

interface Props {
  query: string;
  replacement: string;
  caseSensitive: boolean;
  regexMode: boolean;
  current: number;
  total: number;
  error: string | null;
  onQueryChange: (value: string) => void;
  onReplacementChange: (value: string) => void;
  onCaseSensitiveChange: (value: boolean) => void;
  onRegexModeChange: (value: boolean) => void;
  onPrevious: () => void;
  onNext: () => void;
  onReplace: () => void;
  onReplaceAll: () => void;
  onClose: () => void;
}

const FindReplaceBar = React.forwardRef<HTMLInputElement, Props>(({
  query,
  replacement,
  caseSensitive,
  regexMode,
  current,
  total,
  error,
  onQueryChange,
  onReplacementChange,
  onCaseSensitiveChange,
  onRegexModeChange,
  onPrevious,
  onNext,
  onReplace,
  onReplaceAll,
  onClose,
}, ref) => {
  const disabled = total === 0 || Boolean(error);
  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (event.shiftKey) onPrevious();
      else onNext();
    }
  };

  return (
    <div className="find-replace-bar" role="search" aria-label="Markdown 查找替换">
      <div className="find-replace-row">
        <input
          ref={ref}
          className="find-replace-input"
          aria-label="查找内容"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder="查找"
          spellCheck={false}
        />
        <span className="find-replace-count" aria-live="polite">{total ? current + 1 : 0}/{total}</span>
        <Button variant="editorToolbar" className="find-replace-icon-btn" aria-label="上一个匹配" title="上一个匹配（Shift+Enter）" disabled={disabled} onClick={onPrevious}>↑</Button>
        <Button variant="editorToolbar" className="find-replace-icon-btn" aria-label="下一个匹配" title="下一个匹配（Enter）" disabled={disabled} onClick={onNext}>↓</Button>
        <label className="find-replace-option">
          <input type="checkbox" aria-label="区分大小写" checked={caseSensitive} onChange={(event) => onCaseSensitiveChange(event.target.checked)} />
          区分大小写
        </label>
        <label className="find-replace-option">
          <input type="checkbox" aria-label="使用正则表达式" checked={regexMode} onChange={(event) => onRegexModeChange(event.target.checked)} />
          正则
        </label>
        {error && <span className="find-replace-error" role="status">正则表达式无效</span>}
        <Button variant="editorToolbar" className="find-replace-icon-btn" aria-label="关闭查找替换" title="关闭（Esc）" onClick={onClose}>×</Button>
      </div>
      <div className="find-replace-row">
        <input
          className="find-replace-input"
          aria-label="替换内容"
          value={replacement}
          onChange={(event) => onReplacementChange(event.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder="替换为"
          spellCheck={false}
        />
        <Button variant="editorToolbar" className="find-replace-action-btn" aria-label="替换当前项" disabled={disabled} onClick={onReplace}>替换</Button>
        <Button variant="editorToolbar" className="find-replace-action-btn" aria-label="全部替换" disabled={disabled} onClick={onReplaceAll}>全部替换</Button>
      </div>
    </div>
  );
});

FindReplaceBar.displayName = 'FindReplaceBar';

export default FindReplaceBar;
