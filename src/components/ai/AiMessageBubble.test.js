import React, { act } from 'react';
import ReactDOM from 'react-dom/client';
import AiMessageBubble from './AiMessageBubble';

let container;
let root;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = ReactDOM.createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const completedAssistant = {
  id: 'm1',
  role: 'assistant',
  content: '已生成修改稿。',
  reasoning: '先分析标题再精简第二段',
  durationMs: (3 * 60 + 29) * 1000,
  createdAt: Date.now(),
};

test('shows duration meta line that reveals reasoning on click', async () => {
  await act(async () => {
    root.render(<AiMessageBubble message={completedAssistant} onApply={() => {}} />);
  });

  const details = container.querySelector('details.ai-msg-meta');
  expect(details).not.toBeNull();
  expect(details.open).toBe(false);
  expect(details.querySelector('summary').textContent).toContain('用时 3分钟 29秒');
  // 推理过程正文始终在 DOM 中，由 details 折叠控制显隐
  expect(details.querySelector('.ai-reasoning-body').textContent).toBe('先分析标题再精简第二段');

  await act(async () => {
    details.querySelector('summary').click();
  });
  expect(details.open).toBe(true);
});

test('duration without reasoning renders plain meta line without toggle', async () => {
  await act(async () => {
    root.render(<AiMessageBubble message={{ ...completedAssistant, reasoning: undefined }} onApply={() => {}} />);
  });

  const meta = container.querySelector('.ai-msg-meta');
  expect(meta.tagName).toBe('DIV');
  expect(meta.textContent).toBe('用时 3分钟 29秒');
});

test('legacy message without durationMs renders no meta line', async () => {
  const { durationMs, ...legacy } = completedAssistant;
  void durationMs;
  await act(async () => {
    root.render(<AiMessageBubble message={legacy} onApply={() => {}} />);
  });

  expect(container.querySelector('.ai-msg-meta')).toBeNull();
});
