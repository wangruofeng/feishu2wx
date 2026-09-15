import React, { act } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ARTICLE_THEME_SETTING_KEYS } from './utils/savedThemes';

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

const articleThemeSettings = {
  theme: 'blue', customThemeColor: '', font: 'pingfang', codeBlockStyle: 'modern',
  imageBorderStyle: 'border', imageBorderRadius: false, showH1Underline: true,
  invertH1: false, alignH1Left: false, invertH2: false, alignH2Left: false,
  showH2Underline: true, showHorizontalRule: true, showFrontMatter: true,
  tableShadow: true, blockquoteBackgroundMode: 'theme', blockquoteColorMode: 'default',
  blockquoteHeightMode: 'loose', textAlignMode: 'left', markerHighlightColor: 'purple',
};

test('organizes settings into five task-based categories and switches visible content', () => {
  act(() => root.render(<App />));
  act(() => container.querySelector('.settings-trigger').click());

  const tabs = Array.from(container.querySelectorAll('[role="tab"]'));
  expect(tabs.map((tab) => tab.textContent.trim())).toEqual([
    '主题与外观', '文章排版', '内容样式', '编辑体验', '发布与数据',
  ]);
  expect(tabs.map((tab) => tab.querySelector('svg.settings-category-icon')?.getAttribute('aria-hidden')))
    .toEqual(['true', 'true', 'true', 'true', 'true']);
  expect(container.querySelector('.settings-category-nav').textContent).not.toMatch(/[◐¶▦⌨↑]/);
  expect(tabs[0].getAttribute('aria-selected')).toBe('true');
  expect(container.querySelector('.settings-category-nav')).not.toBeNull();
  expect(container.querySelector('.settings-category-panel')).not.toBeNull();
  expect(container.querySelector('[role="tabpanel"] h2').textContent).toBe('主题与外观');
  expect(container.querySelector('.settings-group:not([hidden])').textContent).toContain('文章外观');
  expect(Array.from(container.querySelectorAll('.settings-group:not([hidden])')).some((group) => group.textContent.includes('主题管理'))).toBe(true);
  expect(Array.from(container.querySelectorAll('.settings-group:not([hidden])')).some((group) => group.textContent.includes('H1 底线'))).toBe(false);

  act(() => tabs[1].click());
  expect(tabs[1].getAttribute('aria-selected')).toBe('true');
  expect(Array.from(container.querySelectorAll('.settings-group:not([hidden])')).some((group) => group.textContent.includes('H1 底线'))).toBe(true);
  expect(Array.from(container.querySelectorAll('.settings-group:not([hidden])')).some((group) => group.textContent.includes('主题管理'))).toBe(false);
});

test('supports arrow-key navigation between settings categories', () => {
  act(() => root.render(<App />));
  act(() => container.querySelector('.settings-trigger').click());

  const tabs = Array.from(container.querySelectorAll('[role="tab"]'));
  act(() => tabs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })));

  expect(tabs[1].getAttribute('aria-selected')).toBe('true');
  expect(document.activeElement).toBe(tabs[1]);
  expect(container.querySelector('[role="tabpanel"] h2').textContent).toBe('文章排版');
});

test('returns to theme and appearance when settings is reopened', () => {
  act(() => root.render(<App />));
  const settingsTrigger = container.querySelector('.settings-trigger');
  act(() => settingsTrigger.click());
  act(() => container.querySelector('[role="tab"][aria-controls="settings-panel-editor"]').click());
  expect(container.querySelector('[role="tabpanel"] h2').textContent).toBe('编辑体验');

  act(() => settingsTrigger.click());
  act(() => settingsTrigger.click());

  expect(container.querySelector('[role="tabpanel"] h2').textContent).toBe('主题与外观');
});

test('uses separate preset and custom theme entries and moves presets into settings', async () => {
  const scrollIntoView = jest.fn();
  const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
  HTMLElement.prototype.scrollIntoView = scrollIntoView;

  act(() => root.render(<App />));

  const presetTrigger = Array.from(container.querySelectorAll('button')).find((button) =>
    button.textContent.includes('预设主题')
  );
  const customTrigger = Array.from(container.querySelectorAll('button')).find((button) =>
    button.textContent.includes('自定义主题')
  );

  expect(presetTrigger).toBeTruthy();
  expect(customTrigger).toBeTruthy();
  expect(presetTrigger.getAttribute('aria-haspopup')).toBe('menu');
  expect(presetTrigger.getAttribute('aria-expanded')).toBe('false');
  expect(customTrigger.getAttribute('aria-haspopup')).toBe('dialog');
  expect(customTrigger.getAttribute('aria-expanded')).toBe('false');
  expect(container.querySelectorAll('.preset-theme-trigger, .custom-theme-trigger')).toHaveLength(2);

  act(() => presetTrigger.click());
  expect(presetTrigger.getAttribute('aria-expanded')).toBe('true');
  act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
  expect(presetTrigger.getAttribute('aria-expanded')).toBe('false');

  act(() => presetTrigger.click());
  act(() => document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })));
  expect(presetTrigger.getAttribute('aria-expanded')).toBe('false');

  act(() => presetTrigger.click());
  const orangePreset = Array.from(container.querySelectorAll('[role="menuitemradio"]')).find((button) =>
    button.textContent.includes('橙色')
  );
  act(() => orangePreset.click());
  expect(localStorage.getItem('feishu2wx_theme')).toBe('orange');
  expect(presetTrigger.getAttribute('aria-expanded')).toBe('false');

  await act(async () => {
    customTrigger.click();
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
  expect(container.querySelector('[role="tabpanel"] h2').textContent).toBe('主题与外观');
  expect(customTrigger.getAttribute('aria-expanded')).toBe('true');
  expect(container.querySelector('.settings-preset-themes')).not.toBeNull();
  expect(Array.from(container.querySelectorAll('.settings-preset-theme')).map((button) => button.textContent.trim()))
    .toEqual(['经典', '橙色', '蓝色', '青绿']);
  expect(document.activeElement).toBe(container.querySelector('.settings-custom-theme-row'));
  expect(scrollIntoView).toHaveBeenCalled();

  HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
});

test('saves and reapplies a complete article theme without mutating its snapshot', () => {
  localStorage.setItem('feishu2wx_theme', 'blue');
  localStorage.setItem('feishu2wx_font', 'pingfang');
  localStorage.setItem('feishu2wx_showH1Underline', 'true');
  localStorage.setItem('feishu2wx_showH2Underline', 'true');

  act(() => root.render(<App />));
  act(() => container.querySelector('.settings-trigger').click());

  const nameInput = container.querySelector('[aria-label="主题名称"]');
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(nameInput, '技术文章');
    nameInput.dispatchEvent(new Event('input', { bubbles: true }));
  });
  const saveButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === '保存当前配置');
  act(() => saveButton.click());

  const stored = JSON.parse(localStorage.getItem('feishu2wx_savedThemes'));
  expect(stored).toHaveLength(1);
  expect(stored[0].name).toBe('技术文章');
  expect(stored[0].settings).toMatchObject({ theme: 'blue', font: 'pingfang' });
  expect(Object.keys(stored[0].settings).sort()).toEqual(ARTICLE_THEME_SETTING_KEYS);

  const orangeButton = Array.from(container.querySelectorAll('.settings-preset-theme')).find((button) => button.textContent.includes('橙色'));
  act(() => orangeButton.click());
  expect(orangeButton.classList.contains('active')).toBe(true);

  const savedRow = container.querySelector('.saved-theme-row');
  const applyButton = Array.from(savedRow.querySelectorAll('button')).find((button) => button.textContent === '应用');
  act(() => applyButton.click());
  const blueButton = Array.from(container.querySelectorAll('.settings-preset-theme')).find((button) => button.textContent.includes('蓝色'));
  expect(blueButton.classList.contains('active')).toBe(true);

  const beforeEdit = localStorage.getItem('feishu2wx_savedThemes');
  const invertButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent.includes('H1 反色'));
  act(() => invertButton.click());
  expect(localStorage.getItem('feishu2wx_savedThemes')).toBe(beforeEdit);
});

test('opens the saved theme menu and applies a persisted theme', () => {
  localStorage.setItem('feishu2wx_theme', 'orange');
  localStorage.setItem('feishu2wx_savedThemes', JSON.stringify([{
    id: 'saved-blue', name: '蓝色长文', createdAt: 1, updatedAt: 1, settings: articleThemeSettings,
  }]));

  act(() => root.render(<App />));
  const menuButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent.includes('我的主题'));
  expect(menuButton.getAttribute('aria-haspopup')).toBe('menu');
  expect(menuButton.getAttribute('aria-expanded')).toBe('false');
  const chevron = menuButton.querySelector('svg.saved-theme-menu-chevron');
  expect(chevron).not.toBeNull();
  expect(chevron.getAttribute('aria-hidden')).toBe('true');
  expect(chevron.getAttribute('data-open')).toBe('false');

  act(() => menuButton.click());
  expect(menuButton.getAttribute('aria-expanded')).toBe('true');
  expect(chevron.getAttribute('data-open')).toBe('true');
  const savedButton = container.querySelector('[role="menuitem"]');
  expect(savedButton.textContent).toBe('蓝色长文');
  act(() => savedButton.click());

  expect(container.querySelector('.app').classList.contains('theme-blue')).toBe(true);
  expect(menuButton.getAttribute('aria-expanded')).toBe('false');
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

test('toggles h2 underline style on preview content', () => {
  localStorage.setItem('feishu2wx_markdown', '## 标题');

  act(() => {
    root.render(<App />);
  });

  const previewContent = container.querySelector('.preview-content');
  expect(previewContent.className.includes('show-h2-underline')).toBe(false);

  // 先打开设置面板
  const settingsButton = container.querySelector('.settings-trigger');
  act(() => {
    settingsButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

  // 点击 "H2 底线" 按钮
  const underlineButton = Array.from(container.querySelectorAll('button')).find((button) =>
    button.textContent.includes('H2 底线')
  );

  act(() => {
    if (underlineButton) underlineButton.click();
  });
  expect(previewContent.className.includes('show-h2-underline')).toBe(true);
  expect(localStorage.getItem('feishu2wx_showH2Underline')).toBe('true');
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

  const targetButton = Array.from(document.body.querySelectorAll('.outline-pop-item button')).find((button) =>
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

  const popover = document.body.querySelector('.outline-pop');
  expect(popover.style.left).toBe('280px');
  expect(popover.style.top).toBe('400px');
});

test('fullscreen outline entry jumps preview to the matched heading', () => {
  localStorage.setItem('feishu2wx_markdown', '# 开头\n\n正文段落。\n\n## 目标标题\n\n结尾段落。');

  act(() => {
    root.render(<App />);
  });

  const fullscreenButton = Array.from(container.querySelectorAll('button')).find((button) =>
    button.getAttribute('title') === '全屏预览'
  );
  act(() => {
    fullscreenButton.click();
  });

  const outlineButton = Array.from(container.querySelectorAll('button')).find((button) =>
    button.className.includes('fullscreen-outline-btn')
  );
  expect(outlineButton).toBeTruthy();
  expect(outlineButton.disabled).toBe(false);

  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1000 });
  outlineButton.getBoundingClientRect = jest.fn(() => ({ top: 40, bottom: 56, left: 700, right: 780 }));

  act(() => {
    outlineButton.click();
  });

  const popover = container.querySelector('.outline-pop');
  expect(popover).toBeTruthy();

  const targetButton = Array.from(popover.querySelectorAll('button')).find((button) =>
    button.textContent.includes('目标标题')
  );

  // jsdom 未实现 scrollIntoView，直接挂 mock
  const scrollIntoViewMock = jest.fn();
  const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
  HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

  act(() => {
    targetButton.click();
  });

  const previewContent = container.querySelector('.preview-content');
  const headings = Array.from(previewContent.querySelectorAll('h1, h2, h3'));
  expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
  expect(scrollIntoViewMock.mock.instances[0]).toBe(headings[1]);
  expect(headings[1].className.includes('outline-flash')).toBe(true);

  HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
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
