import React, { useState, useEffect, useCallback } from 'react';
import EditorPane from './components/EditorPane';
import PreviewPane from './components/PreviewPane';
import ThemeSwitcher from './components/ThemeSwitcher';
import DevicePreviewToggle from './components/DevicePreviewToggle';
import FontSelector from './components/FontSelector';
import Toolbar from './components/Toolbar';
import { renderMarkdown } from './utils/markdownRenderer';
import { copyHtmlToWeChat } from './utils/wechatCopy';
import './App.css';
import './styles/themes.css';

const App: React.FC = () => {
  const [markdown, setMarkdown] = useState<string>('');
  const [html, setHtml] = useState<string>('');
  const [theme, setTheme] = useState<string>('green');
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [isCopying, setIsCopying] = useState<boolean>(false);
  const [showEditor, setShowEditor] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [font, setFont] = useState<string>('default');
  const [isSystemDark, setIsSystemDark] = useState<boolean>(false);
  const [showH1, setShowH1] = useState<boolean>(true);
  const [imageBorderStyle, setImageBorderStyle] = useState<'border' | 'shadow'>('border');

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

  // 一键复制到微信公众号
  const handleCopyToWeChat = useCallback(async () => {
    if (!html.trim()) {
      alert('请先输入或粘贴内容');
      return;
    }

    setIsCopying(true);
    try {
      const result = await copyHtmlToWeChat(html, displayTheme, font, showH1, imageBorderStyle);
      alert(result.message);
    } catch (error) {
      console.error('复制失败:', error);
      alert('❌ 复制失败。\n\n请手动选择右侧预览区域的内容，按 Ctrl+C (Windows) 或 Cmd+C (Mac) 复制，然后粘贴到微信公众号编辑器。');
    } finally {
      setIsCopying(false);
    }
  }, [html, displayTheme, font, showH1]);

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
                    className="header-btn"
                    onClick={() => setShowEditor(!showEditor)}
                    title={showEditor ? '隐藏源码' : '显示源码'}
                  >
                    {showEditor ? '👁️ 隐藏源码' : '👁️‍🗨️ 显示源码'}
                  </button>
                )}
                <button
                  className="header-btn header-btn-exit"
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
          />
        </footer>
      )}
    </div>
  );
};

export default App;
