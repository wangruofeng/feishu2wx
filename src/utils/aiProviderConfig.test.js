import { exportAiProviderConfig, importAiProviderConfig, applyAiProviderImport } from './aiProviderConfig';

const provider = { id: 'old', name: 'Gemini', enabled: true, baseUrl: 'https://generativelanguage.googleapis.com', apiFormat: 'google-generative-ai', apiKey: 'local-key', models: [{ id: 'gemini-test' }] };
const settings = { activeProviderId: 'old', activeModelId: 'gemini-test', providers: [provider] };

test('exports a marked native configuration including only browser-known keys and restores active model with new provider IDs', () => {
  const source = exportAiProviderConfig({ ...settings, providers: [{ ...provider, hasApiKey: true }] });
  expect(JSON.parse(source)).toMatchObject({ type: 'feishu2wx-model-settings', version: 1, providers: [{ apiKey: 'local-key' }] });
  expect(source).not.toContain('hasApiKey');
  const restored = importAiProviderConfig(source);
  expect(restored.providers[0].id).not.toBe('old');
  expect(restored.activeProviderId).toBe(restored.providers[0].id);
  expect(restored.activeModelId).toBe('gemini-test');
});

test('imports A2Make string models and deduplicates them', () => {
  const result = importAiProviderConfig(JSON.stringify({ type: 'asksail-model-settings', version: 1, providers: [{ ...provider, models: [' gemini-test ', 'gemini-test', 'other'] }] }));
  expect(result.providers[0].models).toEqual([{ id: 'gemini-test' }, { id: 'other' }]);
});

test.each(['openai-images', 'dashscope-images', 'unknown'])('rejects unsupported protocol %s in the entire file', (apiFormat) => {
  expect(() => importAiProviderConfig(JSON.stringify({ type: 'asksail-model-settings', version: 1, providers: [provider, { ...provider, apiFormat }] }))).toThrow('不支持');
});

test.each([{ models: [3] }, { apiKey: null }, { enabled: 'true' }, { baseUrl: 'javascript:alert(1)' }])('rejects invalid provider fields without mutating existing settings', (patch) => {
  const before = JSON.stringify(settings);
  expect(() => importAiProviderConfig(JSON.stringify({ type: 'feishu2wx-model-settings', version: 1, providers: [{ ...provider, ...patch }] }))).toThrow();
  expect(JSON.stringify(settings)).toBe(before);
});

test('append preserves existing selection and replace uses the imported selection', () => {
  const imported = importAiProviderConfig(exportAiProviderConfig(settings));
  const appended = applyAiProviderImport(settings, imported, 'append');
  expect(appended.providers).toHaveLength(2);
  expect(appended.activeProviderId).toBe('old');
  expect(applyAiProviderImport(settings, imported, 'replace')).toEqual(imported);
});

test('rejects incompatible versions, unrelated files and malformed JSON', () => {
  for (const source of ['bad', '{}', '{"type":"feishu2wx-model-settings","version":2,"providers":[]}']) {
    expect(() => importAiProviderConfig(source)).toThrow();
  }
});

test('rejects files exceeding cloud provider or model limits and append overflow', () => {
  const source = (providers) => JSON.stringify({ type: 'asksail-model-settings', version: 1, providers });
  const many = Array.from({ length: 20 }, (_, index) => ({ ...provider, id: `provider-${index}` }));
  expect(() => importAiProviderConfig(source([...many, { ...provider, id: 'overflow' }]))).toThrow('20');
  expect(() => importAiProviderConfig(source([{ ...provider, models: Array.from({ length: 1001 }, (_, index) => `model-${index}`) }]))).toThrow('1000');
  const imported = importAiProviderConfig(source(many));
  expect(() => applyAiProviderImport(settings, imported, 'append')).toThrow('20');
});
