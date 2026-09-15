import {
  ARTICLE_THEME_SETTING_KEYS,
  articleThemeSettingsEqual,
  deleteSavedTheme,
  loadSavedThemes,
  parseSavedTheme,
  persistSavedThemes,
  saveThemeSnapshot,
  savedThemeFilename,
  serializeSavedTheme,
} from './savedThemes';

const settings = {
  theme: 'teal', customThemeColor: '#0D9488', font: 'pingfang',
  codeBlockStyle: 'modern', imageBorderStyle: 'shadow', imageBorderRadius: true,
  showH1Underline: true, invertH1: false, alignH1Left: true,
  invertH2: false, alignH2Left: true, showH2Underline: true,
  showHorizontalRule: false, showFrontMatter: true, tableShadow: false,
  blockquoteBackgroundMode: 'theme', blockquoteColorMode: 'default',
  blockquoteHeightMode: 'compact', textAlignMode: 'justify', markerHighlightColor: 'yellow',
};

beforeEach(() => localStorage.clear());

test('exports and imports one complete article theme only', () => {
  const theme = { id: 'theme-1', name: '技术文章', createdAt: 10, updatedAt: 20, settings };
  const json = serializeSavedTheme({ ...theme, appSecret: 'secret', headerTemplate: '尾注' });
  expect(JSON.parse(json)).toEqual({ version: 1, type: 'feishu2wx-theme', name: '技术文章', settings });
  expect(json).not.toContain('secret');
  expect(json).not.toContain('headerTemplate');
  expect(parseSavedTheme(json, 30, () => 'imported')).toEqual({
    theme: { id: 'imported', name: '技术文章', createdAt: 30, updatedAt: 30, settings },
  });
  expect(savedThemeFilename(' 技术/文章 ')).toBe('feishu2wx-theme-技术-文章.json');
});

test('rejects malformed files and invalid settings', () => {
  const valid = { version: 1, type: 'feishu2wx-theme', name: '主题', settings };
  expect(parseSavedTheme('{')).toEqual({ error: '主题文件不是有效的 JSON。' });
  expect(parseSavedTheme(JSON.stringify({ ...valid, version: 2 }))).toEqual({ error: '不支持的主题文件版本。' });
  expect(parseSavedTheme(JSON.stringify({ ...valid, type: 'config' }))).toEqual({ error: '文件不是 feishu2wx 主题。' });
  expect(parseSavedTheme(JSON.stringify({ ...valid, name: '  ' }))).toEqual({ error: '主题名称不能为空。' });
  expect(parseSavedTheme(JSON.stringify({ ...valid, unexpected: true }))).toEqual({ error: '主题文件包含不支持的字段 unexpected。' });
  const { font, ...missingFont } = settings;
  expect(parseSavedTheme(JSON.stringify({ ...valid, settings: missingFont }))).toEqual({ error: '主题配置缺少字段 font。' });
  expect(parseSavedTheme(JSON.stringify({ ...valid, settings: { ...settings, secret: 'x' } }))).toEqual({ error: '主题配置包含不支持的字段 secret。' });
  expect(parseSavedTheme(JSON.stringify({ ...valid, settings: { ...settings, theme: 'pink' } }))).toEqual({ error: '主题配置字段 theme 无效。' });
  expect(parseSavedTheme(JSON.stringify({ ...valid, settings: { ...settings, tableShadow: 'yes' } }))).toEqual({ error: '主题配置字段 tableShadow 无效。' });
});

test('creates, sorts and overwrites themes by normalized name', () => {
  const created = saveThemeSnapshot([], ' 技术文章 ', settings, 10, () => 'theme-1');
  expect(created).toEqual({ themes: [{ id: 'theme-1', name: '技术文章', createdAt: 10, updatedAt: 10, settings }], overwritten: false });
  const second = saveThemeSnapshot(created.themes, '另一主题', settings, 15, () => 'theme-2');
  expect(second.themes.map((theme) => theme.id)).toEqual(['theme-2', 'theme-1']);
  const overwritten = saveThemeSnapshot(second.themes, '技术文章', { ...settings, theme: 'blue' }, 20, () => 'unused');
  expect(overwritten.overwritten).toBe(true);
  expect(overwritten.themes[0]).toMatchObject({ id: 'theme-1', createdAt: 10, updatedAt: 20, settings: { theme: 'blue' } });
  expect(deleteSavedTheme(overwritten.themes, 'theme-1').map((theme) => theme.id)).toEqual(['theme-2']);
});

test('loads valid entries while ignoring damaged entries', () => {
  localStorage.setItem('feishu2wx_savedThemes', JSON.stringify([
    { id: 'older', name: '旧', createdAt: 1, updatedAt: 2, settings },
    { id: 'newer', name: '新', createdAt: 2, updatedAt: 4, settings },
    { id: 'bad', name: '', settings: {} },
  ]));
  expect(loadSavedThemes().map((theme) => theme.id)).toEqual(['newer', 'older']);
  localStorage.setItem('feishu2wx_savedThemes', '{broken');
  expect(loadSavedThemes()).toEqual([]);
});

test('reports storage errors without mutating the theme list', () => {
  const themes = [{ id: 'theme-1', name: '主题', createdAt: 1, updatedAt: 1, settings }];
  const storage = { setItem: () => { throw new Error('quota'); } };
  expect(persistSavedThemes(themes, storage)).toEqual({ success: false, error: '主题保存失败，请检查浏览器存储空间。' });
  expect(themes).toHaveLength(1);
});

test('declares exactly the supported article theme fields', () => {
  expect(ARTICLE_THEME_SETTING_KEYS).toHaveLength(20);
  expect(ARTICLE_THEME_SETTING_KEYS).not.toEqual(expect.arrayContaining([
    'markdown', 'headerTemplate', 'footerTemplate', 'wechatLinkAutoAdapt', 'darkMode',
    'syntaxTheme', 'aiPanelMode', 'appId', 'appSecret', 'apiKey', 'shouldConvertPastedHtml',
  ]));
});

test('matches saved themes by every supported article setting', () => {
  expect(articleThemeSettingsEqual(settings, { ...settings })).toBe(true);
  expect(articleThemeSettingsEqual(settings, { ...settings, font: 'arial' })).toBe(false);
  expect(articleThemeSettingsEqual(settings, { ...settings, theme: 'blue' })).toBe(false);
  expect(articleThemeSettingsEqual(
    settings,
    Object.fromEntries(Object.entries(settings).reverse()),
  )).toBe(true);
});
