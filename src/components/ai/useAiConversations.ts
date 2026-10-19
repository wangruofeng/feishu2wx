import { useCallback, useEffect, useRef, useState } from 'react';
import { loadAiConversations, newAiConversation, saveAiConversations } from '../../utils/aiConversations';
import type { AiConversation, AiConversationStore } from '../../utils/aiConversations';
import type { AiImage, AiProviderSettings, AiTextAttachment } from '../../utils/aiChat';
import type { AiLiveState } from './AiMessageBubble';

export type PendingAttachment = { kind: 'image'; image: AiImage } | { kind: 'text'; file: AiTextAttachment };
interface Runtime {
  pendingFiles: PendingAttachment[];
  live: AiLiveState | null;
  streaming: boolean;
}
export type ConversationView = AiConversation & Runtime;
const emptyRuntime = (): Runtime => ({ pendingFiles: [], live: null, streaming: false });

export default function useAiConversations(settings: AiProviderSettings) {
  const [initial] = useState(() => loadAiConversations(settings));
  const [store, setStore] = useState<AiConversationStore>(initial);
  const storeRef = useRef(store);
  const mounted = useRef(true);
  const runtimeRef = useRef(new Map<string, Runtime>());
  const controllers = useRef(new Map<string, AbortController>());
  const [, redraw] = useState(0);
  const [storageError, setStorageError] = useState(false);

  const commit = useCallback((next: AiConversationStore) => {
    if (!mounted.current) return;
    storeRef.current = next;
    setStore(next);
    setStorageError(!saveAiConversations(next));
  }, []);
  useEffect(() => { setStorageError(!saveAiConversations(initial)); }, [initial]);
  useEffect(() => {
    mounted.current = true;
    const running = controllers.current;
    return () => { mounted.current = false; running.forEach(c => c.abort()); };
  }, []);

  const read = useCallback((id: string): ConversationView | undefined => {
    const c = storeRef.current.conversations.find(item => item.id === id);
    return c ? { ...c, ...(runtimeRef.current.get(id) ?? emptyRuntime()) } : undefined;
  }, []);
  const update = useCallback((id: string, updater: (c: ConversationView) => Partial<ConversationView>, transient = false) => {
    const current = read(id);
    if (!mounted.current || !current) return;
    const patch = updater(current);
    const { pendingFiles, live, streaming, ...data } = patch;
    runtimeRef.current.set(id, {
      pendingFiles: pendingFiles ?? current.pendingFiles,
      live: live === undefined ? current.live : live,
      streaming: streaming ?? current.streaming,
    });
    if (transient) { redraw(n => n + 1); return; }
    commit({ ...storeRef.current, conversations: storeRef.current.conversations.map(c => c.id === id ? { ...c, ...data } : c) });
  }, [commit, read]);
  const select = useCallback((id: string) => {
    if (storeRef.current.conversations.some(c => c.id === id)) commit({ ...storeRef.current, activeId: id });
  }, [commit]);
  const create = useCallback(() => {
    const current = read(storeRef.current.activeId);
    const c = newAiConversation(current);
    commit({ ...storeRef.current, activeId: c.id, conversations: [...storeRef.current.conversations, c] });
  }, [commit, read]);
  const remove = useCallback((id: string) => {
    const removed = read(id);
    controllers.current.get(id)?.abort();
    controllers.current.delete(id);
    runtimeRef.current.delete(id);
    const rest = storeRef.current.conversations.filter(c => c.id !== id);
    if (!rest.length) rest.push(newAiConversation(removed));
    commit({ ...storeRef.current, activeId: storeRef.current.activeId === id ? rest[0].id : storeRef.current.activeId, conversations: rest });
  }, [commit, read]);
  const active = read(store.activeId)!;
  return { store, active, read, update, select, create, remove, controllers, storageError };
}
