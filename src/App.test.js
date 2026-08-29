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

test('configures and persists the marker highlight color', () => {
  localStorage.setItem('feishu2wx_markdown', '==荧光笔文字==');

  act(() => {
    root.render(<App />);
  });

  act(() => {
    container.querySelector('.settings-trigger').dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

  const yellowButton = Array.from(container.querySelectorAll('button')).find((button) =>
    button.textContent.includes('黄色')
  );
  act(() => {
    yellowButton?.click();
  });

  const previewContent = container.querySelector('.preview-content');
  expect(localStorage.getItem('feishu2wx_markerHighlightColor')).toBe('yellow');
  expect(previewContent.style.getPropertyValue('--marker-highlight-color')).toBe('rgba(255, 193, 7, 0.28)');
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

test('disables outline button when the article has no headings', () => {
  localStorage.setItem('feishu2wx_markdown', '这里只有正文，没有 Markdown 标题。');

  act(() => {
    root.render(<App />);
  });

  const outlineButton = Array.from(container.querySelectorAll('button')).find((button) =>
    button.getAttribute('aria-label') === '文章大纲'
  );

  expect(outlineButton.disabled).toBe(true);
});

test('opens the Markdown file input from the import control', () => {
  act(() => {
    root.render(<App />);
  });

  const importControl = Array.from(container.querySelectorAll('label')).find((label) =>
    label.textContent.includes('📂 导入')
  );
  const fileInput = container.querySelector('#markdown-file-input');

  expect(importControl).toBeTruthy();
  expect(importControl.htmlFor).toBe(fileInput.id);
  expect(fileInput.type).toBe('file');
});

test('jumps to outline heading using measured textarea position', () => {
  localStorage.setItem('feishu2wx_markdown', [
    '# 开头',
    '这是一段很长的内容，用来模拟在编辑器里发生自动换行后的滚动测量。',
    '## 目标标题',
  ].join('\n'));

  act(() => {
    root.render(<App />);
  });

  const editor = container.querySelector('.markdown-editor');
  const outlineButton = Array.from(container.querySelectorAll('button')).find((button) =>
    button.getAttribute('aria-label') === '文章大纲'
  );

  Object.defineProperty(editor, 'clientWidth', { configurable: true, value: 320 });
  Object.defineProperty(editor, 'clientHeight', { configurable: true, value: 200 });
  Object.defineProperty(editor, 'scrollHeight', { configurable: true, value: 1000 });
  editor.style.paddingTop = '24px';
  editor.style.lineHeight = '24px';
  editor.scrollTo = jest.fn(({ top }) => {
    editor.scrollTop = top;
  });

  const offsetTopSpy = jest.spyOn(HTMLElement.prototype, 'offsetTop', 'get').mockImplementation(function () {
    if (this.getAttribute('data-outline-marker') === 'true') return 240;
    return 0;
  });

  act(() => {
    outlineButton.click();
  });

  const targetButton = Array.from(document.body.querySelectorAll('.editor-outline-item button')).find((button) =>
    button.textContent.includes('目标标题')
  );

  act(() => {
    targetButton.click();
  });

  expect(editor.scrollTo).toHaveBeenCalledWith({ top: 216, behavior: 'smooth' });

  offsetTopSpy.mockRestore();
});

test('aligns outline popover with editor footer right edge', () => {
  localStorage.setItem('feishu2wx_markdown', '# 开头\n\n## 目标标题');

  act(() => {
    root.render(<App />);
  });

  const outlineButton = Array.from(container.querySelectorAll('button')).find((button) =>
    button.getAttribute('aria-label') === '文章大纲'
  );
  const editorFooter = container.querySelector('.editor-footer');

  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1000 });
  outlineButton.getBoundingClientRect = jest.fn(() => ({ top: 400, right: 500 }));
  editorFooter.getBoundingClientRect = jest.fn(() => ({ right: 560 }));

  act(() => {
    outlineButton.click();
  });

  const popover = document.body.querySelector('.editor-outline-pop');
  expect(popover.style.left).toBe('280px');
  expect(popover.style.top).toBe('400px');
});

test('shows frontmatter metadata by default and hides it from settings', async () => {
  localStorage.setItem('feishu2wx_markdown', '---\ntitle: 测试标题\ntags: [A, B]\n---\n# 正文标题');

  await act(async () => {
    root.render(<App />);
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  expect(container.querySelector('.frontmatter-preview').textContent).toContain('测试标题');

  const settingsButton = container.querySelector('.settings-trigger');
  act(() => {
    settingsButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

  const metadataToggle = container.querySelector('button[aria-label="显示元数据"]');

  expect(metadataToggle.getAttribute('aria-checked')).toBe('true');

  await act(async () => {
    metadataToggle.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  expect(container.querySelector('.frontmatter-preview')).toBeNull();
  expect(localStorage.getItem('feishu2wx_showFrontMatter')).toBe('false');
});

test('applies article start and end markdown templates to preview without changing editor content', async () => {
  localStorage.setItem('feishu2wx_markdown', '正文内容');

  await act(async () => {
    root.render(<App />);
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  const settingsButton = container.querySelector('.settings-trigger');
  act(() => {
    settingsButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

  const findTextareaByLabel = (labelText) => {
    const rows = Array.from(container.querySelectorAll('.settings-row'));
    const row = rows.find((r) => r.querySelector('.settings-row-label')?.textContent === labelText);
    return row.querySelector('textarea');
  };
  const startTextarea = findTextareaByLabel('文章首部片段');
  const endTextarea = findTextareaByLabel('文章尾部片段');
  const setTextareaValue = (textarea, value) => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    setter.call(textarea, value);
  };

  await act(async () => {
    setTextareaValue(startTextarea, '开头固定内容');
    startTextarea.dispatchEvent(new Event('input', { bubbles: true }));
    setTextareaValue(endTextarea, '结尾固定内容');
    endTextarea.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  const editor = container.querySelector('.markdown-editor');
  const previewContent = container.querySelector('.preview-content');

  expect(editor.value).toBe('正文内容');
  expect(previewContent.textContent).toContain('开头固定内容');
  expect(previewContent.textContent).toContain('正文内容');
  expect(previewContent.textContent).toContain('结尾固定内容');
  expect(localStorage.getItem('feishu2wx_headerTemplate')).toBe('开头固定内容');
  expect(localStorage.getItem('feishu2wx_footerTemplate')).toBe('结尾固定内容');
});

test('hides article start template when its visibility toggle is off', async () => {
  localStorage.setItem('feishu2wx_markdown', '正文内容');
  localStorage.setItem('feishu2wx_headerTemplate', '开头固定内容');
  localStorage.setItem('feishu2wx_footerTemplate', '结尾固定内容');
  localStorage.setItem('feishu2wx_showHeaderTemplate', 'false');

  await act(async () => {
    root.render(<App />);
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  const previewContent = container.querySelector('.preview-content');

  expect(previewContent.textContent).not.toContain('开头固定内容');
  expect(previewContent.textContent).toContain('正文内容');
  expect(previewContent.textContent).toContain('结尾固定内容');

  const settingsButton = container.querySelector('.settings-trigger');
  act(() => {
    settingsButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

  expect(container.querySelector('button[aria-label="显示文章首部片段"]').getAttribute('aria-checked')).toBe('false');
  expect(container.querySelector('button[aria-label="显示文章尾部片段"]').getAttribute('aria-checked')).toBe('true');
});

test('toggles article end template visibility from settings and disables switches when fragment is empty', async () => {
  localStorage.setItem('feishu2wx_markdown', '正文内容');
  localStorage.setItem('feishu2wx_headerTemplate', '开头固定内容');
  localStorage.setItem('feishu2wx_footerTemplate', '结尾固定内容');

  await act(async () => {
    root.render(<App />);
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  const settingsButton = container.querySelector('.settings-trigger');
  act(() => {
    settingsButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

  // 片段有内容时开关可用
  const headerSwitch = container.querySelector('button[aria-label="显示文章首部片段"]');
  const footerSwitch = container.querySelector('button[aria-label="显示文章尾部片段"]');
  expect(headerSwitch.disabled).toBe(false);
  expect(footerSwitch.disabled).toBe(false);

  await act(async () => {
    footerSwitch.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  expect(container.querySelector('.preview-content').textContent).not.toContain('结尾固定内容');
  expect(container.querySelector('.preview-content').textContent).toContain('开头固定内容');
  expect(localStorage.getItem('feishu2wx_showFooterTemplate')).toBe('false');

  // 清空首部片段内容后，对应开关禁用而尾部开关状态保持
  const rows = Array.from(container.querySelectorAll('.settings-row'));
  const headerRow = rows.find((r) => r.querySelector('.settings-row-label')?.textContent === '文章首部片段');
  const headerTextarea = headerRow.querySelector('textarea');
  const setTextareaValue = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;

  await act(async () => {
    setTextareaValue.call(headerTextarea, '');
    headerTextarea.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  expect(container.querySelector('button[aria-label="显示文章首部片段"]').disabled).toBe(true);
  expect(container.querySelector('button[aria-label="显示文章尾部片段"]').disabled).toBe(false);
});

test('renders article start template below frontmatter preview', async () => {
  localStorage.setItem('feishu2wx_markdown', '---\ntitle: 测试标题\ntags: [A, B]\n---\n# 正文标题');
  localStorage.setItem('feishu2wx_headerTemplate', '开头固定内容');

  await act(async () => {
    root.render(<App />);
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  const previewContent = container.querySelector('.preview-content');
  const frontmatterPreview = container.querySelector('.frontmatter-preview');

  expect(frontmatterPreview.textContent).toContain('测试标题');
  expect(previewContent.textContent).toContain('开头固定内容');
  expect(previewContent.innerHTML.indexOf('frontmatter-preview')).toBeLessThan(
    previewContent.innerHTML.indexOf('开头固定内容')
  );
});

test('renders article end template with standard markdown syntax', async () => {
  localStorage.setItem('feishu2wx_markdown', '正文内容');
  localStorage.setItem('feishu2wx_footerTemplate', [
    '## 结尾标题',
    '',
    '- 第一项',
    '- 第二项',
    '',
    '```js',
    'console.log(1)',
    '```',
  ].join('\n'));

  await act(async () => {
    root.render(<App />);
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  const previewContent = container.querySelector('.preview-content');

  expect(previewContent.querySelector('h2').textContent).toContain('结尾标题');
  expect(Array.from(previewContent.querySelectorAll('li')).map((li) => li.textContent.trim())).toEqual(['第一项', '第二项']);
  expect(previewContent.querySelector('pre').textContent).toContain('console.log(1)');
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

test('opens AI panel as overlay drawer by default without shifting content', () => {
  act(() => {
    root.render(<App />);
  });

  const aiFab = Array.from(container.querySelectorAll('.fab-btn')).find((button) => button.title === 'AI 助手');
  act(() => {
    aiFab.click();
  });

  const app = container.querySelector('.app');
  const drawer = container.querySelector('.ai-chat-drawer');
  expect(drawer.className.includes('open')).toBe(true);
  expect(drawer.className.includes('ai-chat-drawer--sidebar')).toBe(false);
  // 抽屉浮在内容上方，内容区不避让
  expect(app.className.includes('ai-sidebar-open')).toBe(false);
});

test('switches AI panel to sidebar mode from settings and shifts content aside', async () => {
  act(() => {
    root.render(<App />);
  });

  await act(async () => {
    container.querySelector('.settings-trigger').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  const sidebarButton = Array.from(container.querySelectorAll('.settings-segmented-btn')).find((button) =>
    button.textContent === '侧栏'
  );
  await act(async () => {
    sidebarButton.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  expect(localStorage.getItem('feishu2wx_aiPanelMode')).toBe('sidebar');

  const aiFab = Array.from(container.querySelectorAll('.fab-btn')).find((button) => button.title === 'AI 助手');
  act(() => {
    aiFab.click();
  });

  const app = container.querySelector('.app');
  const drawer = container.querySelector('.ai-chat-drawer');
  expect(drawer.className.includes('ai-chat-drawer--sidebar')).toBe(true);
  expect(app.className.includes('ai-sidebar-open')).toBe(true);

  // 关闭面板后避让类复位，侧栏配置保留
  const closeButton = Array.from(container.querySelectorAll('.ai-chat-header button')).find((button) =>
    button.title === '关闭'
  );
  act(() => {
    closeButton.click();
  });
  expect(app.className.includes('ai-sidebar-open')).toBe(false);
  expect(localStorage.getItem('feishu2wx_aiPanelMode')).toBe('sidebar');
});
