import React, { useRef, useCallback, useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { convertHtmlToMarkdown } from '../utils/htmlToMarkdown';
import { shouldConvertPastedHtml } from '../utils/pasteDetection';
import { tokenizeMarkdown, getMdSyntaxCssVars, MdSyntaxThemeKey } from '../utils/mdSourceHighlight';
import { Button } from './ui';
import './EditorPane.css';

interface Props {
  markdown: string;
  setMarkdown: (md: string) => void;
  shouldConvertPastedHtml: boolean;
  onScroll?: (e: React.UIEvent<HTMLTextAreaElement>) => void;
  onLoadExample: () => void;
  syntaxTheme: MdSyntaxThemeKey;
}

interface HistoryEntry {
  content: string;
  cursorStart: number;
  cursorEnd: number;
}

interface OutlineItem {
  level: number;
  text: string;
  pos: number;
}

const MAX_HISTORY = 50;
const OUTLINE_POPOVER_WIDTH = 280;
const OUTLINE_POPOVER_VIEWPORT_MARGIN = 8;
const TEXTAREA_MIRROR_STYLE_PROPS = [
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'letter-spacing',
  'line-height',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'text-transform',
  'text-indent',
  'text-rendering',
  'word-spacing',
  'tab-size',
];

const getLineHeight = (textarea: HTMLTextAreaElement): number => {
  const lineHeight = parseFloat(getComputedStyle(textarea).lineHeight);
  if (!Number.isNaN(lineHeight)) return lineHeight;
  const fontSize = parseFloat(getComputedStyle(textarea).fontSize);
  return Number.isNaN(fontSize) ? 24 : fontSize * 1.6;
};

const getOutlineScrollTop = (textarea: HTMLTextAreaElement, markdown: string, pos: number): number => {
  const width = textarea.clientWidth || textarea.getBoundingClientRect().width;
  if (!width) {
    const lineNumber = markdown.slice(0, pos).split('\n').length - 1;
    return Math.max(0, lineNumber * getLineHeight(textarea));
  }

  const computedStyle = getComputedStyle(textarea);
  const mirror = document.createElement('div');
  const marker = document.createElement('span');

  marker.textContent = '\u200b';
  marker.setAttribute('data-outline-marker', 'true');

  mirror.textContent = markdown.slice(0, pos);
  mirror.appendChild(marker);
  mirror.style.position = 'absolute';
  mirror.style.visibility = 'hidden';
  mirror.style.pointerEvents = 'none';
  mirror.style.left = '-9999px';
  mirror.style.top = '0';
  mirror.style.width = `${width}px`;
  mirror.style.boxSizing = 'border-box';
  mirror.style.whiteSpace = 'pre-wrap';
  mirror.style.overflowWrap = 'break-word';
  mirror.style.wordWrap = 'break-word';
  mirror.style.border = '0';

  TEXTAREA_MIRROR_STYLE_PROPS.forEach((prop) => {
    mirror.style.setProperty(prop, computedStyle.getPropertyValue(prop));
  });

  document.body.appendChild(mirror);
  const paddingTop = parseFloat(computedStyle.paddingTop) || 0;
  const measuredTop = Math.max(0, marker.offsetTop - paddingTop);
  mirror.remove();

  if (textarea.scrollHeight > textarea.clientHeight) {
    return Math.min(measuredTop, textarea.scrollHeight - textarea.clientHeight);
  }
  return measuredTop;
};

const EditorPane: React.FC<Props> = ({ markdown, setMarkdown, shouldConvertPastedHtml: shouldConvertPastedHtmlEnabled, onScroll, onLoadExample, syntaxTheme }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightLayerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const historyRef = useRef<HistoryEntry[]>([]);
  const redoStackRef = useRef<HistoryEntry[]>([]);
  const isUndoRef = useRef(false);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [outlinePos, setOutlinePos] = useState({ top: 0, left: 0 });
  const outlineBtnRef = useRef<HTMLButtonElement>(null);
  const outlinePopRef = useRef<HTMLDivElement>(null);

  // 保存当前状态到历史
  const pushHistory = useCallback(() => {
    const textarea = textareaRef.current;
    historyRef.current.push({
      content: markdown,
      cursorStart: textarea?.selectionStart ?? 0,
      cursorEnd: textarea?.selectionEnd ?? 0,
    });
    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current.shift();
    }
  }, [markdown]);

  // 处理粘贴事件
  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const htmlData = e.clipboardData.getData('text/html');
    const textData = e.clipboardData.getData('text/plain');
    const shouldConvertHtml = shouldConvertPastedHtmlEnabled && shouldConvertPastedHtml(htmlData, textData);

    if (shouldConvertHtml) {
      e.preventDefault();
      pushHistory();
      const md = convertHtmlToMarkdown(htmlData);

      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newMd = markdown.slice(0, start) + md + markdown.slice(end);
        setMarkdown(newMd);

        setTimeout(() => {
          const newPos = start + md.length;
          textarea.setSelectionRange(newPos, newPos);
          textarea.focus();
        }, 0);
      }
      return;
    }

    if (textData) {
      e.preventDefault();
      pushHistory();
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newMd = markdown.slice(0, start) + textData + markdown.slice(end);
        setMarkdown(newMd);

        setTimeout(() => {
          const newPos = start + textData.length;
          textarea.setSelectionRange(newPos, newPos);
          textarea.focus();
        }, 0);
      }
    }
  }, [markdown, setMarkdown, pushHistory, shouldConvertPastedHtmlEnabled]);

  // 插入Markdown语法
  const insertMarkdown = useCallback((before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    pushHistory();
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = markdown.slice(start, end);
    const replacement = before + selectedText + after;
    const newMd = markdown.slice(0, start) + replacement + markdown.slice(end);
    setMarkdown(newMd);

    setTimeout(() => {
      const newStart = start + before.length;
      const newEnd = newStart + selectedText.length;
      textarea.setSelectionRange(newStart, newEnd);
      textarea.focus();
    }, 0);
  }, [markdown, setMarkdown, pushHistory]);

  // 切换 Markdown 语法（包裹/取消包裹）
  const toggleMarkdown = useCallback((before: string, after: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    pushHistory();
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = markdown.slice(start, end);

    // 检查选中文本是否已被包裹
    const beforeStart = start - before.length;
    const afterEnd = end + after.length;
    const isWrapped = beforeStart >= 0 && afterEnd <= markdown.length
      && markdown.slice(beforeStart, start) === before
      && markdown.slice(end, afterEnd) === after;

    if (isWrapped) {
      // 去掉包裹
      const newMd = markdown.slice(0, beforeStart) + selectedText + markdown.slice(afterEnd);
      setMarkdown(newMd);
      setTimeout(() => {
        textarea.setSelectionRange(beforeStart, beforeStart + selectedText.length);
        textarea.focus();
      }, 0);
    } else {
      // 添加包裹
      const replacement = before + selectedText + after;
      const newMd = markdown.slice(0, start) + replacement + markdown.slice(end);
      setMarkdown(newMd);
      setTimeout(() => {
        textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
        textarea.focus();
      }, 0);
    }
  }, [markdown, setMarkdown, pushHistory]);

  // 键盘快捷键
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
      if (e.key === 'z') {
        e.preventDefault();
        const history = historyRef.current;
        if (history.length === 0) return;
        const entry = history.pop()!;
        // 保存当前状态到 redo 栈
        redoStackRef.current.push({
          content: markdown,
          cursorStart: textareaRef.current?.selectionStart ?? 0,
          cursorEnd: textareaRef.current?.selectionEnd ?? 0,
        });
        isUndoRef.current = true;
        setMarkdown(entry.content);
        setTimeout(() => {
          const textarea = textareaRef.current;
          if (textarea) {
            textarea.setSelectionRange(entry.cursorStart, entry.cursorEnd);
            textarea.focus();
          }
          isUndoRef.current = false;
        }, 0);
        return;
      }
      if (e.key === 'b') {
        e.preventDefault();
        toggleMarkdown('**', '**');
      } else if (e.key === 'i') {
        e.preventDefault();
        toggleMarkdown('*', '*');
      } else if (e.key === 'u') {
        e.preventDefault();
        toggleMarkdown('<u>', '</u>');
      } else if (e.key === 'k') {
        e.preventDefault();
        pushHistory();
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = markdown.slice(start, end);

        if (selectedText) {
          // 选中文本作为链接文本，光标放在 URL 位置
          const replacement = `[${selectedText}](url)`;
          const newMd = markdown.slice(0, start) + replacement + markdown.slice(end);
          setMarkdown(newMd);
          setTimeout(() => {
            const urlStart = start + selectedText.length + 3;
            textarea.setSelectionRange(urlStart, urlStart + 3);
            textarea.focus();
          }, 0);
        } else {
          // 无选中文本，插入占位
          const replacement = '[链接文本](url)';
          const newMd = markdown.slice(0, start) + replacement + markdown.slice(end);
          setMarkdown(newMd);
          setTimeout(() => {
            textarea.setSelectionRange(start + 1, start + 5);
            textarea.focus();
          }, 0);
        }
      }
    }
    // Cmd+Shift+Z 重做
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && !e.altKey && e.key === 'z') {
      e.preventDefault();
      const redoStack = redoStackRef.current;
      if (redoStack.length === 0) return;
      const entry = redoStack.pop()!;
      // 保存当前状态回 undo 栈
      historyRef.current.push({
        content: markdown,
        cursorStart: textareaRef.current?.selectionStart ?? 0,
        cursorEnd: textareaRef.current?.selectionEnd ?? 0,
      });
      isUndoRef.current = true;
      setMarkdown(entry.content);
      setTimeout(() => {
        const textarea = textareaRef.current;
        if (textarea) {
          textarea.setSelectionRange(entry.cursorStart, entry.cursorEnd);
          textarea.focus();
        }
        isUndoRef.current = false;
      }, 0);
    }
  }, [markdown, setMarkdown, toggleMarkdown, pushHistory]);

  // 普通 onChange：编辑前保存快照（非撤销时）
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!isUndoRef.current) {
      const textarea = textareaRef.current;
      historyRef.current.push({
        content: markdown,
        cursorStart: textarea?.selectionStart ?? 0,
        cursorEnd: textarea?.selectionEnd ?? 0,
      });
      if (historyRef.current.length > MAX_HISTORY) {
        historyRef.current.shift();
      }
    }
    setMarkdown(e.target.value);
  }, [markdown, setMarkdown]);

  const handleFileImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.md') && file.type !== 'text/markdown') {
      alert('请选择 Markdown 文件 (.md)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        setMarkdown(content);
      }
    };
    reader.onerror = () => {
      alert('读取文件失败，请重试');
    };
    reader.readAsText(file);

    e.target.value = '';
  }, [setMarkdown]);

  // 触发文件选择
  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleClear = useCallback(() => {
    if (window.confirm('确定要清空所有内容吗？')) {
      setMarkdown('');
    }
  }, [setMarkdown]);

  // 解析文章大纲（H1-H3），跳过 frontmatter 与代码块
  const outlineItems = useMemo<OutlineItem[]>(() => {
    const items: OutlineItem[] = [];
    const lines = markdown.split('\n');
    let pos = 0;
    let inFrontmatter = false;
    let inCodeBlock = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      if (i === 0 && trimmed === '---') {
        inFrontmatter = true;
        pos += line.length + 1;
        continue;
      }
      if (inFrontmatter && trimmed === '---') {
        inFrontmatter = false;
        pos += line.length + 1;
        continue;
      }
      if (trimmed.startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        pos += line.length + 1;
        continue;
      }
      if (!inFrontmatter && !inCodeBlock) {
        const m = line.match(/^(#{1,3})\s+(.+?)\s*#*\s*$/);
        if (m) {
          items.push({ level: m[1].length, text: m[2], pos });
        }
      }
      pos += line.length + 1;
    }
    return items;
  }, [markdown]);

  // 点击大纲项，滚动 textarea 到对应标题
  const handleOutlineJump = useCallback((pos: number) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.focus();
    textarea.setSelectionRange(pos, pos);
    const top = getOutlineScrollTop(textarea, markdown, pos);
    if (typeof textarea.scrollTo === 'function') {
      textarea.scrollTo({ top, behavior: 'smooth' });
    } else {
      textarea.scrollTop = top;
    }
    setOutlineOpen(false);
  }, [markdown]);

  // 切换大纲：先算按钮在视口内的位置
  const handleToggleOutline = useCallback(() => {
    if (!outlineOpen && outlineBtnRef.current) {
      const rect = outlineBtnRef.current.getBoundingClientRect();
      const footerRect = outlineBtnRef.current.closest('.editor-footer')?.getBoundingClientRect();
      const anchorRight = footerRect?.right ?? rect.right;
      const maxLeft = Math.max(OUTLINE_POPOVER_VIEWPORT_MARGIN, window.innerWidth - OUTLINE_POPOVER_WIDTH - OUTLINE_POPOVER_VIEWPORT_MARGIN);
      const left = Math.min(Math.max(anchorRight - OUTLINE_POPOVER_WIDTH, OUTLINE_POPOVER_VIEWPORT_MARGIN), maxLeft);
      setOutlinePos({ top: rect.top, left });
    }
    setOutlineOpen((v) => !v);
  }, [outlineOpen]);

  // 点击浮层外部关闭大纲
  useEffect(() => {
    if (!outlineOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (outlinePopRef.current?.contains(target)) return;
      if (outlineBtnRef.current?.contains(target)) return;
      setOutlineOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [outlineOpen]);

  useEffect(() => {
    if (outlineItems.length === 0) {
      setOutlineOpen(false);
    }
  }, [outlineItems.length]);

  // 语法高亮：none 时不渲染，仅消费一次 tokenizeMarkdown
  const highlightEnabled = syntaxTheme !== 'none';
  const highlightedHtml = useMemo(
    () => (highlightEnabled ? tokenizeMarkdown(markdown) : ''),
    [markdown, highlightEnabled]
  );

  // textarea 滚动时同步高亮层位移，并透传外部 onScroll（保留预览同步）
  const handleEditorScroll = useCallback((e: React.UIEvent<HTMLTextAreaElement>) => {
    const layer = highlightLayerRef.current;
    if (layer) {
      const { scrollLeft, scrollTop } = e.currentTarget;
      layer.style.transform = `translate(${-scrollLeft}px, ${-scrollTop}px)`;
    }
    onScroll?.(e);
  }, [onScroll]);

  return (
    <div className="editor-pane">
      {/* 顶部：格式工具栏 */}
      <div className="editor-toolbar">
        <Button variant="editorToolbar" onClick={() => insertMarkdown('# ', '')} title="标题1">H1</Button>
        <Button variant="editorToolbar" onClick={() => insertMarkdown('## ', '')} title="标题2">H2</Button>
        <Button variant="editorToolbar" onClick={() => insertMarkdown('### ', '')} title="标题3">H3</Button>
        <div className="toolbar-divider" />
        <Button variant="editorToolbar" onClick={() => insertMarkdown('**', '**')} title="粗体">B</Button>
        <Button variant="editorToolbar" onClick={() => insertMarkdown('*', '*')} title="斜体"><i>I</i></Button>
        <Button variant="editorToolbar" onClick={() => insertMarkdown('`', '`')} title="行内代码">Code</Button>
        <div className="toolbar-divider" />
        <Button variant="editorToolbar" onClick={() => insertMarkdown('- ', '')} title="无序列表">&#8226; List</Button>
        <Button variant="editorToolbar" onClick={() => insertMarkdown('1. ', '')} title="有序列表">1. List</Button>
        <Button variant="editorToolbar" onClick={() => insertMarkdown('> ', '')} title="引用">Quote</Button>
        <div className="toolbar-divider" />
        <Button variant="editorToolbar" onClick={() => insertMarkdown('[链接文本](', ')')} title="链接">Link</Button>
        <Button variant="editorToolbar" onClick={() => insertMarkdown('![图片描述](', ')')} title="图片">Image</Button>
      </div>

      {/* 中间：编辑区（高亮层在 textarea 下方，文字透明仅 caret 可见） */}
      <div className={`editor-container${highlightEnabled ? ' md-highlight-active' : ''}`}>
        {highlightEnabled && (
          <div className="md-highlight-layer" aria-hidden="true">
            <div
              ref={highlightLayerRef}
              className="md-highlight-content"
              style={getMdSyntaxCssVars(syntaxTheme) as React.CSSProperties}
              dangerouslySetInnerHTML={{ __html: highlightedHtml }}
            />
          </div>
        )}
        <textarea
          ref={textareaRef}
          className="markdown-editor"
          value={markdown}
          onChange={handleChange}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          onScroll={handleEditorScroll}
          placeholder="请粘贴飞书文档内容或直接编写 Markdown..."
          spellCheck={false}
        />
      </div>

      {/* 底部：文件操作 */}
      <div className="editor-footer">
        <Button variant="footer" onClick={triggerFileInput} title="导入 Markdown 文件">
          📂 导入
        </Button>
        <Button variant="footer" onClick={onLoadExample}>
          加载示例
        </Button>
        <Button variant="footer" onClick={handleClear}>
          清空
        </Button>
        <span className="editor-stats">
          <strong>{markdown.split('\n').length.toLocaleString()}</strong> 行 · <strong>{markdown.length.toLocaleString()}</strong> 字符
        </span>
        <button
          ref={outlineBtnRef}
          type="button"
          className={`editor-footer-btn editor-outline-btn${outlineOpen ? ' is-active' : ''}`}
          onClick={handleToggleOutline}
          title="文章大纲"
          aria-label="文章大纲"
          aria-expanded={outlineOpen}
          disabled={outlineItems.length === 0}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <line x1="3" y1="4" x2="13" y2="4" />
            <line x1="5" y1="8" x2="13" y2="8" />
            <line x1="7" y1="12" x2="13" y2="12" />
          </svg>
          大纲
        </button>
      </div>

      {/* 文章大纲浮层（portal 到 body，避免被 overflow:hidden 裁剪） */}
      {outlineOpen && createPortal(
        <div
          ref={outlinePopRef}
          className="editor-outline-pop"
          role="dialog"
          aria-label="文章大纲"
          style={{ position: 'fixed', top: outlinePos.top, left: outlinePos.left }}
        >
          <div className="editor-outline-pop-header">
            <span>文章大纲</span>
            <button type="button" className="editor-outline-close" onClick={() => setOutlineOpen(false)} aria-label="关闭">&times;</button>
          </div>
          <div className="editor-outline-pop-body">
            {outlineItems.length === 0 ? (
              <div className="editor-outline-empty">未发现标题（H1-H3）</div>
            ) : (
              <ul className="editor-outline-list">
                {outlineItems.map((item, idx) => (
                  <li key={`${item.pos}-${idx}`} className={`editor-outline-item editor-outline-level-${item.level}`}>
                    <button type="button" onClick={() => handleOutlineJump(item.pos)} title={item.text}>
                      <span className="editor-outline-text">{item.text}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>,
        document.body
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".md,text/markdown"
        onChange={handleFileImport}
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default EditorPane;
