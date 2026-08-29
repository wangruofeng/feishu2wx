import React, { act } from 'react';
import ReactDOM from 'react-dom/client';
import AiChatPanel from './AiChatPanel';

let container;
let root;
let originalFetch;

const changeInput = (input, value) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  setter.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
};

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = ReactDOM.createRoot(container);
  originalFetch = global.fetch;
  global.fetch = jest.fn((url, options = {}) => {
    if (String(url).endsWith('/api/auth/session')) {
      return Promise.resolve({ ok: true, json: async () => ({ user: { login: 'octo' } }) });
    }
    if (options.method === 'PUT') {
      const saved = JSON.parse(options.body);
      return Promise.resolve({
        ok: true,
        json: async () => ({ ...saved, providers: saved.providers.map(({ apiKey, ...provider }) => ({ ...provider, hasApiKey: Boolean(apiKey) })) }),
      });
    }
    return Promise.resolve({ ok: true, json: async () => ({ activeProviderId: null, activeModelId: null, providers: [] }) });
  });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  global.fetch = originalFetch;
});

test('keeps API Key input after the cloud save response omits the key', async () => {
  await act(async () => {
    root.render(<AiChatPanel open onClose={() => {}} markdown="" onApplyArticle={() => {}} />);
    await new Promise((resolve) => setTimeout(resolve, 350));
    await Promise.resolve();
  });

  await act(async () => {
    Array.from(container.querySelectorAll('button')).find((button) => button.getAttribute('aria-label') === '模型设置')?.click();
    await Promise.resolve();
  });
  await act(async () => {
    Array.from(document.querySelectorAll('button')).find((button) => button.textContent === '+ 添加供应商')?.click();
    await Promise.resolve();
  });

  const fields = document.querySelectorAll('.ai-ps-field input');
  await act(async () => {
    changeInput(fields[0], 'https://api.example.com');
    changeInput(fields[1], 'sk-test-key');
    await new Promise((resolve) => setTimeout(resolve, 350));
    await Promise.resolve();
  });

  expect(fields[1].value).toBe('sk-test-key');
  expect(global.fetch.mock.calls.filter(([, options]) => options?.method === 'PUT')).toHaveLength(1);
});
