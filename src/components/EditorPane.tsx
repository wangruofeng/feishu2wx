import React, { useRef, useCallback } from 'react';
import { convertHtmlToMarkdown } from '../utils/htmlToMarkdown';
import './EditorPane.css';

interface Props {
  markdown: string;
  setMarkdown: (md: string) => void;
  onScroll?: (e: React.UIEvent<HTMLTextAreaElement>) => void;
  onLoadExample: () => void;
}

const EditorPane: React.FC<Props> = ({ markdown, setMarkdown, onScroll, onLoadExample }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  }, [markdown, setMarkdown]);

  // 插入Markdown语法
  const insertMarkdown = useCallback((before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

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
  }, [markdown, setMarkdown]);

  // 处理文件导入
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
        <button onClick={() => insertMarkdown('# ', '')} title="标题1">H1</button>
        <button onClick={() => insertMarkdown('## ', '')} title="标题2">H2</button>
        <button onClick={() => insertMarkdown('### ', '')} title="标题3">H3</button>
        <div className="toolbar-divider" />
        <button onClick={() => insertMarkdown('**', '**')} title="粗体">B</button>
        <button onClick={() => insertMarkdown('*', '*')} title="斜体">I</button>
        <button onClick={() => insertMarkdown('`', '`')} title="行内代码">Code</button>
        <div className="toolbar-divider" />
        <button onClick={() => insertMarkdown('- ', '')} title="无序列表">&#8226; List</button>
        <button onClick={() => insertMarkdown('1. ', '')} title="有序列表">1. List</button>
        <button onClick={() => insertMarkdown('> ', '')} title="引用">Quote</button>
        <div className="toolbar-divider" />
        <button onClick={() => insertMarkdown('[链接文本](', ')')} title="链接">Link</button>
        <button onClick={() => insertMarkdown('![图片描述](', ')')} title="图片">Image</button>
      </div>

      {/* 中间：编辑区 */}
      <div className="editor-container">
        <textarea
          ref={textareaRef}
          className="markdown-editor"
          value={markdown}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMarkdown(e.target.value)}
          onPaste={handlePaste}
          onScroll={onScroll}
          placeholder="请粘贴飞书文档内容或直接编写 Markdown..."
          spellCheck={false}
        />
      </div>

      {/* 底部：文件操作 */}
      <div className="editor-footer">
        <button className="editor-footer-btn" onClick={triggerFileInput} title="导入 Markdown 文件">
          📂 导入
        </button>
        <button className="editor-footer-btn" onClick={onLoadExample}>
          加载示例
        </button>
        <button className="editor-footer-btn" onClick={handleClear}>
          清空
        </button>
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
