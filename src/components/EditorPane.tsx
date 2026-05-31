import React, { useRef, useCallback } from 'react';
import { convertHtmlToMarkdown } from '../utils/htmlToMarkdown';
import { Button } from './ui';
import './EditorPane.css';

interface Props {
  markdown: string;
  setMarkdown: (md: string) => void;
  onScroll?: (e: React.UIEvent<HTMLTextAreaElement>) => void;
  onLoadExample: () => void;
}

interface HistoryEntry {
  content: string;
  cursorStart: number;
  cursorEnd: number;
}

const MAX_HISTORY = 50;

const EditorPane: React.FC<Props> = ({ markdown, setMarkdown, onScroll, onLoadExample }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const historyRef = useRef<HistoryEntry[]>([]);
  const isUndoRef = useRef(false);

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
    const hasHtmlTable = /<table[\s>]/i.test(htmlData);

    const shouldConvertHtml = htmlData && htmlData.trim() && (
      htmlData.includes('feishu') ||
      htmlData.includes('larksuite') ||
      htmlData.includes('feishu.cn') ||
      htmlData.includes('lark') ||
      hasHtmlTable
    );

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
  }, [markdown, setMarkdown, pushHistory]);

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

      {/* 中间：编辑区 */}
      <div className="editor-container">
        <textarea
          ref={textareaRef}
          className="markdown-editor"
          value={markdown}
          onChange={handleChange}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          onScroll={onScroll}
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
      </div>

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
