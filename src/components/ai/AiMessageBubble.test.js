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
  jest.useRealTimers();
  delete navigator.clipboard;
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
    root.render(<AiMessageBubble showTokenUsage message={completedAssistant} onApply={() => {}} />);
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
    root.render(<AiMessageBubble showTokenUsage message={{ ...completedAssistant, reasoning: undefined }} onApply={() => {}} />);
  });

  const meta = container.querySelector('.ai-msg-meta');
  expect(meta.tagName).toBe('DIV');
  expect(meta.textContent).toBe('用时 3分钟 29秒');
});

test('legacy message without durationMs renders no meta line', async () => {
  const { durationMs, ...legacy } = completedAssistant;
  void durationMs;
  await act(async () => {
    root.render(<AiMessageBubble showTokenUsage message={legacy} onApply={() => {}} />);
  });

  expect(container.querySelector('.ai-msg-meta')).toBeNull();
});

test('shows per-reply token usage and preserves provider totals without double-counting cache or reasoning', async () => {
  const usage = { inputTokens: 100, outputTokens: 30, totalTokens: 135, cacheReadTokens: 40, reasoningTokens: 10 };
  await act(async () => root.render(<AiMessageBubble showTokenUsage message={{ ...completedAssistant, usage }} onApply={() => {}} />));
  const tokens = container.querySelector('details.ai-token-usage');
  expect(tokens.querySelector('summary').textContent).toBe('Token · 总计 135');
  expect(tokens.textContent).toContain('缓存读取40');
  expect(tokens.textContent).toContain('推理10');
  await act(async () => tokens.querySelector('summary').click());
  expect(tokens.open).toBe(true);
});

test('derives totals only from complete input/output and labels missing usage', async () => {
  const renderUsage = async (usage) => act(async () => root.render(<AiMessageBubble showTokenUsage message={{ ...completedAssistant, usage }} onApply={() => {}} />));
  await renderUsage({ inputTokens: 10, outputTokens: 0 });
  expect(container.querySelector('.ai-token-usage summary').textContent).toBe('Token · 总计 10');
  expect(container.querySelector('.ai-token-usage').textContent).toContain('总计（输入 + 输出）10');
  await renderUsage({ outputTokens: 3 });
  expect(container.querySelector('.ai-token-usage summary').textContent).toContain('部分用量');
  await renderUsage(undefined);
  expect(container.querySelector('.ai-token-usage').textContent).toBe('Token · 上游未返回用量');
});

test('abbreviates the token summary but keeps precise counts in its title and details', async () => {
  await act(async () => root.render(<AiMessageBubble showTokenUsage message={{ ...completedAssistant,
    usage: { inputTokens: 1200000, outputTokens: 34567, totalTokens: 1234567 },
  }} onApply={() => {}} />));
  const tokens = container.querySelector('.ai-token-usage');
  const summary = tokens.querySelector('summary');
  expect(summary.textContent).toBe('Token · 总计 1.2M');
  expect(summary.title).toBe('总计 1,234,567 Token');
  expect(Array.from(tokens.querySelectorAll('dd')).map(item => item.textContent)).toEqual([
    '1,200,000', '34,567', '未返回', '未返回', '未返回', '1,234,567',
  ]);
});

test('shows a visible waiting status before reply content and removes it on the first text', async () => {
  const message = { id: 'waiting', role: 'assistant', content: '', createdAt: 1 };
  const renderLive = (live) => root.render(<AiMessageBubble showTokenUsage message={message} live={live} onApply={() => {}} />);
  await act(async () => renderLive({ reply: '', reasoning: '', articleStarted: false }));
  expect(container.querySelector('[role="status"]').textContent).toContain('正在回复');
  expect(container.querySelector('.ai-md')).toBeNull();
  await act(async () => renderLive({ reply: ' \n', reasoning: ' ', articleStarted: false }));
  expect(container.querySelector('[role="status"]').textContent).toContain('正在回复');
  expect(container.querySelector('.ai-reasoning')).toBeNull();
  await act(async () => renderLive({ reply: '你好', reasoning: '', articleStarted: false }));
  expect(container.querySelector('.ai-msg-waiting')).toBeNull();
  expect(container.querySelector('.ai-md').textContent).toContain('你好');
  await act(async () => root.render(<AiMessageBubble showTokenUsage message={{ ...message, content: '你好' }} onApply={() => {}} />));
  expect(container.querySelector('.ai-msg-waiting')).toBeNull();
});

test('replaces waiting with reasoning or article progress instead of duplicate loading', async () => {
  const message = { id: 'waiting', role: 'assistant', content: '', createdAt: 1 };
  await act(async () => root.render(<AiMessageBubble showTokenUsage message={message}
    live={{ reply: '', reasoning: '分析问题', articleStarted: false }} onApply={() => {}} />));
  expect(container.querySelector('.ai-msg-waiting')).toBeNull();
  expect(container.querySelector('.ai-reasoning-body').textContent).toBe('分析问题');
  await act(async () => root.render(<AiMessageBubble showTokenUsage message={message}
    live={{ reply: '', reasoning: '', articleStarted: true }} onApply={() => {}} />));
  expect(container.querySelector('.ai-msg-waiting')).toBeNull();
  expect(container.querySelector('.ai-article-status').textContent).toContain('正在生成修改稿');
});

test('copies only the selected code block, preserving whitespace and literal HTML', async () => {
  jest.useFakeTimers();
  const writeText = jest.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  const code = '  <div data-x="&">你好</div>\n\n';
  await act(async () => {
    root.render(<AiMessageBubble showTokenUsage message={{ ...completedAssistant,
      content: `说明与行内 \`code\`\n\n\`\`\`html\n${code}\`\`\`\n\n    second block\n`,
    }} onApply={() => {}} />);
  });
  const buttons = container.querySelectorAll('.ai-code-copy-btn');
  expect(buttons).toHaveLength(2);
  expect(container.querySelector('.ai-md div[data-x]')).toBeNull();
  await act(async () => buttons[0].click());
  expect(writeText).toHaveBeenLastCalledWith(code);
  expect(buttons[0].textContent).toBe('已复制');
  expect(buttons[1].textContent).toBe('复制');
  await act(async () => buttons[1].click());
  expect(writeText).toHaveBeenLastCalledWith('second block\n');
  act(() => jest.advanceTimersByTime(1600));
  expect(buttons[0].textContent).toBe('复制');
});

test('copies the latest streaming code and reports clipboard failures', async () => {
  const writeText = jest.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  const renderLive = (reply) => root.render(<AiMessageBubble showTokenUsage message={completedAssistant}
    live={{ reply, reasoning: '', articleStarted: false }} onApply={() => {}} />);
  await act(async () => renderLive('```js\nconst x ='));
  await act(async () => container.querySelector('.ai-code-copy-btn').click());
  expect(writeText).toHaveBeenLastCalledWith('const x =');
  await act(async () => renderLive('```js\nconst x = 1;\n```'));
  await act(async () => container.querySelector('.ai-code-copy-btn').click());
  expect(writeText).toHaveBeenLastCalledWith('const x = 1;\n');
  writeText.mockRejectedValueOnce(new Error('denied'));
  await act(async () => container.querySelector('.ai-code-copy-btn').click());
  expect(container.querySelector('.ai-code-copy-btn').textContent).toBe('复制失败，请重试');
  await act(async () => renderLive('只有行内 `code`'));
  expect(container.querySelector('.ai-code-copy-btn')).toBeNull();
});

 test('hides token statistics by default and when explicitly disabled', async () => {
  for (const props of [{}, { showTokenUsage: false }]) {
    await act(async () => root.render(<AiMessageBubble {...props} message={{ ...completedAssistant, usage: { totalTokens: 42 } }} onApply={() => {}} />));
    expect(container.querySelector('.ai-token-usage')).toBeNull();
    expect(container.querySelector('[aria-label="复制内容"]')).not.toBeNull();
  }
});
