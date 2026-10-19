import React, { act } from 'react';
import ReactDOM from 'react-dom/client';
import AiChatPanel from './AiChatPanel';
import { getAiCloudSession, streamAiChat, readAiSseStream } from '../../utils/aiChat';
import { readTextFileAsAttachment } from '../../utils/aiFiles';
import { confirmAction } from '../ui/ConfirmDialog';
import { AI_CONVERSATIONS_KEY } from '../../utils/aiConversations';

jest.mock('../../utils/aiFiles', () => ({ readTextFileAsAttachment: jest.fn() }));
jest.mock('../ui/ConfirmDialog', () => ({ confirmAction: jest.fn() }));
jest.mock('../../utils/aiChat', () => ({ ...jest.requireActual('../../utils/aiChat'), getAiCloudSession: jest.fn(), streamAiChat: jest.fn(), readAiSseStream: jest.fn() }));
let container, root, streams;
const providers = [
  { id: 'p', name: 'Provider P', enabled: true, baseUrl: 'http://localhost:8317', apiKey: 'key', apiFormat: 'responses', models: [{ id: 'model-a' }, { id: 'model-b' }] },
  { id: 'q', name: 'Provider Q', enabled: true, baseUrl: 'http://localhost:8318', apiKey: 'key', apiFormat: 'chat-completions', models: [{ id: 'other' }] },
];
const button = name => container.querySelector(`[aria-label="${name}"]`);
const input = () => container.querySelector('.ai-composer-input');
const select = () => container.querySelector('[aria-label="切换会话"]');
const type = async text => act(async () => {
  Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(input(), text);
  input().dispatchEvent(new Event('input', { bubbles: true }));
});
const click = async name => act(async () => button(name).click());
const switchTo = async id => act(async () => { select().value = id; select().dispatchEvent(new Event('change', { bubbles: true })); });
const chooseModel = async label => {
  await act(async () => container.querySelector('.ai-model-select-trigger').click());
  await act(async () => Array.from(container.querySelectorAll('[role="option"]')).find(el => el.textContent.includes(label)).click());
};
const render = async () => act(async () => root.render(<AiChatPanel open markdown="# Shared document" onClose={() => {}} onApplyArticle={() => {}} />));
const finish = async (index, text) => act(async () => { streams[index].event({ type: 'delta', text }); streams[index].finish(); });
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear();
  localStorage.setItem('feishu2wx_ai_config', JSON.stringify({ activeProviderId: 'p', activeModelId: 'model-a', providers }));
  container = document.createElement('div'); document.body.appendChild(container); root = ReactDOM.createRoot(container);
  streams = [];
  confirmAction.mockResolvedValue(true);
  readTextFileAsAttachment.mockReset();
  getAiCloudSession.mockResolvedValue(null);
  streamAiChat.mockReset(); readAiSseStream.mockReset();
  streamAiChat.mockImplementation(async () => ({ ok: true }));
  readAiSseStream.mockImplementation((_response, event) => new Promise(finish => { streams.push({ event, finish }); }));
});
afterEach(async () => { await act(async () => { root.unmount(); streams.forEach(s => s.finish()); }); container.remove(); jest.restoreAllMocks(); });

test('isolates drafts and selected models, restoring both after a remount', async () => {
  await render(); const a = select().value;
  await type('draft a'); await click('新建会话'); const b = select().value;
  expect(input().value).toBe('');
  await chooseModel('Provider Q · other'); await type('draft b');
  await switchTo(a);
  expect(input().value).toBe('draft a');
  expect(container.querySelector('.ai-model-select-trigger').textContent).toBe('model-a');
  await switchTo(b);
  expect(input().value).toBe('draft b');
  expect(container.querySelector('.ai-model-select-trigger').textContent).toBe('other');
  await act(async () => root.unmount()); root = ReactDOM.createRoot(container); await render();
  expect(select().value).toBe(b); expect(input().value).toBe('draft b');
  await switchTo(a); expect(input().value).toBe('draft a');
});

test('concurrent streams and request histories stay in their owning sessions with immutable model snapshots', async () => {
  await render(); const a = select().value;
  await type('question a'); await click('发送');
  expect(container.querySelector('.ai-msg-source').textContent).toContain('Provider P · model-a');
  await click('新建会话'); const b = select().value;
  await chooseModel('Provider Q · other'); await type('question b'); await click('发送');
  expect(streamAiChat.mock.calls[0][0]).toMatchObject({ modelId: 'model-a', history: [] });
  expect(streamAiChat.mock.calls[1][0]).toMatchObject({ modelId: 'other', history: [] });
  await finish(0, 'answer a');
  expect(container.textContent).not.toContain('answer a');
  await finish(1, 'answer b');
  expect(container.textContent).toContain('answer b');
  await switchTo(a); expect(container.textContent).toContain('answer a'); expect(container.textContent).not.toContain('answer b');
  await chooseModel('Provider P · model-b');
  expect(container.querySelector('.ai-msg-source').textContent).toContain('Provider P · model-a');
  await type('follow up a'); await click('发送');
  expect(streamAiChat.mock.calls[2][0]).toMatchObject({ modelId: 'model-b', history: [{ role: 'user', content: 'question a' }, { role: 'assistant', content: 'answer a' }] });
  await switchTo(b); expect(container.querySelector('.ai-msg-source').textContent).toContain('Provider Q · other');
  await finish(2, 'answer follow up');
  expect(container.textContent).not.toContain('answer follow up');
});

test('stopping or deleting one generating session does not affect another and late results cannot resurrect it', async () => {
  await render(); const a = select().value;
  await type('a'); await click('发送'); const signalA = streamAiChat.mock.calls[0][0].signal;
  await click('新建会话'); const b = select().value;
  await type('b'); await click('发送'); const signalB = streamAiChat.mock.calls[1][0].signal;
  await click('停止生成'); expect(signalB.aborted).toBe(true); expect(signalA.aborted).toBe(false);
  await switchTo(a); await click('删除会话'); expect(signalA.aborted).toBe(true);
  await finish(0, 'late result'); await finish(1, 'stopped b');
  expect(select().value).toBe(b); expect(container.textContent).not.toContain('late result');
  expect(JSON.parse(localStorage.getItem(AI_CONVERSATIONS_KEY)).conversations.some(c => c.id === a)).toBe(false);
});

test('input recall is isolated and renaming is retained instead of overwritten by auto titles', async () => {
  await render(); const a = select().value;
  await type('only a'); await click('发送'); await finish(0, 'reply');
  await click('新建会话'); const b = select().value;
  await act(async () => input().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true })));
  expect(input().value).toBe('');
  await switchTo(a);
  await act(async () => input().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true })));
  expect(input().value).toBe('only a');
  await click('重命名会话');
  await act(async () => {
    const field = container.querySelector('[aria-label="会话名称"]');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(field, 'My name');
    field.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await act(async () => container.querySelector('[aria-label="会话名称"]').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
  await type('another a'); await click('发送'); await finish(1, 'another reply');
  expect(select().selectedOptions[0].textContent).toBe('My name');
  await switchTo(b); expect(select().selectedOptions[0].textContent).toBe('新会话');
});

test('removed models are explicitly unavailable rather than silently replaced by the provider default', async () => {
  await render(); await chooseModel('Provider P · model-b');
  await act(async () => root.unmount());
  localStorage.setItem('feishu2wx_ai_config', JSON.stringify({ activeProviderId: 'p', activeModelId: 'model-a', providers: [{ ...providers[0], models: [{ id: 'model-a' }] }] }));
  root = ReactDOM.createRoot(container); await render(); await type('try');
  expect(button('发送').disabled).toBe(true);
  expect(container.textContent).toContain('当前会话的模型不可用');
  expect(container.querySelector('.ai-model-select-trigger').textContent).toContain('model-b（不可用）');
  await chooseModel('Provider P · model-a'); expect(button('发送').disabled).toBe(false);
});

test('clearing a conversation leaves the other conversation history intact', async () => {
  await render(); const a = select().value;
  await type('a'); await click('发送'); await finish(0, 'answer a');
  await click('新建会话'); const b = select().value;
  await type('b'); await click('发送'); await finish(1, 'answer b');
  await click('清空对话');
  expect(container.querySelectorAll('.ai-msg')).toHaveLength(0);
  await switchTo(a); expect(container.textContent).toContain('answer a');
  await switchTo(b); expect(container.querySelectorAll('.ai-msg')).toHaveLength(0);
});

test('editing and resending binds the new reply and truncated history to its originating conversation', async () => {
  await render(); const a = select().value;
  await type('original'); await click('发送'); await finish(0, 'original reply');
  await click('新建会话'); const b = select().value;
  await type('other draft'); await switchTo(a);
  await click('编辑消息');
  await act(async () => {
    const field = container.querySelector('.ai-msg-edit-input');
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(field, 'edited');
    field.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await act(async () => container.querySelector('.ai-msg-edit-actions .ai-apply-btn').click());
  expect(streamAiChat.mock.calls[1][0]).toMatchObject({ content: 'edited', history: [] });
  await switchTo(b); await finish(1, 'edited reply');
  expect(input().value).toBe('other draft'); expect(container.textContent).not.toContain('edited reply');
  await switchTo(a); expect(container.textContent).toContain('edited reply'); expect(container.textContent).not.toContain('original reply');
});

test('shows storage failure without discarding in-memory conversation drafts', async () => {
  await render();
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
  await type('unsaved'); await click('新建会话');
  const a = Array.from(select().options).find(o => o.value !== select().value).value;
  expect(container.querySelector('[role="alert"]').textContent).toContain('保存失败');
  await switchTo(a); expect(input().value).toBe('unsaved');
});


test('asynchronous attachment reads and pending files stay with the session that added them', async () => {
  let resolveFile;
  readTextFileAsAttachment.mockImplementation(() => new Promise(resolve => { resolveFile = resolve; }));
  await render(); const a = select().value;
  const fileInput = container.querySelector('input[type="file"]');
  Object.defineProperty(fileInput, 'files', { configurable: true, value: [new File(['secret a'], 'a.md', { type: 'text/markdown' })] });
  await act(async () => fileInput.dispatchEvent(new Event('change', { bubbles: true })));
  await click('新建会话'); const b = select().value;
  await act(async () => resolveFile({ name: 'a.md', size: 8, content: 'secret a' }));
  expect(container.querySelector('.ai-chat-attachments')).toBeNull();
  await type('b'); await click('发送'); await finish(0, 'b reply');
  expect(streamAiChat.mock.calls[0][0].attachments).toEqual([]);
  await switchTo(a); expect(container.querySelector('.ai-chat-attachments').textContent).toContain('a.md');
  await type('a'); await click('发送');
  expect(streamAiChat.mock.calls[1][0].attachments).toEqual([{ name: 'a.md', size: 8, content: 'secret a' }]);
  await switchTo(b); await finish(1, 'a reply');
  expect(container.textContent).not.toContain('a reply');
});

test('an attachment finishing after its session is deleted cannot add files to a replacement session', async () => {
  let resolveFile;
  readTextFileAsAttachment.mockImplementation(() => new Promise(resolve => { resolveFile = resolve; }));
  await render(); const a = select().value;
  const fileInput = container.querySelector('input[type="file"]');
  Object.defineProperty(fileInput, 'files', { configurable: true, value: [new File(['a'], 'a.md')] });
  await act(async () => fileInput.dispatchEvent(new Event('change', { bubbles: true })));
  await click('删除会话');
  expect(select().value).not.toBe(a);
  await act(async () => resolveFile({ name: 'a.md', size: 1, content: 'a' }));
  expect(container.querySelector('.ai-chat-attachments')).toBeNull();
  expect(JSON.parse(localStorage.getItem(AI_CONVERSATIONS_KEY)).conversations).toHaveLength(1);
});
