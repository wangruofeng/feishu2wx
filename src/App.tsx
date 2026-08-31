import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import EditorPane from './components/EditorPane';
import type { EditorPaneHandle } from './components/EditorPane';
import PreviewPane from './components/PreviewPane';
import ThemeSwitcher from './components/ThemeSwitcher';
import SettingsPanel from './components/SettingsPanel';
import PublishDialog from './components/PublishDialog';
import ShortcutsDrawer from './components/ShortcutsDrawer';
import AiChatPanel from './components/ai/AiChatPanel';
import ExportMenu, { ExportFormat } from './components/ExportMenu';
import { Button, GearIcon } from './components/ui';
import { renderMarkdown, renderMermaidBlocks, setCodeBlockStyle, CodeBlockStyle, setShowHorizontalRule, getFrontMatterField } from './utils/markdownRenderer';
import { MdSyntaxThemeKey } from './utils/mdSourceHighlight';
import { copyHtmlToWeChat, copySelectedToWeChat, formatForWeChat, convertSvgImagesToPng, exportHtmlToFile, exportMarkdownToFile, exportHtmlToPdf, sanitizeFilename } from './utils/wechatCopy';
import { isMarkerHighlightColor, MarkerHighlightColor } from './utils/markerHighlight';
import { buildCustomThemePalette, isValidHexColor } from './utils/themeColor';
import { fetchWechatConfig, saveWechatConfig, deleteWechatConfig } from './utils/publishApi';
import { createSettingsBackup, parseSettingsBackup, type SettingsBackup } from './utils/settingsBackup';
import exampleMd from './data/example';
import './App.css';
import './styles/themes.css';
import 'highlight.js/styles/atom-one-dark.css';

function splitMarkdownFrontMatter(markdown: string): { frontMatter: string; body: string } {
  const lines = markdown.split(/\r?\n/);
  if (lines[0]?.trim() !== '---') {
    return { frontMatter: '', body: markdown };
  }

  const endLineIndex = lines.findIndex((line, index) => index > 0 && line.trim() === '---');
  if (endLineIndex === -1) {
    return { frontMatter: '', body: markdown };
  }

  return {
    frontMatter: lines.slice(0, endLineIndex + 1).join('\n'),
    body: lines.slice(endLineIndex + 1).join('\n'),
  };
}

const App: React.FC = () => {
  const savedMarkdown = localStorage.getItem('feishu2wx_markdown') || '';
  const savedThemeValue = localStorage.getItem('feishu2wx_theme');
  const supportedThemes = ['classic', 'orange', 'blue', 'teal', 'custom'];
  const savedTheme = savedThemeValue && supportedThemes.includes(savedThemeValue) ? savedThemeValue : 'classic';
  const savedCustomThemeColor = localStorage.getItem('feishu2wx_customThemeColor') || '';
  const savedFont = localStorage.getItem('feishu2wx_font') || 'default';
  const savedShouldConvertPastedHtml = localStorage.getItem('feishu2wx_shouldConvertPastedHtml') !== 'false';
  const savedCodeBlockStyle = localStorage.getItem('feishu2wx_codeBlockStyle') as CodeBlockStyle || 'modern';
  const savedImageBorderStyleValue = localStorage.getItem('feishu2wx_imageBorderStyle');
  const savedImageBorderStyle = savedImageBorderStyleValue === 'default'
    || savedImageBorderStyleValue === 'border'
    || savedImageBorderStyleValue === 'shadow'
    ? savedImageBorderStyleValue
    : 'border';
  const savedImageBorderRadius = localStorage.getItem('feishu2wx_imageBorderRadius') === 'true';
  const savedShowH1Underline = (localStorage.getItem('feishu2wx_showH1Underline')
    ?? localStorage.getItem('feishu2wx_showH1')) === 'true';
  const savedInvertH1 = localStorage.getItem('feishu2wx_invertH1') === 'true';
  const savedAlignH1Left = localStorage.getItem('feishu2wx_alignH1Left') === 'true';
  const savedInvertH2 = localStorage.getItem('feishu2wx_invertH2') === 'true';
  const savedAlignH2Left = localStorage.getItem('feishu2wx_alignH2Left') === 'true';
  const savedShowH2Underline = localStorage.getItem('feishu2wx_showH2Underline') === 'true';
  const savedShowHorizontalRule = localStorage.getItem('feishu2wx_showHorizontalRule') !== 'false';
  const savedShowFrontMatter = localStorage.getItem('feishu2wx_showFrontMatter') !== 'false';
  const savedTableShadow = localStorage.getItem('feishu2wx_tableShadow') !== 'false';
  const savedBlockquoteBackgroundMode = localStorage.getItem('feishu2wx_blockquoteBackgroundMode') === 'none'
    || (!localStorage.getItem('feishu2wx_blockquoteBackgroundMode') && localStorage.getItem('feishu2wx_showBlockquoteBg') === 'false')
    ? 'none'
    : 'theme';
  const savedBlockquoteColorMode = localStorage.getItem('feishu2wx_blockquoteColorMode') === 'theme' ? 'theme' : 'default';
  const savedBlockquoteHeightMode = localStorage.getItem('feishu2wx_blockquoteHeightMode') === 'compact'
    ? 'compact'
    : localStorage.getItem('feishu2wx_blockquoteHeightMode') === 'loose'
      ? 'loose'
      : 'loose';
  const savedTextAlignMode = localStorage.getItem('feishu2wx_textAlignMode') === 'justify'
    ? 'justify'
    : localStorage.getItem('feishu2wx_textAlignMode') === 'left'
      ? 'left'
      : 'left';
  const savedHeaderTemplate = localStorage.getItem('feishu2wx_headerTemplate') || '';
  const savedFooterTemplate = localStorage.getItem('feishu2wx_footerTemplate') || '';
  const savedShowHeaderTemplate = localStorage.getItem('feishu2wx_showHeaderTemplate') !== 'false';
  const savedShowFooterTemplate = localStorage.getItem('feishu2wx_showFooterTemplate') !== 'false';
  const savedWechatLinkAutoAdapt = localStorage.getItem('feishu2wx_wechatLinkAutoAdapt') !== 'false';
  const savedMarkerHighlightColorValue = localStorage.getItem('feishu2wx_markerHighlightColor');
  const savedMarkerHighlightColor: MarkerHighlightColor = isMarkerHighlightColor(savedMarkerHighlightColorValue)
    ? savedMarkerHighlightColorValue
    : 'purple';
  const savedDarkMode = localStorage.getItem('feishu2wx_darkMode') as 'system' | 'light' | 'dark' || 'system';
  const savedSyntaxThemeValue = localStorage.getItem('feishu2wx_syntaxTheme');
  const supportedSyntaxThemes: MdSyntaxThemeKey[] = ['github', 'dracula', 'monokai', 'none'];
  const savedSyntaxTheme = supportedSyntaxThemes.includes(savedSyntaxThemeValue as MdSyntaxThemeKey)
    ? (savedSyntaxThemeValue as MdSyntaxThemeKey)
    : 'github';
  const savedAiPanelMode = localStorage.getItem('feishu2wx_aiPanelMode') === 'sidebar' ? 'sidebar' : 'drawer';

  const [markdown, setMarkdown] = useState<string>(savedMarkdown);
  const [html, setHtml] = useState<string>('');
  const [theme, setTheme] = useState<string>(savedTheme);
  const [customThemeColor, setCustomThemeColor] = useState<string>(savedCustomThemeColor);
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [isCopying, setIsCopying] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportMenuOpen, setExportMenuOpen] = useState<boolean>(false);
  const exportAnchorRef = useRef<HTMLButtonElement | null>(null);
  const [showEditor, setShowEditor] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [font, setFont] = useState<string>(savedFont);
  const [shouldConvertPastedHtml, setShouldConvertPastedHtml] = useState<boolean>(savedShouldConvertPastedHtml);
  const [isSystemDark, setIsSystemDark] = useState<boolean>(false);
  const [showH1Underline, setShowH1Underline] = useState<boolean>(savedShowH1Underline);
  const [invertH1, setInvertH1] = useState<boolean>(savedInvertH1);
  const [alignH1Left, setAlignH1Left] = useState<boolean>(savedAlignH1Left);
  const [invertH2, setInvertH2] = useState<boolean>(savedInvertH2);
  const [alignH2Left, setAlignH2Left] = useState<boolean>(savedAlignH2Left);
  const [showH2Underline, setShowH2Underline] = useState<boolean>(savedShowH2Underline);
  const [imageBorderStyle, setImageBorderStyle] = useState<'border' | 'shadow' | 'default'>(savedImageBorderStyle);
  const [imageBorderRadius, setImageBorderRadius] = useState<boolean>(savedImageBorderRadius);
  const [codeBlockStyle, setCodeBlockStyleState] = useState<CodeBlockStyle>(savedCodeBlockStyle);
  const [showHorizontalRule, setShowHorizontalRuleState] = useState<boolean>(savedShowHorizontalRule);
  const [showFrontMatter, setShowFrontMatter] = useState<boolean>(savedShowFrontMatter);
  const [tableShadow, setTableShadow] = useState<boolean>(savedTableShadow);
  const [blockquoteBackgroundMode, setBlockquoteBackgroundMode] = useState<'none' | 'theme'>(savedBlockquoteBackgroundMode);
  const [blockquoteColorMode, setBlockquoteColorMode] = useState<'default' | 'theme'>(savedBlockquoteColorMode);
  const [blockquoteHeightMode, setBlockquoteHeightMode] = useState<'loose' | 'compact'>(savedBlockquoteHeightMode);
  const [textAlignMode, setTextAlignMode] = useState<'left' | 'justify'>(savedTextAlignMode);
  const [headerTemplate, setHeaderTemplate] = useState<string>(savedHeaderTemplate);
  const [footerTemplate, setFooterTemplate] = useState<string>(savedFooterTemplate);
  const [showHeaderTemplate, setShowHeaderTemplate] = useState<boolean>(savedShowHeaderTemplate);
  const [showFooterTemplate, setShowFooterTemplate] = useState<boolean>(savedShowFooterTemplate);
  const [wechatLinkAutoAdapt, setWechatLinkAutoAdapt] = useState<boolean>(savedWechatLinkAutoAdapt);
  const [markerHighlightColor, setMarkerHighlightColor] = useState<MarkerHighlightColor>(savedMarkerHighlightColor);
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
  const [syntaxTheme, setSyntaxTheme] = useState<MdSyntaxThemeKey>(savedSyntaxTheme);
  // GitHub 登录回调带 ?ai_login=1 返回时，自动重开 AI 面板与模型设置
  const [aiLoginReturn] = useState(() => {
    if (new URLSearchParams(window.location.search).get('ai_login') !== '1') return false;
    window.history.replaceState(null, '', window.location.pathname);
    return true;
  });
  const [aiOpen, setAiOpen] = useState<boolean>(aiLoginReturn);
  const [aiPanelMode, setAiPanelMode] = useState<'drawer' | 'sidebar'>(savedAiPanelMode);
  const editorPaneRef = useRef<EditorPaneHandle>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState<boolean>(false);
  const [showBackTop, setShowBackTop] = useState<boolean>(false);

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

  // AI 应用修改稿：走 EditorPane 的存档 → 撤销栈 → 整体替换管道
  const handleApplyAiArticle = useCallback((article: string) => {
    editorPaneRef.current?.replaceWholeDocument(article);
  }, []);

  // 检测系统暗黑模式
  useEffect(() => {
    fetchWechatConfig()
      .then((data) => setWechatConfigured(data.configured))
      .catch(() => setWechatConfigured(false));
  }, []);

  useEffect(() => { localStorage.setItem('feishu2wx_darkMode', darkMode); }, [darkMode]);
  useEffect(() => { localStorage.setItem('feishu2wx_syntaxTheme', syntaxTheme); }, [syntaxTheme]);
  useEffect(() => { localStorage.setItem('feishu2wx_aiPanelMode', aiPanelMode); }, [aiPanelMode]);

  // 文章首/尾固定模板：预览、复制、推送均基于组合后的 Markdown，编辑器仍只编辑正文
  // front matter 始终置顶，首尾模板拼接到 front matter 之后 / 正文之后，显示开关关闭的片段不参与拼接
  const composedMarkdown = useMemo(() => {
    const { frontMatter, body } = splitMarkdownFrontMatter(markdown);
    return [frontMatter, showHeaderTemplate ? headerTemplate : '', body, showFooterTemplate ? footerTemplate : '']
      .map((part) => part.trim())
      .filter(Boolean)
      .join('\n\n');
  }, [headerTemplate, markdown, footerTemplate, showHeaderTemplate, showFooterTemplate]);

  // 标题优先取 front matter 的 title 字段，其次从正文（raw markdown）首个 H1 提取
  const articleTitle = useMemo(() => {
    const fmTitle = getFrontMatterField(markdown, 'title');
    if (fmTitle) return fmTitle;
    const h1Match = markdown.match(/^#\s+(.+)$/m);
    return h1Match ? h1Match[1].trim() : '未命名文章';
  }, [markdown]);

  const articleCover = useMemo(() => getFrontMatterField(markdown, 'cover'), [markdown]);

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
    const rendered = renderMarkdown(composedMarkdown, { showFrontMatter });
    if (!rendered.includes('class="mermaid"')) {
      setHtml(rendered);
      return;
    }
    let cancelled = false;
    (async () => {
      const withMermaid = await renderMermaidBlocks(rendered);
      if (!cancelled) setHtml(withMermaid);
    })();
    return () => { cancelled = true; };
  }, [composedMarkdown, showFrontMatter]);

  useEffect(() => { localStorage.setItem('feishu2wx_markdown', markdown); }, [markdown]);
  useEffect(() => { localStorage.setItem('feishu2wx_theme', theme); }, [theme]);
  useEffect(() => { localStorage.setItem('feishu2wx_customThemeColor', customThemeColor); }, [customThemeColor]);
  useEffect(() => { localStorage.setItem('feishu2wx_font', font); }, [font]);
  useEffect(() => { localStorage.setItem('feishu2wx_shouldConvertPastedHtml', String(shouldConvertPastedHtml)); }, [shouldConvertPastedHtml]);
  useEffect(() => { localStorage.setItem('feishu2wx_codeBlockStyle', codeBlockStyle); }, [codeBlockStyle]);
  useEffect(() => { localStorage.setItem('feishu2wx_imageBorderStyle', imageBorderStyle); }, [imageBorderStyle]);
  useEffect(() => { localStorage.setItem('feishu2wx_imageBorderRadius', String(imageBorderRadius)); }, [imageBorderRadius]);
  useEffect(() => { localStorage.setItem('feishu2wx_showH1Underline', String(showH1Underline)); }, [showH1Underline]);
  useEffect(() => { localStorage.setItem('feishu2wx_invertH1', String(invertH1)); }, [invertH1]);
  useEffect(() => { localStorage.setItem('feishu2wx_alignH1Left', String(alignH1Left)); }, [alignH1Left]);
  useEffect(() => { localStorage.setItem('feishu2wx_invertH2', String(invertH2)); }, [invertH2]);
  useEffect(() => { localStorage.setItem('feishu2wx_alignH2Left', String(alignH2Left)); }, [alignH2Left]);
  useEffect(() => { localStorage.setItem('feishu2wx_showH2Underline', String(showH2Underline)); }, [showH2Underline]);
  useEffect(() => { localStorage.setItem('feishu2wx_showFrontMatter', String(showFrontMatter)); }, [showFrontMatter]);

  useEffect(() => {
    localStorage.setItem('feishu2wx_showHorizontalRule', String(showHorizontalRule));
    setShowHorizontalRule(showHorizontalRule);
    const rendered = renderMarkdown(composedMarkdown, { showFrontMatter });
    if (!rendered.includes('class="mermaid"')) {
      setHtml(rendered);
      return;
    }
    let cancelled = false;
    (async () => {
      const withMermaid = await renderMermaidBlocks(rendered);
      if (!cancelled) setHtml(withMermaid);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showHorizontalRule]);

  useEffect(() => { localStorage.setItem('feishu2wx_tableShadow', String(tableShadow)); }, [tableShadow]);
  useEffect(() => { localStorage.setItem('feishu2wx_blockquoteBackgroundMode', blockquoteBackgroundMode); }, [blockquoteBackgroundMode]);
  useEffect(() => { localStorage.setItem('feishu2wx_blockquoteColorMode', blockquoteColorMode); }, [blockquoteColorMode]);
  useEffect(() => { localStorage.setItem('feishu2wx_blockquoteHeightMode', blockquoteHeightMode); }, [blockquoteHeightMode]);
  useEffect(() => { localStorage.setItem('feishu2wx_textAlignMode', textAlignMode); }, [textAlignMode]);
  useEffect(() => { localStorage.setItem('feishu2wx_headerTemplate', headerTemplate); }, [headerTemplate]);
  useEffect(() => { localStorage.setItem('feishu2wx_footerTemplate', footerTemplate); }, [footerTemplate]);
  useEffect(() => { localStorage.setItem('feishu2wx_showHeaderTemplate', String(showHeaderTemplate)); }, [showHeaderTemplate]);
  useEffect(() => { localStorage.setItem('feishu2wx_showFooterTemplate', String(showFooterTemplate)); }, [showFooterTemplate]);
  useEffect(() => { localStorage.setItem('feishu2wx_wechatLinkAutoAdapt', String(wechatLinkAutoAdapt)); }, [wechatLinkAutoAdapt]);
  useEffect(() => { localStorage.setItem('feishu2wx_markerHighlightColor', markerHighlightColor); }, [markerHighlightColor]);

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
    const rendered = renderMarkdown(composedMarkdown, { showFrontMatter });
    if (!rendered.includes('class="mermaid"')) {
      setHtml(rendered);
      return;
    }
    let cancelled = false;
    (async () => {
      const withMermaid = await renderMermaidBlocks(rendered);
      if (!cancelled) setHtml(withMermaid);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeBlockStyle]);

  // 响应式移动端检测
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 监听预览区滚动，控制回到顶部按钮显隐
  useEffect(() => {
    const preview = previewScrollRef.current;
    if (!preview) return;
    const handleScroll = () => {
      setShowBackTop(preview.scrollTop > preview.clientHeight);
    };
    preview.addEventListener('scroll', handleScroll, { passive: true });
    return () => preview.removeEventListener('scroll', handleScroll);
  }, [html]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
      if (e.altKey && e.code === 'KeyE' && !isMobile && !isFullscreen) {
        e.preventDefault();
        setShowEditor((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, isMobile]);

  const isDark = darkMode === 'system' ? isSystemDark : darkMode === 'dark';
  const displayTheme = theme === 'light' || theme === 'dark' ? (isDark ? 'dark' : 'light') : theme;
  const wechatTheme = displayTheme;

  // 自定义主题色：由主色推导完整色板，通过根节点 CSS 变量注入预览样式
  const customPalette = theme === 'custom' && customThemeColor
    ? buildCustomThemePalette(customThemeColor)
    : null;
  const customThemeVars = customPalette
    ? ({
        '--custom-primary': customPalette.primaryColor,
        '--custom-heading': customPalette.headingColor,
        '--custom-h3h6': customPalette.headingColorH3H6,
        '--custom-bg': customPalette.blockquoteBgColor,
      } as React.CSSProperties)
    : undefined;

  const handleCustomThemeColorChange = useCallback((color: string) => {
    const trimmed = color.trim();
    setCustomThemeColor(trimmed);
    if (isValidHexColor(trimmed)) {
      setTheme('custom');
    }
  }, []);

  const handleResetCustomThemeColor = useCallback(() => {
    setCustomThemeColor('');
    setTheme('classic');
  }, []);

  const handleExportSettings = useCallback(() => {
    const backup: SettingsBackup = {
      theme: theme as SettingsBackup['theme'], customThemeColor, font, shouldConvertPastedHtml,
      codeBlockStyle, imageBorderStyle, imageBorderRadius, showH1Underline, invertH1, alignH1Left,
      invertH2, alignH2Left, showH2Underline, showHorizontalRule, showFrontMatter, tableShadow, blockquoteBackgroundMode,
      blockquoteColorMode, blockquoteHeightMode, textAlignMode, headerTemplate, footerTemplate,
      showHeaderTemplate, showFooterTemplate, wechatLinkAutoAdapt, markerHighlightColor, darkMode,
      syntaxTheme, aiPanelMode,
    };
    const url = URL.createObjectURL(new Blob([createSettingsBackup(backup)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'feishu2wx-config.json';
    link.click();
    URL.revokeObjectURL(url);
  }, [theme, customThemeColor, font, shouldConvertPastedHtml, codeBlockStyle, imageBorderStyle, imageBorderRadius, showH1Underline, invertH1, alignH1Left, invertH2, alignH2Left, showH2Underline, showHorizontalRule, showFrontMatter, tableShadow, blockquoteBackgroundMode, blockquoteColorMode, blockquoteHeightMode, textAlignMode, headerTemplate, footerTemplate, showHeaderTemplate, showFooterTemplate, wechatLinkAutoAdapt, markerHighlightColor, darkMode, syntaxTheme, aiPanelMode]);

  const handleImportSettings = useCallback(async (file: File) => {
    const result = parseSettingsBackup(await file.text());
    if ('error' in result) return { success: false, error: result.error };
    const settings = result.settings;
    if (settings.theme) setTheme(settings.theme);
    if (settings.customThemeColor !== undefined) setCustomThemeColor(settings.customThemeColor);
    if (settings.font) setFont(settings.font);
    if (settings.shouldConvertPastedHtml !== undefined) setShouldConvertPastedHtml(settings.shouldConvertPastedHtml);
    if (settings.codeBlockStyle) setCodeBlockStyleState(settings.codeBlockStyle);
    if (settings.imageBorderStyle) setImageBorderStyle(settings.imageBorderStyle);
    if (settings.imageBorderRadius !== undefined) setImageBorderRadius(settings.imageBorderRadius);
    if (settings.showH1Underline !== undefined) setShowH1Underline(settings.showH1Underline);
    if (settings.invertH1 !== undefined) setInvertH1(settings.invertH1);
    if (settings.alignH1Left !== undefined) setAlignH1Left(settings.alignH1Left);
    if (settings.invertH2 !== undefined) setInvertH2(settings.invertH2);
    if (settings.alignH2Left !== undefined) setAlignH2Left(settings.alignH2Left);
    if (settings.showH2Underline !== undefined) setShowH2Underline(settings.showH2Underline);
    if (settings.showHorizontalRule !== undefined) setShowHorizontalRuleState(settings.showHorizontalRule);
    if (settings.showFrontMatter !== undefined) setShowFrontMatter(settings.showFrontMatter);
    if (settings.tableShadow !== undefined) setTableShadow(settings.tableShadow);
    if (settings.blockquoteBackgroundMode) setBlockquoteBackgroundMode(settings.blockquoteBackgroundMode);
    if (settings.blockquoteColorMode) setBlockquoteColorMode(settings.blockquoteColorMode);
    if (settings.blockquoteHeightMode) setBlockquoteHeightMode(settings.blockquoteHeightMode);
    if (settings.textAlignMode) setTextAlignMode(settings.textAlignMode);
    if (settings.headerTemplate !== undefined) setHeaderTemplate(settings.headerTemplate);
    if (settings.footerTemplate !== undefined) setFooterTemplate(settings.footerTemplate);
    if (settings.showHeaderTemplate !== undefined) setShowHeaderTemplate(settings.showHeaderTemplate);
    if (settings.showFooterTemplate !== undefined) setShowFooterTemplate(settings.showFooterTemplate);
    if (settings.wechatLinkAutoAdapt !== undefined) setWechatLinkAutoAdapt(settings.wechatLinkAutoAdapt);
    if (settings.markerHighlightColor) setMarkerHighlightColor(settings.markerHighlightColor);
    if (settings.darkMode) setDarkMode(settings.darkMode);
    if (settings.syntaxTheme) setSyntaxTheme(settings.syntaxTheme);
    if (settings.aiPanelMode) setAiPanelMode(settings.aiPanelMode);
    return { success: true };
  }, []);

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
        result = await copySelectedToWeChat(wechatTheme, font, showH1Underline, imageBorderStyle, imageBorderRadius, codeBlockStyle, invertH1, invertH2, alignH2Left, showH2Underline, blockquoteBackgroundMode !== 'none', blockquoteColorMode, blockquoteHeightMode, blockquoteBackgroundMode, textAlignMode, wechatLinkAutoAdapt, markerHighlightColor);
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
        result = await copyHtmlToWeChat(html, wechatTheme, font, showH1Underline, imageBorderStyle, imageBorderRadius, codeBlockStyle, invertH1, invertH2, alignH2Left, showH2Underline, blockquoteBackgroundMode !== 'none', blockquoteColorMode, blockquoteHeightMode, blockquoteBackgroundMode, textAlignMode, wechatLinkAutoAdapt, markerHighlightColor);
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
  }, [html, wechatTheme, font, showH1Underline, imageBorderStyle, imageBorderRadius, codeBlockStyle, invertH1, invertH2, alignH2Left, showH2Underline, blockquoteBackgroundMode, blockquoteColorMode, blockquoteHeightMode, textAlignMode, wechatLinkAutoAdapt, markerHighlightColor]);

  const handleExport = useCallback(async (format: ExportFormat) => {
    if (!html.trim()) {
      setCopyStatus({ visible: true, message: '请先输入或粘贴内容', isError: true });
      return;
    }
    setIsExporting(true);
    try {
      const filename = sanitizeFilename(articleTitle);
      if (format === 'md') {
        exportMarkdownToFile(composedMarkdown, `${filename}.md`);
        setCopyStatus({ visible: true, message: '导出成功，文件已开始下载', isError: false });
        return;
      }
      const htmlWithRasterizedSvg = await convertSvgImagesToPng(html);
      const formatted = formatForWeChat(htmlWithRasterizedSvg, wechatTheme, font, showH1Underline, imageBorderStyle, imageBorderRadius, codeBlockStyle, invertH1, invertH2, alignH2Left, showH2Underline, blockquoteBackgroundMode !== 'none', blockquoteColorMode, blockquoteHeightMode, blockquoteBackgroundMode, textAlignMode, wechatLinkAutoAdapt, markerHighlightColor);
      if (format === 'html') {
        exportHtmlToFile(formatted, `${filename}.html`);
        setCopyStatus({ visible: true, message: '导出成功，文件已开始下载', isError: false });
      } else {
        await exportHtmlToPdf(formatted, `${filename}.pdf`);
        setCopyStatus({ visible: true, message: '已在打印对话框中打开，请选择「另存为 PDF」', isError: false });
      }
    } catch (error) {
      console.error('导出失败:', error);
      setCopyStatus({ visible: true, message: '导出失败，请刷新页面后重试', isError: true });
    } finally {
      setIsExporting(false);
    }
  }, [html, composedMarkdown, articleTitle, wechatTheme, font, showH1Underline, imageBorderStyle, imageBorderRadius, codeBlockStyle, invertH1, invertH2, alignH2Left, showH2Underline, blockquoteBackgroundMode, blockquoteColorMode, blockquoteHeightMode, textAlignMode, wechatLinkAutoAdapt, markerHighlightColor]);

  const handleLoadExample = useCallback(() => {
    setMarkdown(exampleMd);
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

  // 侧栏模式：AI 面板占据右侧布局位，顶栏与主内容区左移避让（移动端始终为抽屉）
  const aiSidebarOpen = aiOpen && aiPanelMode === 'sidebar' && !isMobile;

  return (
    <div
      className={`app theme-${displayTheme}${isDark ? ' theme-dark' : ''}${aiSidebarOpen ? ' ai-sidebar-open' : ''}`}
      style={customThemeVars}
    >
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
          {!isFullscreen && <ThemeSwitcher theme={theme} setTheme={setTheme} customThemeColor={customThemeColor} />}
        </div>

        <div className="top-bar-right">
          <Button
            variant="settingsTrigger"
            active={settingsOpen}
            onClick={() => setSettingsOpen(!settingsOpen)}
            title="设置"
          >
            <GearIcon />
          </Button>
          <SettingsPanel
            font={font}
            setFont={setFont}
            shouldConvertPastedHtml={shouldConvertPastedHtml}
            onToggleShouldConvertPastedHtml={() => setShouldConvertPastedHtml(!shouldConvertPastedHtml)}
            showH1Underline={showH1Underline}
            onToggleH1Underline={() => setShowH1Underline(!showH1Underline)}
            invertH1={invertH1}
            onToggleInvertH1={() => setInvertH1(!invertH1)}
            alignH1Left={alignH1Left}
            onToggleAlignH1Left={() => setAlignH1Left(!alignH1Left)}
            invertH2={invertH2}
            onToggleInvertH2={() => setInvertH2(!invertH2)}
            alignH2Left={alignH2Left}
            onToggleAlignH2Left={() => setAlignH2Left(!alignH2Left)}
            showH2Underline={showH2Underline}
            onToggleH2Underline={() => setShowH2Underline(!showH2Underline)}
            showHorizontalRule={showHorizontalRule}
            onToggleHorizontalRule={() => setShowHorizontalRuleState(!showHorizontalRule)}
            showFrontMatter={showFrontMatter}
            onToggleShowFrontMatter={() => setShowFrontMatter(!showFrontMatter)}
            textAlignMode={textAlignMode}
            onChangeTextAlignMode={setTextAlignMode}
            markerHighlightColor={markerHighlightColor}
            onChangeMarkerHighlightColor={setMarkerHighlightColor}
            blockquoteBackgroundMode={blockquoteBackgroundMode}
            onChangeBlockquoteBackgroundMode={setBlockquoteBackgroundMode}
            blockquoteColorMode={blockquoteColorMode}
            onChangeBlockquoteColorMode={setBlockquoteColorMode}
            blockquoteHeightMode={blockquoteHeightMode}
            onChangeBlockquoteHeightMode={setBlockquoteHeightMode}
            tableShadow={tableShadow}
            onToggleTableShadow={() => setTableShadow(!tableShadow)}
            headerTemplate={headerTemplate}
            setHeaderTemplate={setHeaderTemplate}
            showHeaderTemplate={showHeaderTemplate}
            onToggleShowHeaderTemplate={() => setShowHeaderTemplate(!showHeaderTemplate)}
            footerTemplate={footerTemplate}
            setFooterTemplate={setFooterTemplate}
            showFooterTemplate={showFooterTemplate}
            onToggleShowFooterTemplate={() => setShowFooterTemplate(!showFooterTemplate)}
            imageBorderStyle={imageBorderStyle}
            onChangeImageBorderStyle={setImageBorderStyle}
            imageBorderRadius={imageBorderRadius}
            onToggleImageBorderRadius={() => setImageBorderRadius(!imageBorderRadius)}
            codeBlockStyle={codeBlockStyle}
            onToggleCodeBlockStyle={() => setCodeBlockStyleState(codeBlockStyle === 'classic' ? 'modern' : 'classic')}
            isOpen={settingsOpen}
            onClose={() => setSettingsOpen(false)}
            wechatConfigured={wechatConfigured}
            wechatLinkAutoAdapt={wechatLinkAutoAdapt}
            onToggleWechatLinkAutoAdapt={() => setWechatLinkAutoAdapt(!wechatLinkAutoAdapt)}
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
            syntaxTheme={syntaxTheme}
            onChangeSyntaxTheme={setSyntaxTheme}
            aiPanelMode={aiPanelMode}
            onChangeAiPanelMode={setAiPanelMode}
            customThemeColor={customThemeColor}
            onChangeCustomThemeColor={handleCustomThemeColorChange}
            onResetCustomThemeColor={handleResetCustomThemeColor}
            onExportSettings={handleExportSettings}
            onImportSettings={handleImportSettings}
          />
          {isFullscreen && (
            <Button className="exit-btn" onClick={() => setIsFullscreen(false)}>
              退出
            </Button>
          )}
          {!showEditor && !isFullscreen && (
            <Button onClick={() => setShowEditor(true)}>
              编辑
            </Button>
          )}
          {showEditor && !isFullscreen && (
            <Button onClick={() => setShowEditor(false)}>
              预览
            </Button>
          )}
          <Button
            variant="primary"
            onClick={handleCopyToWeChat}
            disabled={isCopying || !composedMarkdown.trim()}
          >
            复制
          </Button>
          <Button
            variant="outline"
            ref={exportAnchorRef}
            onClick={() => setExportMenuOpen((open) => !open)}
            disabled={isExporting || !composedMarkdown.trim()}
            title="导出文件"
            aria-haspopup="menu"
            aria-expanded={exportMenuOpen}
          >
            导出
          </Button>
          <ExportMenu
            open={exportMenuOpen}
            anchorRef={exportAnchorRef}
            onClose={() => setExportMenuOpen(false)}
            onExport={handleExport}
          />
          <Button
            variant="outline"
            onClick={async () => {
              const htmlWithRasterizedSvg = await convertSvgImagesToPng(html);
              const formatted = formatForWeChat(htmlWithRasterizedSvg, wechatTheme, font, showH1Underline, imageBorderStyle, imageBorderRadius, codeBlockStyle, invertH1, invertH2, alignH2Left, showH2Underline, blockquoteBackgroundMode !== 'none', blockquoteColorMode, blockquoteHeightMode, blockquoteBackgroundMode, textAlignMode, wechatLinkAutoAdapt, markerHighlightColor);
              setPublishHtml(formatted);
              setPublishOpen(true);
            }}
            disabled={!wechatConfigured || !composedMarkdown.trim()}
            title={!wechatConfigured ? '请先在设置中配置公众号' : '推送到草稿箱'}
          >
            推送
          </Button>
        </div>
      </div>

      {/* 移动端 Tab 切换栏 */}
      {!isFullscreen && (
        <div className="mobile-tab-bar">
          <Button
            variant="tab"
            active={mobileTab === 'edit'}
            onClick={() => setMobileTab('edit')}
          >
            编辑
          </Button>
          <Button
            variant="tab"
            active={mobileTab === 'preview'}
            onClick={() => setMobileTab('preview')}
          >
            预览
          </Button>
        </div>
      )}

      {/* 主内容区 */}
      <main className={mainClasses}>
        <EditorPane
          ref={editorPaneRef}
          markdown={markdown}
          setMarkdown={setMarkdown}
          shouldConvertPastedHtml={shouldConvertPastedHtml}
          onScroll={handleEditorScroll}
          onLoadExample={handleLoadExample}
          syntaxTheme={syntaxTheme}
        />
        <PreviewPane
          html={html}
          device={device}
          isFullscreen={isFullscreen}
          font={font}
          showH1Underline={showH1Underline}
          invertH1={invertH1}
          alignH1Left={alignH1Left}
          invertH2={invertH2}
          alignH2Left={alignH2Left}
          showH2Underline={showH2Underline}
          tableShadow={tableShadow}
          blockquoteBackgroundMode={blockquoteBackgroundMode}
          blockquoteColorMode={blockquoteColorMode}
          blockquoteHeightMode={blockquoteHeightMode}
          textAlignMode={textAlignMode}
          markerHighlightColor={markerHighlightColor}
          imageBorderStyle={imageBorderStyle}
          imageBorderRadius={imageBorderRadius}
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
        cover={articleCover}
        htmlContent={publishHtml}
      />

      {/* 浮动操作按钮 */}
      <div className="fab-group">
        {showBackTop && <button
          className="fab-btn"
          onClick={() => {
            const preview = previewScrollRef.current;
            if (preview) {
              preview.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
          title="回到顶部"
        >
          <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
            <path fillRule="evenodd" d="M8 1a.75.75 0 01.75.75v10.69l2.72-2.72a.75.75 0 111.06 1.06l-4 4a.75.75 0 01-1.06 0l-4-4a.75.75 0 111.06-1.06l2.72 2.72V1.75A.75.75 0 018 1z" transform="rotate(180 8 8)" />
          </svg>
        </button>}
        <button
          className="fab-btn"
          onClick={() => setAiOpen((v) => !v)}
          title="AI 助手"
        >
          <strong>AI</strong>
        </button>
        <button
          className="fab-btn"
          onClick={() => setShortcutsOpen(true)}
          title="快捷键"
        >
          <strong>?</strong>
        </button>
      </div>

      {/* 快捷键抽屉 */}
      <ShortcutsDrawer
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />

      {/* AI 聊天编辑面板 */}
      <AiChatPanel
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        mode={aiPanelMode}
        markdown={markdown}
        onApplyArticle={handleApplyAiArticle}
        autoOpenSettings={aiLoginReturn}
      />
    </div>
  );
};

export default App;
