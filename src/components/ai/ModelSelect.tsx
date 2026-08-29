import React, { useEffect, useRef, useState } from 'react';

export interface ModelOption {
  value: string;
  label: string;
}

interface Props {
  options: ModelOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

/** 模型选择下拉：自定义弹层替代原生 select，宽度可控（原生弹窗无法用 CSS 缩窄） */
const ModelSelect: React.FC<Props> = ({ options, value, onChange, disabled }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // 外点关闭
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const selected = options.find((option) => option.value === value);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && open) {
      // 只关下拉，不再冒泡触发面板级 Esc（关抽屉）
      e.stopPropagation();
      setOpen(false);
    }
  };

  return (
    <div
      className={`ai-model-select${open ? ' is-open' : ''}`}
      ref={rootRef}
      onKeyDown={handleKeyDown}
    >
      <button
        type="button"
        className="ai-model-select-trigger"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled || options.length === 0}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={selected?.label ?? '未配置模型'}
      >
        <span className="ai-model-select-text">{selected?.label ?? '未配置模型'}</span>
        <svg className="ai-model-select-caret" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="ai-model-select-menu" role="listbox" aria-label="选择模型">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`ai-model-select-option${option.value === value ? ' is-selected' : ''}`}
              role="option"
              aria-selected={option.value === value}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              title={option.label}
            >
              <span className="ai-model-select-option-text">{option.label}</span>
              {option.value === value && <span className="ai-model-select-check">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ModelSelect;
