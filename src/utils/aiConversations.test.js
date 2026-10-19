import { AI_CONVERSATIONS_KEY, loadAiConversations, newAiConversation, saveAiConversations } from './aiConversations';

const settings = { activeProviderId: 'p', activeModelId: 'model', providers: [] };
beforeEach(() => localStorage.clear());
afterEach(() => jest.restoreAllMocks());

test('migrates legacy history once without assigning a guessed model to old replies', () => {
  localStorage.setItem('feishu2wx_ai_messages', JSON.stringify([{ id: 'old', role: 'assistant', content: 'old reply' }]));
  localStorage.setItem('feishu2wx_ai_input_history', JSON.stringify(['old input']));
  const store = loadAiConversations(settings);
  expect(store.conversations[0]).toMatchObject({ title: '历史会话', providerId: 'p', modelId: 'model', inputHistory: ['old input'] });
  expect(store.conversations[0].messages[0].modelId).toBeUndefined();
  expect(saveAiConversations(store)).toBe(true);
  expect(loadAiConversations(settings)).toEqual(store);
  expect(localStorage.getItem('feishu2wx_ai_messages')).toContain('old reply');
});

test('persists each conversation selection, draft, source snapshot and independent input history', () => {
  const a = newAiConversation({ providerId: 'p', modelId: 'a' });
  const b = newAiConversation({ providerId: 'q', modelId: 'b' });
  a.input = 'draft a'; b.input = 'draft b'; a.inputHistory = ['a']; b.inputHistory = ['b'];
  a.messages = [{ id: 'reply', role: 'assistant', content: 'response', providerId: 'p', providerName: 'Old name', modelId: 'a', createdAt: 1 }];
  expect(saveAiConversations({ version: 1, activeId: b.id, conversations: [a, b] })).toBe(true);
  const restored = loadAiConversations(settings);
  expect(restored.activeId).toBe(b.id);
  expect(restored.conversations[0]).toMatchObject({ input: 'draft a', modelId: 'a', inputHistory: ['a'] });
  expect(restored.conversations[1]).toMatchObject({ input: 'draft b', modelId: 'b', inputHistory: ['b'] });
  expect(restored.conversations[0].messages[0]).toMatchObject({ providerName: 'Old name', modelId: 'a' });
});

test('does not persist credentials, runtime, images or attachment contents and marks unfinished replies on restore', () => {
  const c = newAiConversation();
  c.apiKey = 'do-not-save'; c.pendingFiles = [{ secret: 'draft attachment' }]; c.live = { reply: 'live' };
  c.messages = [{ id: 'one', role: 'assistant', content: '', createdAt: 1, interrupted: true, images: [{ data: 'image secret' }], attachments: [{ name: 'a.md', size: 7, content: 'attachment secret' }] }];
  saveAiConversations({ version: 1, activeId: c.id, conversations: [c] });
  const json = localStorage.getItem(AI_CONVERSATIONS_KEY);
  expect(json).not.toMatch(/do-not-save|draft attachment|image secret|attachment secret/);
  expect(loadAiConversations(settings).conversations[0].messages[0]).toMatchObject({ content: expect.stringContaining('中断'), attachments: [{ name: 'a.md', size: 7, content: '' }] });
});

test('storage failure never deletes legacy history or previously saved conversations', () => {
  localStorage.setItem('feishu2wx_ai_messages', '[]');
  localStorage.setItem(AI_CONVERSATIONS_KEY, 'existing');
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
  const c = newAiConversation();
  expect(saveAiConversations({ version: 1, activeId: c.id, conversations: [c] })).toBe(false);
  expect(localStorage.getItem(AI_CONVERSATIONS_KEY)).toBe('existing');
  expect(localStorage.getItem('feishu2wx_ai_messages')).toBe('[]');
});

test('limits messages per conversation and tolerates corrupted or duplicate records', () => {
  const a = newAiConversation();
  a.messages = Array.from({ length: 30 }, (_, n) => ({ id: String(n), role: 'user', content: String(n), createdAt: n }));
  saveAiConversations({ version: 1, activeId: a.id, conversations: [a] });
  expect(loadAiConversations(settings).conversations[0].messages).toHaveLength(20);
  localStorage.setItem(AI_CONVERSATIONS_KEY, JSON.stringify({ version: 1, activeId: 'missing', conversations: [null, { id: 'valid' }, { id: 'valid' }] }));
  const restored = loadAiConversations(settings);
  expect(restored.activeId).toBe('valid');
  expect(restored.conversations).toHaveLength(1);
});
