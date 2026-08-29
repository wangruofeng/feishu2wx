// AI 聊天编辑核心：类型定义、供应商配置与聊天历史的 localStorage 持久化、
// SSE 流读取、<<<ARTICLE 标记状态机解析、后端代理请求封装。

export const AI_START_MARKER = '<<<ARTICLE';
export const AI_END_MARKER = 'ARTICLE>>>';
export const AI_HISTORY_LIMIT = 20;
export const AI_INPUT_HISTORY_LIMIT = 10;
export const MAX_AI_ATTACHMENTS = 6;

const API_BASE = process.env.REACT_APP_API_URL || '';
const CONFIG_KEY = 'feishu2wx_ai_config';
const MESSAGES_KEY = 'feishu2wx_ai_messages';
const INPUT_HISTORY_KEY = 'feishu2wx_ai_input_history';

export interface AiImage {
  mimeType: string;
  data: string;
  previewUrl: string;
}

export interface AiTextAttachment {
  name: string;
  size: number;
  content: string;
}

export interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  images?: AiImage[];
  attachments?: AiTextAttachment[];
  article?: string;
  requestSource?: string;
  reasoning?: string;
  error?: boolean;
  truncated?: boolean;
  createdAt: number;
}

export type AiApiFormat = 'anthropic' | 'chat-completions' | 'responses';

export interface AiProvider {
  id: string;
  name: string;
  enabled: boolean;
  baseUrl: string;
  apiFormat: AiApiFormat;
  apiKey: string;
  models: { id: string }[];
}

export interface AiProviderSettings {
  activeProviderId: string | null;
  activeModelId: string | null;
  providers: AiProvider[];
}

export interface AiCloudUser { login: string; avatarUrl: string; }

export interface AiSseEvent {
  type: 'reasoning' | 'delta' | 'error';
  text?: string;
  message?: string;
}

export interface AiChatHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
  attachments?: AiTextAttachment[];
}

const FORMAT_IDS = new Set<string>(['anthropic', 'chat-completions', 'responses']);

export function newAiId(): string {
  return globalThis.crypto?.randomUUID?.()
    ?? `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// ---- 供应商配置 ----

function normalizeModels(rawModels: unknown): { id: string }[] {
  if (!Array.isArray(rawModels)) return [];
  const models: { id: string }[] = [];
  const seen = new Set<string>();
  for (const item of rawModels) {
    const id = typeof item === 'string' ? item.trim() : String((item as any)?.id ?? '').trim();
    // 空行占位保留一个（「添加模型」的编辑中间态），使用方过滤空 id
    if (seen.has(id)) continue;
    seen.add(id);
    models.push({ id });
  }
  return models;
}

function normalizeProvider(raw: any, fallbackId = ''): AiProvider | null {
  if (!raw || typeof raw !== 'object') return null;
  const id = String(raw.id ?? '').trim() || fallbackId || newAiId();
  return {
    id,
    // 名称允许为空（placeholder 展示兜底），展示层用 name || '未命名供应商'；
    // 编辑过程中不 trim，否则名称里的空格刚输入就会被裁掉，落盘时统一裁剪
    name: String(raw.name ?? ''),
    enabled: raw.enabled !== false,
    baseUrl: String(raw.baseUrl ?? '').trim(),
    apiFormat: FORMAT_IDS.has(raw.apiFormat) ? raw.apiFormat : 'chat-completions',
    apiKey: String(raw.apiKey ?? ''),
    models: normalizeModels(raw.models),
  };
}

export function emptyProviderSettings(): AiProviderSettings {
  return { activeProviderId: null, activeModelId: null, providers: [] };
}

export function normalizeProviderSettings(raw: unknown): AiProviderSettings {
  if (!raw || typeof raw !== 'object') return emptyProviderSettings();
  const providers = Array.isArray((raw as any).providers)
    ? (raw as any).providers.map((item: unknown) => normalizeProvider(item)).filter(Boolean) as AiProvider[]
    : [];
  let activeProviderId = typeof (raw as any).activeProviderId === 'string' ? (raw as any).activeProviderId : null;
  let activeModelId = typeof (raw as any).activeModelId === 'string' ? (raw as any).activeModelId : null;
  if (activeProviderId && !providers.some((provider) => provider.id === activeProviderId)) {
    activeProviderId = null;
  }
  if (!activeProviderId) {
    const first = providers.find((provider) => provider.enabled) ?? providers[0] ?? null;
    activeProviderId = first?.id ?? null;
    if (first && !first.models.some((model) => model.id === activeModelId)) {
      activeModelId = first.models[0]?.id ?? null;
    }
  } else {
    const active = providers.find((provider) => provider.id === activeProviderId);
    if (active && !active.models.some((model) => model.id === activeModelId)) {
      activeModelId = active.models[0]?.id ?? null;
    }
  }
  return { activeProviderId, activeModelId, providers };
}

export function loadAiProviderSettings(): AiProviderSettings {
  try {
    return normalizeProviderSettings(JSON.parse(localStorage.getItem(CONFIG_KEY) ?? ''));
  } catch {
    return emptyProviderSettings();
  }
}

export function saveAiProviderSettings(settings: AiProviderSettings): void {
  const stored = {
    ...settings,
    providers: settings.providers.map((provider) => ({ ...provider, name: provider.name.trim() })),
  };
  localStorage.setItem(CONFIG_KEY, JSON.stringify(stored));
}

export function getActiveProvider(settings: AiProviderSettings): AiProvider | null {
  const provider = settings.providers.find((item) => item.id === settings.activeProviderId);
  if (!provider || !provider.enabled || !provider.apiKey.trim() || !provider.baseUrl.trim()) return null;
  return provider;
}

export async function getAiCloudSession(): Promise<AiCloudUser | null> {
  const response = await fetch(`${API_BASE}/api/auth/session`, { credentials: 'same-origin' });
  if (!response.ok) return null;
  const data = await response.json();
  return data?.user?.login ? { login: String(data.user.login), avatarUrl: String(data.user.avatarUrl ?? '') } : null;
}

export async function loadAiCloudSettings(): Promise<AiProviderSettings> {
  const response = await fetch(`${API_BASE}/api/ai/config`, { credentials: 'same-origin' });
  if (!response.ok) throw new Error('无法读取云端模型配置。');
  return normalizeProviderSettings(await response.json());
}

export async function saveAiCloudSettings(settings: AiProviderSettings): Promise<AiProviderSettings> {
  const response = await fetch(`${API_BASE}/api/ai/config`, { method: 'PUT', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) });
  if (!response.ok) throw new Error('无法保存云端模型配置。');
  return normalizeProviderSettings(await response.json());
}

export async function logoutAiCloudSession(): Promise<void> { await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST', credentials: 'same-origin' }); }

export function getActiveModelId(settings: AiProviderSettings): string | null {
  const provider = settings.providers.find((item) => item.id === settings.activeProviderId);
  if (!provider) return null;
  if (provider.models.some((model) => model.id === settings.activeModelId)) {
    return settings.activeModelId;
  }
  return provider.models[0]?.id ?? null;
}

// ---- 聊天历史持久化（剔除图片与附件内容，quota 超限时丢最旧重试）----

export function persistAiMessages(messages: AiChatMessage[]): void {
  let pending = messages.slice(-AI_HISTORY_LIMIT);
  for (;;) {
    try {
      localStorage.setItem(MESSAGES_KEY, JSON.stringify(
        pending.map((message) => ({
          ...message,
          images: undefined,
          // 保留文件名/大小供气泡 chip 展示，仅剥离重载后无法重发的内容
          attachments: message.attachments?.map(({ name, size }) => ({ name, size, content: '' })),
        }))
      ));
      return;
    } catch {
      if (pending.length === 0) {
        try { localStorage.removeItem(MESSAGES_KEY); } catch { /* 忽略 */ }
        return;
      }
      pending = pending.slice(1);
    }
  }
}

export function restoreAiMessages(): AiChatMessage[] {
  try {
    const raw = JSON.parse(localStorage.getItem(MESSAGES_KEY) ?? '[]');
    if (!Array.isArray(raw)) return [];
      return raw
      .filter((item: any) => item && (item.role === 'user' || item.role === 'assistant'))
      .map((item: any) => ({
        id: String(item.id ?? newAiId()),
        role: item.role,
        content: String(item.content ?? ''),
        article: typeof item.article === 'string' ? item.article : undefined,
        requestSource: typeof item.requestSource === 'string' ? item.requestSource : undefined,
        reasoning: typeof item.reasoning === 'string' ? item.reasoning : undefined,
        error: item.error === true,
        truncated: item.truncated === true,
        attachments: Array.isArray(item.attachments)
          ? (item.attachments as any[]).map((file) => ({
            name: String(file?.name ?? ''),
            size: Number(file?.size) || 0,
            content: String(file?.content ?? ''),
          }))
          : undefined,
        createdAt: Number(item.createdAt) || 0,
      }));
  } catch {
    return [];
  }
}

// ---- 消息时间展示 ----

const pad2 = (n: number): string => String(n).padStart(2, '0');

const formatHhMm = (ts: number): string => {
  const date = new Date(ts);
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
};

const formatMonthDay = (ts: number): string => {
  const date = new Date(ts);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
};

export function isSameAiDay(a: number, b: number): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return da.getFullYear() === db.getFullYear()
    && da.getMonth() === db.getMonth()
    && da.getDate() === db.getDate();
}

/** 卡片时间：当天「21:42」，非当天「8月18日 21:42」 */
export function formatAiMessageTime(createdAt: number, now: number = Date.now()): string {
  if (!createdAt) return '';
  const time = formatHhMm(createdAt);
  return isSameAiDay(createdAt, now) ? time : `${formatMonthDay(createdAt)} ${time}`;
}

/** 会话内日期分隔行：当天「今天 11:33」，非当天「8月18日 21:42」 */
export function formatAiDayDivider(createdAt: number, now: number = Date.now()): string {
  if (!createdAt) return '';
  const time = formatHhMm(createdAt);
  return isSameAiDay(createdAt, now) ? `今天 ${time}` : `${formatMonthDay(createdAt)} ${time}`;
}

// ---- 输入历史（上/下方向键回溯）----

export function loadInputHistory(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(INPUT_HISTORY_KEY) ?? '[]');
    return Array.isArray(raw) ? raw.filter((item) => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

export function pushInputHistory(history: string[], text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return history;
  const next = history.filter((item) => item !== trimmed);
  next.push(trimmed);
  const limited = next.slice(-AI_INPUT_HISTORY_LIMIT);
  try {
    localStorage.setItem(INPUT_HISTORY_KEY, JSON.stringify(limited));
  } catch {
    // 忽略配额错误
  }
  return limited;
}

// ---- SSE 流读取 ----

export async function readAiSseStream(response: Response, onEvent: (event: AiSseEvent) => void): Promise<void> {
  if (!response.body) return;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const data = line.trim();
      if (!data.startsWith('data:')) continue;
      const json = data.slice(5).trim();
      if (json === '[DONE]') return;
      try {
        onEvent(JSON.parse(json));
      } catch {
        // 跳过不完整的事件行
      }
    }
  }
}

// ---- 流式分流解析器：<<<ARTICLE 之前的文字流式渲染为回复，之后静默接收为修改稿 ----

export interface AiStreamParserHandle {
  push(chunk: string): void;
  finish(): { replyText: string; articleText: string; sawEndMarker: boolean };
}

export function createAiStreamParser(
  onReply: (text: string) => void,
  onArticleDelta: () => void
): AiStreamParserHandle {
  let buffer = '';
  let replyText = '';
  let articleText = '';
  let mode: 'reply' | 'article' | 'done' = 'reply';

  return {
    push(chunk: string) {
      buffer += chunk;
      while (buffer) {
        if (mode === 'done') {
          buffer = '';
          return;
        }
        if (mode === 'reply') {
          const index = buffer.indexOf(AI_START_MARKER);
          if (index >= 0) {
            replyText += buffer.slice(0, index);
            onReply(replyText);
            buffer = buffer.slice(index + AI_START_MARKER.length).replace(/^\r?\n/, '');
            mode = 'article';
            onArticleDelta();
            continue;
          }
          // 缓冲末尾可能是被拆分的标记前缀，留到下一个 chunk 再判断
          const keepLength = Math.min(buffer.length, AI_START_MARKER.length - 1);
          const safeLength = buffer.length - keepLength;
          if (safeLength > 0) {
            replyText += buffer.slice(0, safeLength);
            onReply(replyText);
            buffer = buffer.slice(safeLength);
          }
          return;
        }
        const endIndex = buffer.indexOf(AI_END_MARKER);
        if (endIndex >= 0) {
          articleText += buffer.slice(0, endIndex);
          buffer = buffer.slice(endIndex + AI_END_MARKER.length);
          mode = 'done';
          onArticleDelta();
          continue;
        }
        const keepLength = Math.min(buffer.length, AI_END_MARKER.length - 1);
        const safeLength = buffer.length - keepLength;
        if (safeLength > 0) {
          articleText += buffer.slice(0, safeLength);
          onArticleDelta();
          buffer = buffer.slice(safeLength);
        }
        return;
      }
    },
    finish() {
      let sawEndMarker = mode === 'done';
      if (mode === 'reply') {
        replyText += buffer;
        onReply(replyText);
      } else if (mode === 'article') {
        const endIndex = buffer.indexOf(AI_END_MARKER);
        if (endIndex >= 0) {
          articleText += buffer.slice(0, endIndex);
          sawEndMarker = true;
        } else {
          articleText += buffer;
        }
        onArticleDelta();
      }
      buffer = '';
      return {
        replyText: replyText.trim(),
        articleText: articleText.trim(),
        sawEndMarker,
      };
    },
  };
}

// ---- 后端代理请求 ----

export async function streamAiChat(params: {
  source: string;
  history: AiChatHistoryMessage[];
  content: string;
  images: AiImage[];
  attachments: AiTextAttachment[];
  provider: AiProvider;
  cloudProviderId?: string;
  modelId: string;
  signal: AbortSignal;
}): Promise<Response> {
  return fetch(`${API_BASE}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source: params.source,
      messages: [
        ...params.history.map(({ role, content, attachments }) => {
          const textAttachments = attachments
            ?.filter((file) => file.content)
            .map(({ name, content: fileContent }) => ({ name, content: fileContent }));
          return {
            role,
            content,
            ...(textAttachments?.length ? { attachments: textAttachments } : {}),
          };
        }),
        {
          role: 'user',
          content: params.content,
          images: params.images.map(({ mimeType, data }) => ({ mimeType, data })),
          attachments: params.attachments.map(({ name, content }) => ({ name, content })),
        },
      ],
      ...(params.cloudProviderId ? { providerId: params.cloudProviderId } : { provider: { baseUrl: params.provider.baseUrl, apiKey: params.provider.apiKey, apiFormat: params.provider.apiFormat } }),
      modelId: params.modelId,
    }),
    signal: params.signal,
  });
}
