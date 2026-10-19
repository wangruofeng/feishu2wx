import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './ui';
import './FormatPopover.css';

const groups = [
  { title: '标题', items: [['一级标题', '# ', ''], ['二级标题', '## ', ''], ['三级标题', '### ', '']] },
  { title: '文字格式', items: [['粗体', '**', '**'], ['斜体', '*', '*'], ['行内代码', '`', '`']] },
  { title: '插入内容', items: [['无序列表', '- ', ''], ['有序列表', '1. ', ''], ['引用', '> ', ''], ['链接', '[链接文本](', ')'], ['图片', '![图片描述](', ')']] },
];

interface Props {
  anchor: HTMLButtonElement;
  onClose: () => void;
  onInsert: (before: string, after: string) => void;
}

export default function FormatPopover({ anchor, onClose, onInsert }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const outside = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node) && !anchor.contains(event.target as Node)) closeRef.current();
    };
    const resize = () => closeRef.current();
    document.addEventListener('mousedown', outside);
    window.addEventListener('resize', resize);
    return () => {
      document.removeEventListener('mousedown', outside);
      window.removeEventListener('resize', resize);
    };
  }, [anchor]);
  const rect = anchor.getBoundingClientRect();
  return createPortal(
    <div ref={ref} className="format-popover" role="dialog" aria-label="Markdown 格式"
      style={{ left: Math.max(8, Math.min(rect.left, window.innerWidth - 288)), bottom: window.innerHeight - rect.top + 8, maxHeight: Math.max(80, rect.top - 16) }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          onClose();
          anchor.focus();
        }
        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
          event.preventDefault();
          const buttons = Array.from(ref.current?.querySelectorAll<HTMLButtonElement>('button') ?? []);
          const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1
            : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
          buttons[next]?.focus();
        }
        if (event.key === 'Tab') {
          const buttons = Array.from(ref.current?.querySelectorAll<HTMLButtonElement>('button') ?? []);
          if ((!event.shiftKey && document.activeElement === buttons[buttons.length - 1]) || (event.shiftKey && document.activeElement === buttons[0])) {
            onClose();
            anchor.focus();
          }
        }
      }}>
      {groups.map(group => (
        <section key={group.title} aria-label={group.title}>
          <h3>{group.title}</h3>
          <div className="format-popover-items">
            {group.items.map(([label, before, after]) => (
              <Button key={label} variant="editorToolbar" onClick={() => { onClose(); onInsert(before, after); }}>{label}</Button>
            ))}
          </div>
        </section>
      ))}
    </div>, anchor.closest('.app') ?? document.body
  );
}
