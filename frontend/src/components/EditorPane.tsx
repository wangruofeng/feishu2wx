import React, { useRef, useState, useCallback } from 'react';
import axios from 'axios';
import { convertHtmlToMarkdown } from '../utils/htmlToMarkdown';
import './EditorPane.css';

interface Props {
  markdown: string;
  setMarkdown: (md: string) => void;
}

const EditorPane: React.FC<Props> = ({ markdown, setMarkdown }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // 处理粘贴事件
  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const htmlData = e.clipboardData.getData('text/html');
    const textData = e.clipboardData.getData('text/plain');
    
    // 如果有HTML数据（比如从飞书复制），转换为Markdown
    if (htmlData && htmlData.trim()) {
      e.preventDefault();
      const md = convertHtmlToMarkdown(htmlData);
      
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newMd = markdown.slice(0, start) + md + markdown.slice(end);
        setMarkdown(newMd);
        
        // 恢复光标位置
        setTimeout(() => {
          const newPos = start + md.length;
          textarea.setSelectionRange(newPos, newPos);
          textarea.focus();
        }, 0);
      }
    } else if (textData) {
      // 纯文本直接插入
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newMd = markdown.slice(0, start) + textData + markdown.slice(end);
        setMarkdown(newMd);
      }
    }
  }, [markdown, setMarkdown]);

  // 处理图片上传
  const handleImageUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('请上传图片文件');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await axios.post('/api/upload-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const imageUrl = response.data.url;
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const imageMarkdown = `![${file.name}](${imageUrl})`;
        const newMd = markdown.slice(0, start) + imageMarkdown + markdown.slice(end);
        setMarkdown(newMd);
        
        setTimeout(() => {
          const newPos = start + imageMarkdown.length;
          textarea.setSelectionRange(newPos, newPos);
          textarea.focus();
        }, 0);
      }
    } catch (error: any) {
      console.error('图片上传失败:', error);
      alert(error.response?.data?.error || '图片上传失败，请重试');
    } finally {
      setIsUploading(false);
    }
  }, [markdown, setMarkdown]);

  // 处理文件选择
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleImageUpload(e.target.files[0]);
      e.target.value = ''; // 重置input
    }
  }, [handleImageUpload]);

  // 处理拖放
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleImageUpload(files[0]);
    }
  }, [handleImageUpload]);

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

  return (
    <div className="editor-pane">
      <div className="editor-header">
        <h2>Markdown 源码</h2>
        <div className="editor-actions">
          <button
            className="btn-upload"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? '上传中...' : '📷 上传图片'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
        </div>
      </div>

      <div
        className={`editor-container ${isDragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragging && (
          <div className="drag-overlay">
            <div className="drag-message">
              <div className="drag-icon">📎</div>
              <div>松开鼠标上传图片</div>
            </div>
          </div>
        )}
        <textarea
          ref={textareaRef}
          className="markdown-editor"
          value={markdown}
          onChange={(e) => setMarkdown(e.target.value)}
          onPaste={handlePaste}
          placeholder="请粘贴飞书文档内容或直接编写 Markdown...&#10;&#10;提示：&#10;• 从飞书文档复制内容后直接粘贴即可自动转换&#10;• 支持拖拽图片上传&#10;• 支持常见 Markdown 语法"
          spellCheck={false}
        />
      </div>

      <div className="editor-toolbar">
        <button onClick={() => insertMarkdown('# ', '')} title="标题1">H1</button>
        <button onClick={() => insertMarkdown('## ', '')} title="标题2">H2</button>
        <button onClick={() => insertMarkdown('### ', '')} title="标题3">H3</button>
        <div className="toolbar-divider" />
        <button onClick={() => insertMarkdown('**', '**')} title="粗体">B</button>
        <button onClick={() => insertMarkdown('*', '*')} title="斜体">I</button>
        <button onClick={() => insertMarkdown('`', '`')} title="行内代码">Code</button>
        <div className="toolbar-divider" />
        <button onClick={() => insertMarkdown('- ', '')} title="无序列表">• List</button>
        <button onClick={() => insertMarkdown('1. ', '')} title="有序列表">1. List</button>
        <button onClick={() => insertMarkdown('> ', '')} title="引用">Quote</button>
        <div className="toolbar-divider" />
        <button onClick={() => insertMarkdown('[链接文本](', ')')} title="链接">Link</button>
        <button onClick={() => insertMarkdown('![图片描述](', ')')} title="图片">Image</button>
      </div>
    </div>
  );
};

export default EditorPane;
