import { AI_HISTORY_LIMIT, AI_INPUT_HISTORY_LIMIT, loadInputHistory, newAiId, normalizeAiMessages, restoreAiMessages } from './aiChat';
import type { AiChatMessage, AiProviderSettings } from './aiChat';

export const AI_CONVERSATIONS_KEY = 'feishu2wx_ai_conversations_v1';
export interface AiConversation {
  id: string;
  title: string;
  customTitle: boolean;
  messages: AiChatMessage[];
  input: string;
  inputHistory: string[];
  providerId: string | null;
  modelId: string | null;
  modelInitialized: boolean;
  createdAt: number;
  updatedAt: number;
}
export interface AiConversationStore {
  version: 1;
  activeId: string;
  conversations: AiConversation[];
}

export function newAiConversation(selection?: { providerId: string | null; modelId: string | null; modelInitialized?: boolean }): AiConversation {
  const now = Date.now();
  return { id: newAiId(), title: '新会话', customTitle: false, messages: [], input: '', inputHistory: [],
    providerId: selection?.providerId ?? null, modelId: selection?.modelId ?? null,
    modelInitialized: selection?.modelInitialized ?? Boolean(selection?.providerId), createdAt: now, updatedAt: now };
}

export function loadAiConversations(settings: AiProviderSettings): AiConversationStore {
  try {
    const raw = JSON.parse(localStorage.getItem(AI_CONVERSATIONS_KEY) ?? 'null');
    if (raw?.version === 1 && Array.isArray(raw.conversations)) {
      const seen = new Set<string>();
      const conversations: AiConversation[] = raw.conversations.filter((c: any) => {
        if (!c || typeof c.id !== 'string' || !c.id || seen.has(c.id)) return false;
        seen.add(c.id);
        return true;
      }).map((c: any) => ({
        id: c.id, title: typeof c.title === 'string' && c.title.trim() ? c.title.slice(0, 100) : '新会话', customTitle: c.customTitle === true,
        messages: normalizeAiMessages(c.messages).slice(-AI_HISTORY_LIMIT).map(m => m.interrupted
          ? { ...m, content: m.content || '（刷新后生成已中断，请重新发送）', interrupted: false } : m),
        input: typeof c.input === 'string' ? c.input : '',
        inputHistory: Array.isArray(c.inputHistory) ? c.inputHistory.filter((s: unknown) => typeof s === 'string').slice(-AI_INPUT_HISTORY_LIMIT) : [],
        providerId: typeof c.providerId === 'string' ? c.providerId : null,
        modelId: typeof c.modelId === 'string' ? c.modelId : null,
        modelInitialized: c.modelInitialized === true || typeof c.providerId === 'string',
        createdAt: Number(c.createdAt) || Date.now(), updatedAt: Number(c.updatedAt) || Date.now(),
      }));
      if (conversations.length) return { version: 1, activeId: conversations.some(c => c.id === raw.activeId) ? raw.activeId : conversations[0].id, conversations };
    }
  } catch { /* 旧记录保留，后续保存成功才视为迁移完成。 */ }
  const initial = newAiConversation({ providerId: settings.activeProviderId, modelId: settings.activeModelId });
  initial.messages = restoreAiMessages();
  initial.inputHistory = loadInputHistory();
  if (initial.messages.length) initial.title = '历史会话';
  return { version: 1, activeId: initial.id, conversations: [initial] };
}

export function saveAiConversations(store: AiConversationStore): boolean {
  try {
    localStorage.setItem(AI_CONVERSATIONS_KEY, JSON.stringify({
      version: 1, activeId: store.activeId,
      conversations: store.conversations.map(c => ({
        id: c.id, title: c.title, customTitle: c.customTitle, input: c.input, inputHistory: c.inputHistory,
        providerId: c.providerId, modelId: c.modelId, modelInitialized: c.modelInitialized,
        createdAt: c.createdAt, updatedAt: c.updatedAt,
        messages: c.messages.slice(-AI_HISTORY_LIMIT).map(({ images, attachments, ...m }) => ({
          ...m, attachments: attachments?.map(({ name, size }) => ({ name, size, content: '' })),
        })),
      })),
    }));
    return true;
  } catch { return false; }
}
