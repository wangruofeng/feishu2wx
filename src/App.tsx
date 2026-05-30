import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import EditorPane from './components/EditorPane';
import PreviewPane from './components/PreviewPane';
import ThemeSwitcher from './components/ThemeSwitcher';
import SettingsPanel from './components/SettingsPanel';
import PublishDialog from './components/PublishDialog';
import { renderMarkdown, setCodeBlockStyle, CodeBlockStyle, setShowHorizontalRule } from './utils/markdownRenderer';
import { copyHtmlToWeChat, copySelectedToWeChat, formatForWeChat, convertSvgImagesToPng } from './utils/wechatCopy';
import { fetchWechatConfig, saveWechatConfig, deleteWechatConfig } from './utils/publishApi';
import exampleMd from './data/example';
import './App.css';
import './styles/themes.css';
import 'highlight.js/styles/atom-one-dark.css';

const App: React.FC = () => {
  const savedMarkdown = localStorage.getItem('feishu2wx_markdown') || '';
  const savedTheme = localStorage.getItem('feishu2wx_theme') || 'classic';
  const savedFont = localStorage.getItem('feishu2wx_font') || 'default';
  const savedCodeBlockStyle = localStorage.getItem('feishu2wx_codeBlockStyle') as CodeBlockStyle || 'modern';
  const savedImageBorderStyle = localStorage.getItem('feishu2wx_imageBorderStyle') as 'border' | 'shadow' | 'default' || 'border';
  const savedShowH1 = localStorage.getItem('feishu2wx_showH1') === 'true';
  const savedInvertH1 = localStorage.getItem('feishu2wx_invertH1') === 'true';
  const savedAlignH1Left = localStorage.getItem('feishu2wx_alignH1Left') === 'true';
  const savedShowHorizontalRule = localStorage.getItem('feishu2wx_showHorizontalRule') !== 'false';
  const savedTableShadow = localStorage.getItem('feishu2wx_tableShadow') !== 'false';
  const savedDarkMode = localStorage.getItem('feishu2wx_darkMode') as 'system' | 'light' | 'dark' || 'system';

  const [markdown, setMarkdown] = useState<string>(savedMarkdown);
  const [html, setHtml] = useState<string>('');
  const [theme, setTheme] = useState<string>(savedTheme);
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [isCopying, setIsCopying] = useState<boolean>(false);
  const [showEditor, setShowEditor] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [font, setFont] = useState<string>(savedFont);
  const [isSystemDark, setIsSystemDark] = useState<boolean>(false);
  const [showH1, setShowH1] = useState<boolean>(savedShowH1);
  const [invertH1, setInvertH1] = useState<boolean>(savedInvertH1);
  const [alignH1Left, setAlignH1Left] = useState<boolean>(savedAlignH1Left);
  const [imageBorderStyle, setImageBorderStyle] = useState<'border' | 'shadow' | 'default'>(savedImageBorderStyle);
  const [codeBlockStyle, setCodeBlockStyleState] = useState<CodeBlockStyle>(savedCodeBlockStyle);
  const [showHorizontalRule, setShowHorizontalRuleState] = useState<boolean>(savedShowHorizontalRule);
  const [tableShadow, setTableShadow] = useState<boolean>(savedTableShadow);
  const [copyStatus, setCopyStatus] = useState<{ visible: boolean; message: string; isError: boolean }>({
    visible: false,
    message: '',
    isError: false,
  });
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [mobileTab, setMobileTab] = useState<'edit' | 'preview'>('edit');
  const [publishOpen, setPublishOpen] = useState<boolean>(false);
  const [wechatConfigured, setWechatConfigured] = useState<boolean>(false);
  const [publishHtml, setPublishHtml] = useState<string>('');
  const [darkMode, setDarkMode] = useState<'system' | 'light' | 'dark'>(savedDarkMode);

  const copyStatusTimerRef = useRef<number | null>(null);
  const previewScrollRef = useRef<HTMLDivElement | null>(null);
  const editorScrollFrameRef = useRef<number | null>(null);
  const pendingEditorScrollRef = useRef<HTMLTextAreaElement | null>(null);

  const syncPreviewScrollFromEditor = useCallback(() => {
    const editor = pendingEditorScrollRef.current;
    const preview = previewScrollRef.current;

    editorScrollFrameRef.current = null;

    if (!editor || !preview || !showEditor || isFullscreen) {
      return;
    }

    const editorRect = editor.getBoundingClientRect();
    const previewRect = preview.getBoundingClientRect();
    const isSideBySide = editorRect.right <= previewRect.left + 1;
    if (!isSideBySide) {
      return;
    }

    const editorMax = editor.scrollHeight - editor.clientHeight;
    const previewMax = preview.scrollHeight - preview.clientHeight;
    if (previewMax <= 0) {
      preview.scrollTop = 0;
      return;
    }

    const ratio = editorMax <= 0 ? 0 : editor.scrollTop / editorMax;
    const targetScrollTop = Math.max(0, Math.min(previewMax, ratio * previewMax));

    if (Math.abs(preview.scrollTop - targetScrollTop) > 1) {
      preview.scrollTop = targetScrollTop;
    }
  }, [isFullscreen, showEditor]);

  const handleEditorScroll = useCallback((e: React.UIEvent<HTMLTextAreaElement>) => {
    pendingEditorScrollRef.current = e.currentTarget;

    if (editorScrollFrameRef.current !== null) {
      return;
    }

    editorScrollFrameRef.current = window.requestAnimationFrame(syncPreviewScrollFromEditor);
  }, [syncPreviewScrollFromEditor]);

  // 检测系统暗黑模式
  useEffect(() => {
    fetchWechatConfig()
      .then((data) => setWechatConfigured(data.configured))
      .catch(() => setWechatConfigured(false));
  }, []);

  useEffect(() => { localStorage.setItem('feishu2wx_darkMode', darkMode); }, [darkMode]);

  const articleTitle = useMemo(() => {
    const h1Match = markdown.match(/^#\s+(.+)$/m);
    return h1Match ? h1Match[1].trim() : '未命名文章';
  }, [markdown]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsSystemDark(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsSystemDark(e.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
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

  useEffect(() => {
    const rendered = renderMarkdown(markdown);
    setHtml(rendered);
  }, [markdown]);

  useEffect(() => { localStorage.setItem('feishu2wx_markdown', markdown); }, [markdown]);
  useEffect(() => { localStorage.setItem('feishu2wx_theme', theme); }, [theme]);
  useEffect(() => { localStorage.setItem('feishu2wx_font', font); }, [font]);
  useEffect(() => { localStorage.setItem('feishu2wx_codeBlockStyle', codeBlockStyle); }, [codeBlockStyle]);
  useEffect(() => { localStorage.setItem('feishu2wx_imageBorderStyle', imageBorderStyle); }, [imageBorderStyle]);
  useEffect(() => { localStorage.setItem('feishu2wx_showH1', String(showH1)); }, [showH1]);
  useEffect(() => { localStorage.setItem('feishu2wx_invertH1', String(invertH1)); }, [invertH1]);
  useEffect(() => { localStorage.setItem('feishu2wx_alignH1Left', String(alignH1Left)); }, [alignH1Left]);

  useEffect(() => {
    localStorage.setItem('feishu2wx_showHorizontalRule', String(showHorizontalRule));
    setShowHorizontalRule(showHorizontalRule);
    const rendered = renderMarkdown(markdown);
    setHtml(rendered);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showHorizontalRule]);

  useEffect(() => { localStorage.setItem('feishu2wx_tableShadow', String(tableShadow)); }, [tableShadow]);

  useEffect(() => {
    if (copyStatusTimerRef.current) {
      window.clearTimeout(copyStatusTimerRef.current);
      copyStatusTimerRef.current = null;
    }

    if (copyStatus.visible) {
      copyStatusTimerRef.current = window.setTimeout(() => {
        setCopyStatus((status) => ({ ...status, visible: false }));
      }, copyStatus.isError ? 6000 : 3200);
    }

    return () => {
      if (copyStatusTimerRef.current) {
        window.clearTimeout(copyStatusTimerRef.current);
        copyStatusTimerRef.current = null;
      }
    };
  }, [copyStatus.visible, copyStatus.isError]);

  useEffect(() => {
    return () => {
      if (editorScrollFrameRef.current !== null) {
        window.cancelAnimationFrame(editorScrollFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setCodeBlockStyle(codeBlockStyle);
    const rendered = renderMarkdown(markdown);
    setHtml(rendered);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeBlockStyle]);

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

  const isDark = darkMode === 'system' ? isSystemDark : darkMode === 'dark';
  const displayTheme = theme === 'light' || theme === 'dark' ? (isDark ? 'dark' : 'light') : theme;
  const wechatTheme = isDark ? 'dark' : displayTheme;

  const handleCopyToWeChat = useCallback(async () => {
    setIsCopying(true);
    try {
      const selection = window.getSelection();
      let hasValidSelection = false;

      if (selection && selection.rangeCount > 0) {
        try {
          const range = selection.getRangeAt(0);
          const previewElement = document.querySelector('.preview-content');
          const selectedText = selection.toString().trim();

          if (selectedText.length > 0 && previewElement && previewElement.contains(range.commonAncestorContainer)) {
            hasValidSelection = true;
          }
        } catch (e) {
          hasValidSelection = false;
        }
      }

      let result;
      if (hasValidSelection) {
        result = await copySelectedToWeChat(wechatTheme, font, showH1, imageBorderStyle, codeBlockStyle, invertH1);
      } else {
        if (!html.trim()) {
          setCopyStatus({
            visible: true,
            message: '请先输入或粘贴内容',
            isError: true,
          });
          setIsCopying(false);
          return;
        }
        result = await copyHtmlToWeChat(html, wechatTheme, font, showH1, imageBorderStyle, codeBlockStyle, invertH1);
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
        message: '复制失败，请刷新页面后重试',
        isError: true,
      });
    } finally {
      setIsCopying(false);
    }
  }, [html, displayTheme, font, showH1, imageBorderStyle, codeBlockStyle, invertH1]);

  const handleLoadExample = useCallback(() => {
    setMarkdown(exampleMd);
  }, []);

  // 响应式移动端检测
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 主内容区的类名
  const mainClasses = [
    'main-container',
    `device-${device}`,
    isFullscreen ? 'fullscreen' : '',
    // 桌面端：由 showEditor 控制
    !isMobile && !showEditor ? 'editor-hidden' : '',
    // 移动端：由 mobileTab 控制
    isMobile && mobileTab === 'edit' ? 'preview-hidden' : '',
    isMobile && mobileTab === 'preview' ? 'editor-hidden' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={`app theme-${displayTheme}${isDark ? ' theme-dark' : ''}`}>
      {/* 顶栏 */}
      <div className={`top-bar ${isFullscreen ? 'fullscreen-bar' : ''}`}>
        <span className="top-bar-brand" title="飞书文档转公众号排版一键排版工具，秒级完成排版，效率起飞还免费">feishu<span className="brand-accent">2wx</span></span>
        <a
          className="github-link"
          href="https://github.com/wangruofeng/feishu2wx"
          target="_blank"
          rel="noopener noreferrer"
          title="GitHub"
        >
          <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
          </svg>
        </a>

        <div className="top-bar-center">
          {!isFullscreen && <ThemeSwitcher theme={theme} setTheme={setTheme} />}
        </div>

        <div className="top-bar-right">
          <button
            className={`settings-trigger ${settingsOpen ? 'active' : ''}`}
            onClick={() => setSettingsOpen(!settingsOpen)}
            title="设置"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2">
              <path
                d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </button>
          <SettingsPanel
            font={font}
            setFont={setFont}
            showH1={showH1}
            onToggleH1={() => setShowH1(!showH1)}
            invertH1={invertH1}
            onToggleInvertH1={() => setInvertH1(!invertH1)}
            alignH1Left={alignH1Left}
            onToggleAlignH1Left={() => setAlignH1Left(!alignH1Left)}
            showHorizontalRule={showHorizontalRule}
            onToggleHorizontalRule={() => setShowHorizontalRuleState(!showHorizontalRule)}
            tableShadow={tableShadow}
            onToggleTableShadow={() => setTableShadow(!tableShadow)}
            imageBorderStyle={imageBorderStyle}
            onToggleImageBorder={() => {
              const next = imageBorderStyle === 'default' ? 'border' : imageBorderStyle === 'border' ? 'shadow' : 'default';
              setImageBorderStyle(next);
            }}
            codeBlockStyle={codeBlockStyle}
            onToggleCodeBlockStyle={() => setCodeBlockStyleState(codeBlockStyle === 'classic' ? 'modern' : 'classic')}
            isOpen={settingsOpen}
            onClose={() => setSettingsOpen(false)}
            wechatConfigured={wechatConfigured}
            onSaveWechatConfig={async (appId: string, appSecret: string) => {
              const result = await saveWechatConfig(appId, appSecret);
              if (result.success) setWechatConfigured(true);
              return result;
            }}
            onDeleteWechatConfig={async () => {
              await deleteWechatConfig();
              setWechatConfigured(false);
            }}
            darkMode={darkMode}
            onDarkModeChange={setDarkMode}
          />
          {isFullscreen && (
            <button className="edit-toggle-btn" onClick={() => setIsFullscreen(false)}>
              退出
            </button>
          )}
          {!showEditor && !isFullscreen && (
            <button className="edit-toggle-btn" onClick={() => setShowEditor(true)}>
              编辑
            </button>
          )}
          {showEditor && !isFullscreen && (
            <button className="edit-toggle-btn" onClick={() => setShowEditor(false)}>
              预览
            </button>
          )}
          <button
            className="copy-btn"
            onClick={handleCopyToWeChat}
            disabled={isCopying || !markdown.trim()}
          >
            复制
          </button>
          <button
            className="publish-btn-top"
            onClick={async () => {
              const htmlWithRasterizedSvg = await convertSvgImagesToPng(html);
              const formatted = formatForWeChat(htmlWithRasterizedSvg, wechatTheme, font, showH1, imageBorderStyle, codeBlockStyle, invertH1);
              setPublishHtml(formatted);
              setPublishOpen(true);
            }}
            disabled={!wechatConfigured || !markdown.trim()}
            title={!wechatConfigured ? '请先在设置中配置公众号' : '推送到草稿箱'}
          >
            推送
          </button>
        </div>
      </div>

      {/* 移动端 Tab 切换栏 */}
      {!isFullscreen && (
        <div className="mobile-tab-bar">
          <button
            className={`mobile-tab ${mobileTab === 'edit' ? 'active' : ''}`}
            onClick={() => setMobileTab('edit')}
          >
            编辑
          </button>
          <button
            className={`mobile-tab ${mobileTab === 'preview' ? 'active' : ''}`}
            onClick={() => setMobileTab('preview')}
          >
            预览
          </button>
        </div>
      )}

      {/* 主内容区 */}
      <main className={mainClasses}>
        <EditorPane
          markdown={markdown}
          setMarkdown={setMarkdown}
          onScroll={handleEditorScroll}
          onLoadExample={handleLoadExample}
        />
        <PreviewPane
          html={html}
          device={device}
          isFullscreen={isFullscreen}
          font={font}
          showH1={showH1}
          invertH1={invertH1}
          alignH1Left={alignH1Left}
          tableShadow={tableShadow}
          imageBorderStyle={imageBorderStyle}
          scrollRef={previewScrollRef}
          onDeviceChange={setDevice}
          onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
        />
      </main>

      {/* Toast */}
      {copyStatus.visible && (
        <div
          className={`copy-toast ${copyStatus.isError ? 'copy-toast-error' : 'copy-toast-success'}`}
          role={copyStatus.isError ? 'alert' : 'status'}
          onClick={() => setCopyStatus({ ...copyStatus, visible: false })}
        >
          <div className="copy-toast-title">{copyStatus.isError ? '提示' : '复制成功'}</div>
          <div className="copy-toast-message">{copyStatus.message}</div>
        </div>
      )}

      {/* 推送弹窗 */}
      <PublishDialog
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        title={articleTitle}
        htmlContent={publishHtml}
      />
    </div>
  );
};

export default App;
