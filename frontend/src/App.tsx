import React, { useState, useEffect, useCallback } from 'react';
import EditorPane from './components/EditorPane';
import PreviewPane from './components/PreviewPane';
import ThemeSwitcher from './components/ThemeSwitcher';
import DevicePreviewToggle from './components/DevicePreviewToggle';
import FontSelector from './components/FontSelector';
import Toolbar from './components/Toolbar';
import { renderMarkdown, setCodeBlockStyle, CodeBlockStyle } from './utils/markdownRenderer';
import { copyHtmlToWeChat, copySelectedToWeChat } from './utils/wechatCopy';
import './App.css';
import './styles/themes.css';
import 'highlight.js/styles/atom-one-dark.css';

const App: React.FC = () => {
  const [markdown, setMarkdown] = useState<string>('');
  const [html, setHtml] = useState<string>('');
  const [theme, setTheme] = useState<string>('classic');
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [isCopying, setIsCopying] = useState<boolean>(false);
  const [showEditor, setShowEditor] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [font, setFont] = useState<string>('default');
  const [isSystemDark, setIsSystemDark] = useState<boolean>(false);
  const [showH1, setShowH1] = useState<boolean>(true);
  const [imageBorderStyle, setImageBorderStyle] = useState<'border' | 'shadow'>('border');
  const [codeBlockStyle, setCodeBlockStyleState] = useState<CodeBlockStyle>('modern');
  const [copyStatus, setCopyStatus] = useState<{ visible: boolean; message: string; isError: boolean }>({
    visible: false,
    message: '',
    isError: false,
  });

  // 检测系统暗黑模式
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsSystemDark(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsSystemDark(e.matches);
    };

    // 监听系统暗黑模式变化
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // 兼容旧版浏览器
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  // 实时渲染 markdown → html
  useEffect(() => {
    const rendered = renderMarkdown(markdown);
    setHtml(rendered);
  }, [markdown]);

  // 当代码块样式改变时，重新渲染
  useEffect(() => {
    setCodeBlockStyle(codeBlockStyle);
    const rendered = renderMarkdown(markdown);
    setHtml(rendered);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeBlockStyle]);

  // 处理 ESC 键退出全屏
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    if (isFullscreen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isFullscreen]);

  // 根据系统暗黑模式自动应用明亮或暗黑主题
  const effectiveTheme = isSystemDark ? 'dark' : 'light';
  const displayTheme = theme === 'light' || theme === 'dark' ? effectiveTheme : theme;

  // 一键复制到微信公众号（智能判断：如果有选中内容则复制选中内容，否则复制全部）
  const handleCopyToWeChat = useCallback(async () => {
    setIsCopying(true);
    try {
      // 检查是否有选中的内容
      const selection = window.getSelection();
      let hasValidSelection = false;
      
      if (selection && selection.rangeCount > 0) {
        try {
          const range = selection.getRangeAt(0);
          const previewElement = document.querySelector('.preview-content');
          const selectedText = selection.toString().trim();
          
          // 检查：1. 有选中文本 2. 选中内容在预览区域内
          if (selectedText.length > 0 && previewElement && previewElement.contains(range.commonAncestorContainer)) {
            hasValidSelection = true;
          }
        } catch (e) {
          // 如果获取选择范围失败，说明没有有效选择
          hasValidSelection = false;
        }
      }

      let result;
      if (hasValidSelection) {
        // 复制选中的内容
        result = await copySelectedToWeChat(displayTheme, font, showH1, imageBorderStyle, codeBlockStyle);
      } else {
        // 复制全部内容
        if (!html.trim()) {
          setCopyStatus({
            visible: true,
            message: '请先输入或粘贴内容',
            isError: true,
          });
          setIsCopying(false);
          return;
        }
        result = await copyHtmlToWeChat(html, displayTheme, font, showH1, imageBorderStyle, codeBlockStyle);
      }
      
      setCopyStatus({
        visible: true,
        message: result.message,
        isError: !result.success,
      });
    } catch (error) {
      console.error('复制失败:', error);
      setCopyStatus({
        visible: true,
        message: '❌ 复制失败。\n\n请尝试：\n1. 刷新页面后重试\n2. 或手动选择预览区域内容，按 Ctrl+C (Windows) 或 Cmd+C (Mac) 复制',
        isError: true,
      });
    } finally {
      setIsCopying(false);
    }
  }, [html, displayTheme, font, showH1, imageBorderStyle, codeBlockStyle]);

  return (
    <div className={`app theme-${displayTheme} ${isSystemDark ? 'system-dark' : 'system-light'}`}>
      <header className={`app-header ${isFullscreen ? 'fullscreen-header' : ''}`}>
        <div className="header-content">
          <h1 className="app-title">
            <span className="title-feishu shimmer-text">飞书文档</span> → <span className="title-wechat shimmer-text">微信公众号</span>排版神器
          </h1>
          <div className="header-controls">
            <div className="header-controls-wrapper">
              <div className="header-controls-row">
                <FontSelector font={font} setFont={setFont} />
                <DevicePreviewToggle device={device} setDevice={setDevice} />
                {!isFullscreen && (
                  <button
                    className="header-btn header-btn-compact"
                    onClick={() => setShowEditor(!showEditor)}
                    title={showEditor ? '隐藏源码' : '显示源码'}
                  >
                    {showEditor ? '👁️ 隐藏源码' : '👁️‍🗨️ 显示源码'}
                  </button>
                )}
                <button
                  className="header-btn header-btn-exit header-btn-compact"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  title={isFullscreen ? '退出全屏' : '全屏预览'}
                >
                  {isFullscreen ? '⤓ 退出全屏 (ESC)' : '⛶ 全屏预览'}
                </button>
              </div>
              {!isFullscreen && (
                <div className="header-controls-row header-controls-row-theme">
                  <ThemeSwitcher theme={theme} setTheme={setTheme} />
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className={`main-container device-${device} ${!showEditor ? 'editor-hidden' : ''} ${isFullscreen ? 'fullscreen' : ''}`}>
        {showEditor && <EditorPane markdown={markdown} setMarkdown={setMarkdown} />}
        <PreviewPane html={html} device={device} isFullscreen={isFullscreen} font={font} showH1={showH1} imageBorderStyle={imageBorderStyle} />
      </main>

      {!isFullscreen && (
        <footer className="app-footer">
          <Toolbar
            markdown={markdown}
            setMarkdown={setMarkdown}
            onCopyToWeChat={handleCopyToWeChat}
            isCopying={isCopying}
            showH1={showH1}
            onToggleH1={() => setShowH1(!showH1)}
            imageBorderStyle={imageBorderStyle}
            onToggleImageBorder={() => setImageBorderStyle(imageBorderStyle === 'border' ? 'shadow' : 'border')}
            codeBlockStyle={codeBlockStyle}
            onToggleCodeBlockStyle={() => setCodeBlockStyleState(codeBlockStyle === 'classic' ? 'modern' : 'classic')}
          />
        </footer>
      )}

      {copyStatus.visible && (
        <div className="copy-modal-overlay" onClick={() => setCopyStatus({ ...copyStatus, visible: false })}>
          <div
            className={`copy-modal ${copyStatus.isError ? 'copy-modal-error' : 'copy-modal-success'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="copy-modal-title">{copyStatus.isError ? '提示' : '复制成功'}</div>
            <div className="copy-modal-message">{copyStatus.message}</div>
            <button
              className="copy-modal-button"
              onClick={() => setCopyStatus({ ...copyStatus, visible: false })}
            >
              确定
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
