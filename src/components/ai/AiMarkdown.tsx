import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../ui';
import { renderAiMarkdown } from '../../utils/aiMarkdown';

const CodeCopyButton: React.FC<{ code: HTMLElement }> = ({ code }) => {
  const [status, setStatus] = useState('复制');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const handleCopy = async () => {
    clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(code.textContent ?? '');
      setStatus('已复制');
    } catch {
      setStatus('复制失败，请重试');
    }
    timer.current = setTimeout(() => setStatus('复制'), 1600);
  };

  return (
    <Button
      type="button"
      variant="aiIconBtn"
      className="ai-code-copy-btn"
      onClick={handleCopy}
      aria-label="复制代码"
    >
      <span role="status">{status}</span>
    </Button>
  );
};

/** Markdown 仍由 markdown-it 转义，交互按钮交给 React 管理。 */
const AiMarkdown: React.FC<{ text: string }> = ({ text }) => {
  const html = useMemo(() => ({ __html: renderAiMarkdown(text) }), [text]);
  const contentRef = useRef<HTMLDivElement>(null);
  const [blocks, setBlocks] = useState<{ toolbar: Element; code: HTMLElement }[]>([]);

  useLayoutEffect(() => {
    const next: typeof blocks = [];
    contentRef.current?.querySelectorAll('.ai-code-block').forEach((block) => {
      const toolbar = block.querySelector('.ai-code-toolbar');
      const code = block.querySelector('pre code');
      if (toolbar && code instanceof HTMLElement) next.push({ toolbar, code });
    });
    setBlocks(next);
  }, [html]);

  return (
    <>
      <div className="ai-md" ref={contentRef} dangerouslySetInnerHTML={html} />
      {blocks.map(({ toolbar, code }, index) => createPortal(
        <CodeCopyButton code={code} />, toolbar, String(index)
      ))}
    </>
  );
};

export default AiMarkdown;
