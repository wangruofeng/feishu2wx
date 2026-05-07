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
  localStorage.setItem('feishu2wx_showH1', 'true');
  localStorage.setItem('feishu2wx_showHorizontalRule', 'true');

  act(() => {
    root.render(<App />);
  });

  const previewContent = container.querySelector('.preview-content');
  expect(previewContent.className.includes('invert-h1')).toBe(false);

  const invertButton = Array.from(container.querySelectorAll('button')).find((button) =>
    button.textContent.includes('开启 H1 反显')
  );

  act(() => {
    invertButton.click();
  });
  expect(previewContent.className.includes('invert-h1')).toBe(true);

  const resetButton = Array.from(container.querySelectorAll('button')).find((button) =>
    button.textContent.includes('关闭 H1 反显')
  );

  act(() => {
    resetButton.click();
  });
  expect(previewContent.className.includes('invert-h1')).toBe(false);
});
