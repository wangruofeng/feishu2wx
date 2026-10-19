import PanelResizeHandle from '../ui/PanelResizeHandle';
import { confirmAction } from '../ui/ConfirmDialog';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, GearIcon } from '../ui';
import AiMessageBubble from './AiMessageBubble';
import type { AiLiveState } from './AiMessageBubble';
import AiProviderSettings from './AiProviderSettings';
import ModelSelect from './ModelSelect';
import './AiChatPanel.css';
import useAiConversations from './useAiConversations';
import type { PendingAttachment } from './useAiConversations';
import AiConversationBar from './AiConversationBar';
import {
  MAX_AI_ATTACHMENTS,
  AI_INPUT_HISTORY_LIMIT,
  newAiId,
  loadAiProviderSettings,
  saveAiProviderSettings,
  getAiCloudSession,
  loadAiCloudSettings,
  saveAiCloudSettings,
  logoutAiCloudSession,
  readAiSseStream,
  createAiStreamParser,
  streamAiChat,
  isSameAiDay,
  formatAiDayDivider,
} from '../../utils/aiChat';
import type { AiCloudUser, AiChatHistoryMessage, AiChatMessage, AiImage, AiTextAttachment, AiTokenUsage, AiProviderSettings as AiProviderSettingsData } from '../../utils/aiChat';
import { normalizeAiTokenUsage } from '../../utils/aiTokenUsage';
import { readImageFileAsAiImage } from '../../utils/aiImages';
import { readTextFileAsAttachment } from '../../utils/aiFiles';

interface Props {
  open: boolean;
  onClose: () => void;
  markdown: string;
  onApplyArticle: (article: string) => void;
  autoOpenSettings?: boolean;
  showTokenUsage?: boolean;
  panelWidth?: number;
  onWidthChange?: (width: number) => void;
  /** 显示方式：drawer 抽屉浮层（默认）｜sidebar 右侧侧栏（内容避让不重叠） */
  mode?: 'drawer' | 'sidebar';
}

const SCROLL_FOLLOW_THRESHOLD = 80;
const CLOUD_SAVE_DELAY = 300;
const STATIC_DEPLOY_HINT = '当前部署未提供 AI 代理接口：GitHub Pages 静态部署不支持 AI 功能，请使用本地 npm run dev / cf:dev 或 Cloudflare Pages 部署版本。';

/* 组装请求历史；assistant 历史只回传说明文字，不带修改稿，避免 token 膨胀 */
const toHistory = (messages: AiChatMessage[]): AiChatHistoryMessage[] => messages
  .filter((m) => !m.error)
  .map((m) => ({
    role: m.role,
    content: m.role === 'assistant' && !m.content ? '（已提供修改稿）' : m.content,
    attachments: m.role === 'user'
      ? m.attachments?.filter((file) => file.content)
      : undefined,
  }));

/* 线性描边图标（lucide 风格），发送/停止按钮内使用 */
const IcoArrowUp = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <path d="m5 12 7-7 7 7" />
    <path d="M12 19V5" />
  </svg>
);

const IcoStop = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor">
    <rect x="2" y="2" width="20" height="20" rx="4.5" />
  </svg>
);

/* 附件统一入口（图片 / md / csv / json 等），参考聊天应用「+」按钮 */
const IcoPlus = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14" />
    <path d="M12 5v14" />
  </svg>
);

const AiChatPanel: React.FC<Props> = ({ open, onClose, markdown, onApplyArticle, autoOpenSettings, showTokenUsage = false, panelWidth = 420, onWidthChange, mode = 'drawer' }) => {
  const [providerSettings, setProviderSettings] = useState<AiProviderSettingsData>(() => loadAiProviderSettings());
  const conversations = useAiConversations(providerSettings);
  const { active, update, read, controllers } = conversations;
  const conversationId = active.id;
  const { messages, live, streaming, input, pendingFiles } = active;
  const setMessages = useCallback((action: React.SetStateAction<AiChatMessage[]>) => update(conversationId, c => ({ messages: typeof action === 'function' ? action(c.messages) : action })), [conversationId, update]);
  const setInput = useCallback((value: string) => update(conversationId, () => ({ input: value })), [conversationId, update]);
  const setPendingFiles = useCallback((action: React.SetStateAction<PendingAttachment[]>) => update(conversationId, c => ({ pendingFiles: typeof action === 'function' ? action(c.pendingFiles) : action }), true), [conversationId, update]);
  const setLive = useCallback((action: React.SetStateAction<AiLiveState | null>) => update(conversationId, c => ({ live: typeof action === 'function' ? action(c.live) : action }), true), [conversationId, update]);
  const setStreaming = useCallback((value: boolean) => update(conversationId, () => ({ streaming: value }), true), [conversationId, update]);
  const [cloudUser, setCloudUser] = useState<AiCloudUser | null>(null);
  const [cloudSessionLoading, setCloudSessionLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const [resizing, setResizing] = useState(false);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = '0px';
    textarea.style.height = `${Math.max(32, Math.min(140, textarea.scrollHeight))}px`;
  }, [input, open, conversationId]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const historyCursorRef = useRef(-1);
  const draftRef = useRef('');
  const cloudSaveTimerRef = useRef<number | null>(null);
  const cloudSaveQueueRef = useRef(Promise.resolve());

  const selectedProvider = providerSettings.providers.find(p => p.id === active.providerId);
  const activeProvider = selectedProvider && selectedProvider.enabled && selectedProvider.baseUrl.trim()
    && (cloudUser || selectedProvider.apiKey.trim()) ? selectedProvider : null;
  const activeModelId = activeProvider?.models.some(m => m.id && m.id === active.modelId) ? active.modelId : null;
  const modelUnavailable = active.modelInitialized && (!activeProvider || !activeModelId);

  useEffect(() => {
    if (cloudSessionLoading) return;
    if (active.modelInitialized || !providerSettings.activeProviderId || !providerSettings.activeModelId) return;
    update(conversationId, () => ({ providerId: providerSettings.activeProviderId, modelId: providerSettings.activeModelId, modelInitialized: true }));
  }, [cloudSessionLoading, active.modelInitialized, providerSettings.activeProviderId, providerSettings.activeModelId, conversationId, update]);
  useEffect(() => {
    historyCursorRef.current = -1;
    draftRef.current = '';
    setDragOver(false);
    const container = messagesScrollRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, [conversationId]);
  const canSend = (!streaming && !settingsOpen && (!!input.trim() || pendingFiles.length > 0) && !!activeProvider && !!activeModelId);

  useEffect(() => { if (autoOpenSettings) setSettingsOpen(true); }, [autoOpenSettings]);

  useEffect(() => {
    let cancelled = false;
    getAiCloudSession().then(async (user) => {
      if (!user) return;
      const cloudSettings = await loadAiCloudSettings();
      if (cancelled) return;
      setProviderSettings(cloudSettings);
      setCloudUser(user);
    }).catch(() => {}).finally(() => {
      if (!cancelled) setCloudSessionLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => () => {
    if (cloudSaveTimerRef.current !== null) window.clearTimeout(cloudSaveTimerRef.current);
  }, []);

  // ---- 滚动跟随：接近底部时自动滚到底 ----
  useEffect(() => {
    const container = messagesScrollRef.current;
    if (!container || !open) return;
    const distance = container.scrollHeight - container.scrollTop - container.clientHeight;
    if (distance < SCROLL_FOLLOW_THRESHOLD + 200) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages, live, open, conversationId]);

  // ---- Esc 层级：停止生成 → 关设置 → 关面板 ----
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (streaming) {
        controllers.current.get(conversationId)?.abort();
      } else if (settingsOpen) {
        setSettingsOpen(false);
      } else {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, streaming, settingsOpen, onClose, conversationId, controllers]);

  // ---- 供应商配置变更：即时持久化 ----
  const commitSettings = useCallback((next: AiProviderSettingsData) => {
    setProviderSettings(next);
    if (!cloudUser) {
      saveAiProviderSettings(next);
      return;
    }
    if (cloudSaveTimerRef.current !== null) window.clearTimeout(cloudSaveTimerRef.current);
    cloudSaveTimerRef.current = window.setTimeout(() => {
      cloudSaveTimerRef.current = null;
      cloudSaveQueueRef.current = cloudSaveQueueRef.current
        .catch(() => {})
        .then(async () => { await saveAiCloudSettings(next); })
        .catch(() => {});
    }, CLOUD_SAVE_DELAY);
  }, [cloudUser]);

  // 获取云端模型目录前刷新待保存配置，避免读到新增供应商或连接地址的旧版本。
  const flushCloudSettings = useCallback(async () => {
    if (!cloudUser) return;
    if (cloudSaveTimerRef.current !== null) {
      window.clearTimeout(cloudSaveTimerRef.current);
      cloudSaveTimerRef.current = null;
    }
    const pending = cloudSaveQueueRef.current.catch(() => {}).then(() => saveAiCloudSettings(providerSettings));
    cloudSaveQueueRef.current = pending.then(() => {}).catch(() => {});
    await pending;
  }, [cloudUser, providerSettings]);

  // ---- 附件输入（图片 + 文本文件，共 ≤ MAX_AI_ATTACHMENTS 个）----
  const addFiles = useCallback(async (files: Iterable<File>) => {
    const additions: PendingAttachment[] = [];
    for (const file of Array.from(files)) {
      const current = read(conversationId);
      if (!current || current.pendingFiles.length + additions.length >= MAX_AI_ATTACHMENTS) break;
      if (file.type.startsWith('image/')) {
        const image = await readImageFileAsAiImage(file);
        if (image) additions.push({ kind: 'image', image });
      } else {
        const textFile = await readTextFileAsAttachment(file);
        if (textFile) additions.push({ kind: 'text', file: textFile });
      }
    }
    if (additions.length) {
      setPendingFiles((prev) => [...prev, ...additions].slice(0, MAX_AI_ATTACHMENTS));
    }
  }, [conversationId, read, setPendingFiles]);

  const handleComposerPaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(e.clipboardData?.items ?? [])
      .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
      .map((item) => item.getAsFile())
      .filter((file): file is File => !!file);
    if (files.length) {
      e.preventDefault();
      addFiles(files);
    }
  }, [addFiles]);

  const handleComposerDrop = useCallback((e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer?.files ?? []);
    if (files.length) addFiles(files);
  }, [addFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) addFiles(files);
    e.target.value = '';
  }, [addFiles]);

  // ---- 输入历史：上/下方向键回溯 ----
  // handleSend 声明在下方，Enter 触发经 ref 解耦声明顺序
  const handleSendRef = useRef<(() => void) | null>(null);

  const handleInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendRef.current?.();
      return;
    }
    const history = active.inputHistory;
    if (!history.length || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
    // 仅在光标位于首行末行时才触发回溯，避免干扰多行编辑
    const lines = input.split('\n');
    const cursorLineIndex = input.slice(0, textareaRef.current?.selectionStart ?? 0).split('\n').length - 1;
    if (e.key === 'ArrowUp' && cursorLineIndex === 0) {
      e.preventDefault();
      if (historyCursorRef.current === -1) {
        draftRef.current = input;
        historyCursorRef.current = history.length - 1;
      } else {
        historyCursorRef.current = Math.max(0, historyCursorRef.current - 1);
      }
      setInput(history[historyCursorRef.current]);
    } else if (e.key === 'ArrowDown' && cursorLineIndex === lines.length - 1 && historyCursorRef.current !== -1) {
      e.preventDefault();
      historyCursorRef.current += 1;
      if (historyCursorRef.current >= history.length) {
        historyCursorRef.current = -1;
        setInput(draftRef.current);
      } else {
        setInput(history[historyCursorRef.current]);
      }
    }
  }, [input, active.inputHistory, setInput]);

  // ---- 流式生成一轮 assistant 回复（发送与编辑重发共用）----
  const runAssistantTurn = useCallback(async (params: {
    history: AiChatHistoryMessage[];
    content: string;
    images: AiImage[];
    attachments: AiTextAttachment[];
    requestSource: string;
    replyId: string;
  }) => {
    if (!activeProvider || !activeModelId) return;

    const startedAt = Date.now();
    let reasoningText = '';
    let usage: AiTokenUsage | undefined;
    setStreaming(true);
    setLive({ reply: '', reasoning: '', articleStarted: false });

    const parser = createAiStreamParser(
      (reply) => setLive((l) => (l ? { ...l, reply } : l)),
      () => setLive((l) => (l ? { ...l, articleStarted: true } : l))
    );
    const controller = new AbortController();
    controllers.current.set(conversationId, controller);
    let errorMessage = '';

    try {
      const response = await streamAiChat({
        source: params.requestSource,
        history: params.history,
        content: params.content,
        images: params.images,
        attachments: params.attachments,
        provider: activeProvider,
        cloudProviderId: cloudUser ? activeProvider.id : undefined,
        modelId: activeModelId,
        signal: controller.signal,
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}) as any);
        if (response.status === 404 || response.status === 405) {
          throw new Error(STATIC_DEPLOY_HINT);
        }
        throw new Error(data?.error ?? `AI 请求失败（${response.status}）`);
      }
      await readAiSseStream(response, (event) => {
        if (event.type === 'usage') {
          const snapshot = normalizeAiTokenUsage(event.usage);
          if (snapshot) usage = { ...usage, ...snapshot };
        } else if (event.type === 'reasoning' && event.text) {
          reasoningText += event.text;
          setLive((l) => (l ? { ...l, reasoning: l.reasoning + event.text } : l));
        } else if (event.type === 'delta' && event.text) {
          parser.push(event.text);
        } else if (event.type === 'error') {
          errorMessage = event.message ?? 'AI 生成中断，请重试。';
        }
      });
    } catch (error) {
      const aborted = controller.signal.aborted;
      if (!aborted) {
        const message = error instanceof Error ? error.message : '';
        errorMessage = /Failed to fetch|NetworkError|fetch failed/i.test(message)
          ? STATIC_DEPLOY_HINT
          : message || 'AI 请求失败';
      }
    } finally {
      const aborted = controller.signal.aborted;
      const result = parser.finish();
      setMessages((prev) => {
        const next = [...prev];
        for (let i = next.length - 1; i >= 0; i -= 1) {
          if (next[i].id === params.replyId) {
            next[i] = {
              ...next[i],
              content: result.replyText
                || (result.articleText ? '已生成修改稿。' : aborted ? '（已停止生成）' : errorMessage || '（无回复）'),
              article: result.articleText || undefined,
              reasoning: reasoningText || undefined,
              durationMs: Date.now() - startedAt,
              usage,
              interrupted: false,
              error: !result.replyText && !result.articleText && !!errorMessage && !aborted,
              truncated: !!result.articleText && !result.sawEndMarker,
            };
            break;
          }
        }
        return next;
      });
      update(conversationId, () => ({ updatedAt: Date.now() }));
      setLive(null);
      setStreaming(false);
      if (controllers.current.get(conversationId) === controller) controllers.current.delete(conversationId);
    }
  }, [activeProvider, activeModelId, cloudUser, conversationId, update, controllers, setLive, setMessages, setStreaming]);

  // ---- 发送 ----
  const handleSend = useCallback(async () => {
    const instruction = input.trim();
    const images = pendingFiles.filter((item): item is { kind: 'image'; image: AiImage } => item.kind === 'image').map((item) => item.image);
    const attachments = pendingFiles.filter((item): item is { kind: 'text'; file: AiTextAttachment } => item.kind === 'text').map((item) => item.file);
    if ((!instruction && pendingFiles.length === 0) || streaming) return;
    if (!activeProvider || !activeModelId) return;

    const requestSource = markdown;
    const content = instruction
      || (attachments.length && images.length ? '请结合这些附件理解并回答。'
        : attachments.length ? '请结合附件内容理解并回答。'
          : '请结合这些图片理解并回答。');
    const current = read(conversationId);
    if (!current || current.streaming) return;
    const history = toHistory(current.messages);
    const replyId = newAiId();

    setMessages((prev) => [
      ...prev,
      {
        id: newAiId(),
        role: 'user',
        content,
        images: images.length ? images : undefined,
        attachments: attachments.length ? attachments : undefined,
        createdAt: Date.now(),
      },
      {
        id: replyId,
        role: 'assistant',
        providerId: activeProvider.id,
        providerName: activeProvider.name || '未命名供应商',
        modelId: activeModelId,
        interrupted: true,
        content: '',
        requestSource,
        createdAt: Date.now(),
      },
    ]);
    setInput('');
    setPendingFiles([]);
    update(conversationId, c => ({
      inputHistory: instruction ? [...c.inputHistory.filter(s => s !== instruction), instruction].slice(-AI_INPUT_HISTORY_LIMIT) : c.inputHistory,
      title: !c.customTitle && c.messages.filter(m => m.role === 'user').length === 1 ? content.slice(0, 30) : c.title,
      updatedAt: Date.now(),
    }));
    historyCursorRef.current = -1;

    await runAssistantTurn({ history, content, images, attachments, requestSource, replyId });
  }, [input, pendingFiles, streaming, activeProvider, activeModelId, markdown, runAssistantTurn, conversationId, read, update, setInput, setMessages, setPendingFiles]);

  // ---- 编辑最后一条用户消息并重新发送（截断其后历史）----
  const handleEditResend = useCallback(async (id: string, text: string) => {
    const content = text.trim();
    if (!content || streaming) return;
    if (!activeProvider || !activeModelId) return;
    const current = read(conversationId);
    if (!current || current.streaming) return;
    const index = current.messages.findIndex((m) => m.id === id);
    if (index < 0 || current.messages[index].role !== 'user') return;

    const replyId = newAiId();
    const requestSource = markdown;
    const images = current.messages[index].images ?? [];
    // 持久化会剥离附件内容，重发时只带仍持有内容的附件
    const attachments = (current.messages[index].attachments ?? []).filter((file) => file.content);
    const history = toHistory(current.messages.slice(0, index));

    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === id);
      if (idx < 0) return prev;
      const next = prev.slice(0, idx + 1);
      next[idx] = { ...next[idx], content, createdAt: Date.now() };
      return [...next, {
        id: replyId,
        role: 'assistant',
        providerId: activeProvider.id,
        providerName: activeProvider.name || '未命名供应商',
        modelId: activeModelId,
        interrupted: true,
        content: '',
        requestSource,
        createdAt: Date.now(),
      }];
    });

    await runAssistantTurn({ history, content, images, attachments, requestSource, replyId });
  }, [streaming, activeProvider, activeModelId, markdown, runAssistantTurn, setMessages, conversationId, read]);

  handleSendRef.current = handleSend;

  // ---- 停止生成 ----
  const handleStop = useCallback(() => {
    controllers.current.get(conversationId)?.abort();
  }, [conversationId, controllers]);

  // ---- 清空对话 ----
  const handleClearChat = useCallback(async () => {
    if (streaming) return;
    if (messages.length && !await confirmAction('确定清空当前对话记录吗？')) return;
    setMessages([]);
  }, [messages.length, streaming, setMessages]);

  // ---- 应用修改 ----
  const handleApply = useCallback(async (message: AiChatMessage) => {
    if (!message.article) return;
    if (message.requestSource !== undefined && markdown !== message.requestSource
      && !await confirmAction('文章在 AI 处理期间已被修改，应用修改稿会覆盖这些修改。是否继续？')) {
      return;
    }
    onApplyArticle(message.article);
  }, [markdown, onApplyArticle]);

  // ---- 模型切换 ----
  const handleModelChange = useCallback((value: string) => {
    const separator = value.indexOf('::');
    const providerId = value.slice(0, separator);
    const modelId = value.slice(separator + 2);
    update(conversationId, () => ({ providerId, modelId, modelInitialized: true }));
  }, [conversationId, update]);

  const modelOptions = providerSettings.providers
    .filter((p) => p.enabled)
    .flatMap((p) => p.models
      .filter((m) => m.id)
      .map((m) => ({ value: `${p.id}::${m.id}`, label: m.id, menuLabel: `${p.name || '未命名供应商'} · ${m.id}` })));
  const activeModelValue = active.providerId && active.modelId ? `${active.providerId}::${active.modelId}` : '';
  if (modelUnavailable && active.modelId) modelOptions.unshift({ value: activeModelValue, label: `${active.modelId}（不可用）`, menuLabel: '原模型不可用，请选择其他模型' });

  // 最后一条用户消息：常显复制/编辑入口，编辑后从该处重发
  const lastUserMessageId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].role === 'user') return messages[i].id;
    }
    return null;
  }, [messages]);

  return (
    <div className={`ai-chat-overlay${resizing ? ' is-resizing' : ''}`}>
      <aside className={`ai-chat-drawer${open ? ' open' : ''}${mode === 'sidebar' ? ' ai-chat-drawer--sidebar' : ''}`} aria-label="AI 助手">
        {onWidthChange && open && (
          <PanelResizeHandle label="调整 AI 助手宽度" width={panelWidth} onChange={onWidthChange}
            reservedWidth={() => mode === 'sidebar' ? 320 : 32} onResizing={setResizing} />
        )}
        <div className="ai-chat-header">
          <h3>AI 助手</h3>
          <ModelSelect
            options={modelOptions}
            value={activeModelValue}
            onChange={handleModelChange}
            disabled={settingsOpen}
          />
          <Button
            variant="aiIconBtn"
            onClick={() => setSettingsOpen((v) => !v)}
            title="模型设置"
            aria-label="模型设置"
            active={settingsOpen}
          >
            <GearIcon size={16} />
          </Button>
          <Button
            variant="aiIconBtn"
            className="ai-icon-btn--danger"
            onClick={handleClearChat}
            title="清空对话"
            aria-label="清空对话"
            disabled={streaming || messages.length === 0}
          >
            🗑
          </Button>
          <Button variant="aiIconBtn" onClick={onClose} title="关闭" aria-label="关闭">✕</Button>
        </div>

        <AiConversationBar
          store={conversations.store}
          generatingIds={Array.from(controllers.current.keys())}
          onSelect={conversations.select}
          onCreate={conversations.create}
          onRename={(id, title) => update(id, () => ({ title, customTitle: true }))}
          onDelete={conversations.remove}
        />
        {conversations.storageError && <p className="ai-conversation-warning" role="alert">会话保存失败，请释放浏览器存储空间；当前页面中的记录仍保留。</p>}
        {modelUnavailable && <p className="ai-conversation-warning" role="status">当前会话的模型不可用，请重新选择模型或检查供应商设置。</p>}
        <div className="ai-chat-messages" ref={messagesScrollRef}>
          {messages.length === 0 && !live ? (
            <div className="ai-chat-empty">
              <strong>AI 聊天编辑</strong>
              发送指令让 AI 修改当前文章，例如「把标题改得更吸引人」「精简第二段」。
              <br />
              生成修改稿后可先「查看变更」再「应用修改」。
              {!activeProvider && (
                <>
                  <br />
                  请先点击 ⚙ 配置模型供应商。
                </>
              )}
            </div>
          ) : (
            messages.map((message, index) => {
              // 首条消息或与上一条跨天时，先渲染居中的日期分隔行
              const showDayDivider = message.createdAt > 0
                && (index === 0 || !isSameAiDay(messages[index - 1].createdAt, message.createdAt));
              return (
                <React.Fragment key={message.id}>
                  {showDayDivider && (
                    <div className="ai-day-divider">{formatAiDayDivider(message.createdAt)}</div>
                  )}
                  <AiMessageBubble
                    message={message}
                    showTokenUsage={showTokenUsage}
                    live={live && index === messages.length - 1 ? live : undefined}
                    isLastUser={message.id === lastUserMessageId}
                    onApply={handleApply}
                    onEdit={streaming ? undefined : handleEditResend}
                  />
                </React.Fragment>
              );
            })
          )}
        </div>

        <div className="ai-chat-composer">
          {!!pendingFiles.length && (
            <div className="ai-chat-attachments">
              {pendingFiles.map((item, index) => (
                item.kind === 'image' ? (
                  <div key={index} className="ai-attachment-thumb">
                    <img src={item.image.previewUrl} alt={`待发送 ${index + 1}`} />
                    <button
                      type="button"
                      className="ai-attachment-remove"
                      onClick={() => setPendingFiles((prev) => prev.filter((_, i) => i !== index))}
                      aria-label="移除图片"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div key={index} className="ai-attachment-file" title={item.file.name}>
                    <span className="ai-attachment-file-name">{item.file.name}</span>
                    <button
                      type="button"
                      className="ai-attachment-remove"
                      onClick={() => setPendingFiles((prev) => prev.filter((_, i) => i !== index))}
                      aria-label="移除附件"
                    >
                      ×
                    </button>
                  </div>
                )
              ))}
            </div>
          )}
          <div className={`ai-composer-row${dragOver ? ' is-dragover' : ''}`}>
            <Button
              variant="aiIconBtn"
              onClick={() => fileInputRef.current?.click()}
              title={`添加附件：图片、md、csv、json 等文本文件（最多 ${MAX_AI_ATTACHMENTS} 个）`}
              aria-label="添加附件"
              disabled={pendingFiles.length >= MAX_AI_ATTACHMENTS}
            >
              <IcoPlus />
            </Button>
            <textarea
              ref={textareaRef}
              className="ai-composer-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleInputKeyDown}
              onPaste={handleComposerPaste}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleComposerDrop}
              rows={1}
              placeholder={activeProvider ? '输入消息…' : '请先配置模型供应商'}
              aria-label="聊天消息"
              title="Enter 发送，Shift+Enter 换行"
            />
            {streaming ? (
              <Button variant="aiSendBtn" className="ai-send-btn--stop" onClick={handleStop} title="停止生成" aria-label="停止生成">
                <IcoStop />
              </Button>
            ) : (
              <Button variant="aiSendBtn" onClick={() => handleSendRef.current?.()} disabled={!canSend} title="发送" aria-label="发送">
                <IcoArrowUp />
              </Button>
            )}
          </div>
        </div>
      </aside>

      {/* 模型设置模态（portal 到 app，继承明暗主题） */}
      {settingsOpen && (
          <AiProviderSettings
            settings={providerSettings}
            onChange={commitSettings}
            onClose={() => setSettingsOpen(false)}
            cloudUser={cloudUser}
            cloudLoading={cloudSessionLoading}
            onBeforeModelFetch={flushCloudSettings}
            onLogin={() => { window.location.assign('/api/auth/github'); }}
            onLogout={() => { logoutAiCloudSession().then(() => { setCloudUser(null); setProviderSettings(loadAiProviderSettings()); }); }}
        />
      )}

      {/* 视觉隐藏的 file input（Safari 下 display:none 无法唤起选择框） */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,.md,.markdown,.txt,.csv,.tsv,.json,.yaml,.yml,.xml,.html,.htm,.css,.js,.jsx,.ts,.tsx,.py,.java,.go,.rs,.sql,.sh,.log,.toml,.ini"
        multiple
        onChange={handleFileSelect}
        style={{ position: 'absolute', width: '1px', height: '1px', opacity: 0, overflow: 'hidden', pointerEvents: 'none' }}
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  );
};

export default AiChatPanel;
