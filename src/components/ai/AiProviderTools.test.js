import { confirmAction } from '../ui/ConfirmDialog';
import React, { act, useState } from 'react';
import ReactDOM from 'react-dom/client';
import AiProviderSettings from './AiProviderSettings';
import { fetchAiModels } from '../../utils/aiChat';

jest.mock('../ui/ConfirmDialog', () => ({ confirmAction: jest.fn() }));

jest.mock('../../utils/aiChat', () => ({ ...jest.requireActual('../../utils/aiChat'), fetchAiModels: jest.fn() }));

const provider = { id: 'one', name: 'First', enabled: true, baseUrl: 'https://api.example.com', apiFormat: 'chat-completions', apiKey: 'key', models: [{ id: 'manual' }] };
let container;
let root;
let current;
let setSettings;
const onChange = jest.fn();
function Host({ initial, cloudUser = null, beforeModelFetch }) {
  const [settings, update] = useState(initial);
  current = settings;
  setSettings = update;
  return <AiProviderSettings settings={settings} onChange={(next) => { onChange(next); update(next); }} onClose={() => {}} cloudUser={cloudUser} cloudLoading={false} onLogin={() => {}} onLogout={() => {}} onBeforeModelFetch={beforeModelFetch} />;
}
const button = (text) => Array.from(document.querySelectorAll('button')).find((node) => node.textContent === text);
const render = async (initial = { activeProviderId: 'one', activeModelId: 'manual', providers: [provider] }, cloudUser = null) => {
  await act(async () => { root.render(<Host initial={initial} cloudUser={cloudUser} />); });
};
const upload = async (source, size) => {
  const input = document.querySelector('input[type="file"]');
  const file = new File([source], 'models.json', { type: 'application/json' });
  if (size) Object.defineProperty(file, 'size', { value: size });
  Object.defineProperty(input, 'files', { configurable: true, value: [file] });
  await act(async () => { input.dispatchEvent(new Event('change', { bubbles: true })); await new Promise((resolve) => setTimeout(resolve, 30)); });
};
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = ReactDOM.createRoot(container);
  fetchAiModels.mockReset();
  onChange.mockReset();
});
afterEach(() => { act(() => root.unmount()); container.remove(); jest.restoreAllMocks(); });

test('imports from the footer even with no suppliers using a natively associated file label', async () => {
  await render({ activeProviderId: null, activeModelId: null, providers: [] });
  const input = document.querySelector('input[type="file"]');
  expect(document.querySelector(`label[for="${input.id}"]`).textContent).toContain('导入配置');
  const source = JSON.stringify({ type: 'asksail-model-settings', version: 1, providers: [{ ...provider, models: ['imported'] }] });
  await upload(source);
  expect(current.providers[0].models).toEqual([{ id: 'imported' }]);
  expect(document.querySelector('.ai-ps-transfer').textContent).toContain('已新增');
});

test('invalid or oversized imports never change configuration, and replacement requires confirmation', async () => {
  await render();
  await upload('bad');
  await upload('{}', 1024 * 1024 + 1);
  expect(onChange).not.toHaveBeenCalled();
  const mode = document.querySelector('[aria-label="配置导入方式"]');
  await act(async () => { mode.value = 'replace'; mode.dispatchEvent(new Event('change', { bubbles: true })); });
  const confirm = confirmAction.mockResolvedValue(false);
  await upload(JSON.stringify({ type: 'asksail-model-settings', version: 1, providers: [{ ...provider, models: ['imported'] }] }));
  expect(confirm).toHaveBeenCalled();
  expect(onChange).not.toHaveBeenCalled();
});

test('cloud export explains hidden keys are excluded and model discovery does not require a local key', async () => {
  fetchAiModels.mockResolvedValue(['manual', 'discovered']);
  await render({ activeProviderId: 'one', activeModelId: 'manual', providers: [{ ...provider, apiKey: '', hasApiKey: true }] }, { login: 'octo', avatarUrl: '' });
  expect(document.querySelector('.ai-ps-transfer').textContent).toContain('不含云端 Key');
  await act(async () => { button('获取模型列表').click(); });
  expect(current.providers[0].models).toEqual([{ id: 'manual' }, { id: 'discovered' }]);
});

test('exports a local file with only browser-known keys and a version marker', async () => {
  let blob;
  const originalCreate = URL.createObjectURL;
  URL.createObjectURL = jest.fn((value) => { blob = value; return 'blob:models'; });
  const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  try {
    await render();
    await act(async () => { button('导出配置').click(); });
    const text = await new Promise((resolve) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.readAsText(blob); });
    expect(JSON.parse(text)).toMatchObject({ type: 'feishu2wx-model-settings', version: 1, providers: [{ apiKey: 'key' }] });
    expect(click).toHaveBeenCalled();
  } finally { URL.createObjectURL = originalCreate; }
});

test('offers Google Generative AI with its official base URL guidance', async () => {
  await render();
  const select = document.querySelector('.ai-ps-field select');
  expect(Array.from(select.options).find((option) => option.value === 'google-generative-ai')?.textContent).toBe('Google Generative AI');
  await act(async () => { select.value = 'google-generative-ai'; select.dispatchEvent(new Event('change', { bubbles: true })); });
  expect(document.querySelector('.ai-ps-field input').placeholder).toBe('https://generativelanguage.googleapis.com');
  expect(document.body.textContent).toContain('自动使用 /v1beta/models');
});

test('model discovery appends to the latest manual edits, deduplicates and can retry failures', async () => {
  let resolve;
  fetchAiModels.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
  await render();
  await act(async () => { button('获取模型列表').click(); });
  await act(async () => { setSettings((previous) => ({ ...previous, providers: [{ ...provider, models: [{ id: 'manual' }, { id: 'typed-while-loading' }] }] })); });
  await act(async () => { resolve(['manual', 'remote']); });
  expect(current.providers[0].models.map(({ id }) => id)).toEqual(['manual', 'typed-while-loading', 'remote']);
  fetchAiModels.mockRejectedValueOnce(new Error('连接失败'));
  await act(async () => { button('获取模型列表').click(); });
  expect(document.body.textContent).toContain('连接失败');
  expect(button('重试获取')).toBeTruthy();
});

test('changing connection aborts discovery and prevents a late result from changing models', async () => {
  let resolve;
  fetchAiModels.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
  await render();
  await act(async () => { button('获取模型列表').click(); });
  const signal = fetchAiModels.mock.calls[0][2];
  await act(async () => { setSettings((previous) => ({ ...previous, providers: [{ ...provider, baseUrl: 'https://other.example.com' }] })); });
  expect(signal.aborted).toBe(true);
  await act(async () => { resolve(['stale']); });
  expect(current.providers[0].models).toEqual([{ id: 'manual' }]);
});

test('switching suppliers aborts discovery and keeps the new supplier models', async () => {
  let resolve;
  fetchAiModels.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
  await render({ activeProviderId: 'one', activeModelId: 'manual', providers: [provider, { ...provider, id: 'two', name: 'Second' }] });
  await act(async () => { button('获取模型列表').click(); });
  const signal = fetchAiModels.mock.calls[0][2];
  await act(async () => { document.querySelectorAll('.ai-ps-provider-main')[1].click(); });
  expect(signal.aborted).toBe(true);
  await act(async () => { resolve(['stale']); });
  expect(current.providers.every((item) => item.models.length === 1)).toBe(true);
});

test('waits for pending cloud settings before listing and reports save errors without listing', async () => {
  let save;
  const before = jest.fn(() => new Promise((resolve) => { save = resolve; }));
  await act(async () => { root.render(<Host initial={{ activeProviderId: 'one', activeModelId: 'manual', providers: [provider] }} cloudUser={{ login: 'octo', avatarUrl: '' }} beforeModelFetch={before} />); });
  await act(async () => { button('获取模型列表').click(); });
  expect(fetchAiModels).not.toHaveBeenCalled();
  fetchAiModels.mockResolvedValue(['fresh']);
  await act(async () => { save(); });
  expect(current.providers[0].models.map(({ id }) => id)).toEqual(['manual', 'fresh']);
  before.mockRejectedValueOnce(new Error('云端配置保存失败'));
  fetchAiModels.mockClear();
  await act(async () => { button('获取模型列表').click(); });
  expect(fetchAiModels).not.toHaveBeenCalled();
  expect(document.body.textContent).toContain('云端配置保存失败');
});

test('clears only the selected supplier models and keeps its credentials and other suppliers', async () => {
  await render({ activeProviderId: 'one', activeModelId: 'manual', providers: [provider, { ...provider, id: 'two', name: 'Second', models: [{ id: 'other' }] }] });
  await act(async () => { button('清空列表').click(); });
  expect(current.providers[0]).toMatchObject({ baseUrl: provider.baseUrl, apiKey: 'key', models: [] });
  expect(current.providers[1].models).toEqual([{ id: 'other' }]);
  expect(current.activeModelId).not.toBe('manual');
  expect(button('清空列表').disabled).toBe(true);
  expect(document.body.textContent).toContain('已添加：0');
});

test('clearing during discovery aborts the request and ignores its late result', async () => {
  let resolve;
  fetchAiModels.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
  await render();
  await act(async () => { button('获取模型列表').click(); });
  const signal = fetchAiModels.mock.calls[0][2];
  await act(async () => { button('清空列表').click(); });
  expect(signal.aborted).toBe(true);
  await act(async () => { resolve(['stale']); });
  expect(current.providers[0].models).toEqual([]);
  expect(document.body.textContent).toContain('已清空当前供应商');
});

test('supplier switch toggles enabled state and preserves connection and models', async () => {
  await render();
  const toggle = document.querySelector('[role="switch"][aria-label="启用供应商"]');
  expect(toggle.getAttribute('aria-checked')).toBe('true');
  await act(async () => { toggle.click(); });
  expect(toggle.getAttribute('aria-checked')).toBe('false');
  expect(current.providers[0]).toMatchObject({ enabled: false, apiKey: 'key', models: [{ id: 'manual' }] });
  expect(document.querySelector('.ai-ps-badge').textContent).toBe('已禁用');
  await act(async () => { toggle.click(); });
  expect(toggle.getAttribute('aria-checked')).toBe('true');
  expect(current.providers[0].enabled).toBe(true);
  expect(document.querySelector('.ai-ps-badge').textContent).toBe('已启用');
});
