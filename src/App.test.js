import React, { act } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

let container;
let root;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = ReactDOM.createRoot(container);

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(() => ({
      matches: false,
      media: '',
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
});

test('toggles h1 inverted style on preview content', () => {
  localStorage.setItem('feishu2wx_markdown', '# 标题');
  localStorage.setItem('feishu2wx_showH1Underline', 'true');
  localStorage.setItem('feishu2wx_showHorizontalRule', 'true');

  act(() => {
    root.render(<App />);
  });

  const previewContent = container.querySelector('.preview-content');
  expect(previewContent.className.includes('invert-h1')).toBe(false);

  // 先打开设置面板
  const settingsButton = container.querySelector('.settings-trigger');
  act(() => {
    settingsButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

  // 点击 "H1 反色" 按钮
  const invertButton = Array.from(container.querySelectorAll('button')).find((button) =>
    button.textContent.includes('H1 反色')
  );

  act(() => {
    if (invertButton) invertButton.click();
  });
  expect(previewContent.className.includes('invert-h1')).toBe(true);

  // 再次点击 "H1 反色" 按钮取消反显
  const resetButton = Array.from(container.querySelectorAll('button')).find((button) =>
    button.textContent.includes('H1 反色')
  );

  act(() => {
    if (resetButton) resetButton.click();
  });
  expect(previewContent.className.includes('invert-h1')).toBe(false);
});

test('syncs preview scroll by editor scroll ratio in side-by-side layout', async () => {
  localStorage.setItem('feishu2wx_markdown', Array.from({ length: 80 }, (_, index) => `段落 ${index + 1}`).join('\n\n'));

  act(() => {
    root.render(<App />);
  });

  const editor = container.querySelector('.markdown-editor');
  const previewContent = container.querySelector('.preview-content');

  Object.defineProperty(editor, 'scrollHeight', { configurable: true, value: 2000 });
  Object.defineProperty(editor, 'clientHeight', { configurable: true, value: 500 });
  Object.defineProperty(previewContent, 'scrollHeight', { configurable: true, value: 3000 });
  Object.defineProperty(previewContent, 'clientHeight', { configurable: true, value: 600 });

  editor.getBoundingClientRect = jest.fn(() => ({ right: 500 }));
  previewContent.getBoundingClientRect = jest.fn(() => ({ left: 501 }));
  editor.scrollTop = 750;

  await act(async () => {
    editor.dispatchEvent(new Event('scroll', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 20));
  });

  expect(previewContent.scrollTop).toBe(1200);
});

test('converts rendered markdown html back to markdown when pasted into editor', async () => {
  act(() => {
    root.render(<App />);
  });

  const editor = container.querySelector('.markdown-editor');
  const pasteEvent = new Event('paste', { bubbles: true, cancelable: true });

  Object.defineProperty(pasteEvent, 'clipboardData', {
    value: {
      getData: (type) => {
        if (type === 'text/html') {
          return '<h1>标题</h1><p>正文</p><ul><li>列表项</li></ul><pre><code>npm run cli -- auth set --app-id &lt;appid&gt;</code></pre>';
        }
        if (type === 'text/plain') {
          return '标题\n\n正文\n\n列表项\n\nnpm run cli -- auth set --app-id <appid>';
        }
        return '';
      },
    },
  });

  await act(async () => {
    editor.dispatchEvent(pasteEvent);
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  expect(editor.value).toContain('# 标题');
  expect(editor.value).toContain('-   列表项');
  expect(editor.value).toContain('```');
});

test('keeps plain text paste when smart html conversion is disabled', async () => {
  localStorage.setItem('feishu2wx_shouldConvertPastedHtml', 'false');

  act(() => {
    root.render(<App />);
  });

  const editor = container.querySelector('.markdown-editor');
  const pasteEvent = new Event('paste', { bubbles: true, cancelable: true });

  Object.defineProperty(pasteEvent, 'clipboardData', {
    value: {
      getData: (type) => {
        if (type === 'text/html') {
          return '<h1>标题</h1><p>正文</p><ul><li>列表项</li></ul><pre><code>npm run cli -- auth set --app-id &lt;appid&gt;</code></pre>';
        }
        if (type === 'text/plain') {
          return '标题\n\n正文\n\n列表项\n\nnpm run cli -- auth set --app-id <appid>';
        }
        return '';
      },
    },
  });

  await act(async () => {
    editor.dispatchEvent(pasteEvent);
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  expect(editor.value).not.toContain('# 标题');
  expect(editor.value).not.toContain('```');
  expect(editor.value).toContain('npm run cli -- auth set --app-id <appid>');
});
