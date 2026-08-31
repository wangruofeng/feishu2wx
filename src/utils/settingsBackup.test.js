import { createSettingsBackup, parseSettingsBackup } from './settingsBackup';

const settings = {
  theme: 'teal',
  customThemeColor: '#0D9488',
  font: 'pingfang',
  shouldConvertPastedHtml: false,
  codeBlockStyle: 'modern',
  imageBorderStyle: 'shadow',
  imageBorderRadius: true,
  showH1Underline: true,
  invertH1: false,
  alignH1Left: true,
  invertH2: false,
  alignH2Left: true,
  showHorizontalRule: false,
  showFrontMatter: true,
  tableShadow: false,
  blockquoteBackgroundMode: 'theme',
  blockquoteColorMode: 'default',
  blockquoteHeightMode: 'compact',
  textAlignMode: 'justify',
  headerTemplate: '开头',
  footerTemplate: '结尾',
  showHeaderTemplate: true,
  showFooterTemplate: false,
  wechatLinkAutoAdapt: true,
  markerHighlightColor: 'yellow',
  darkMode: 'dark',
  syntaxTheme: 'dracula',
  aiPanelMode: 'sidebar',
};

test('exports a unified safe config', () => {
  const json = createSettingsBackup({ ...settings, appSecret: 'secret', apiKey: 'key' });
  const parsed = JSON.parse(json);

  expect(parsed.version).toBe(1);
  expect(parsed).toMatchObject({
    theme: {
      theme: 'teal', font: 'pingfang', codeBlockStyle: 'modern', imageBorderStyle: 'shadow',
      blockquoteBackgroundMode: 'theme', showBlockquoteBg: true,
    },
    editor: {
      customThemeColor: '#0D9488', shouldConvertPastedHtml: false, showFrontMatter: true,
      darkMode: 'dark', syntaxTheme: 'dracula', aiPanelMode: 'sidebar',
    },
    header: '开头', footer: '结尾', wechatLinkAutoAdapt: true,
  });
  expect(json).not.toContain('secret');
  expect(json).not.toContain('apiKey');
});

test('imports a unified CLI config and ignores credentials', () => {
  const result = parseSettingsBackup(JSON.stringify({
    version: 1,
    theme: {
      theme: 'teal', font: 'pingfang', codeBlockStyle: 'modern', imageBorderStyle: 'shadow',
      imageBorderRadius: true, showH1Underline: true, invertH1: false, alignH1Left: true,
      invertH2: false, alignH2Left: true, showHorizontalRule: false, tableShadow: false,
      blockquoteBackgroundMode: 'theme', blockquoteColorMode: 'default', blockquoteHeightMode: 'compact',
      textAlignMode: 'justify', markerHighlightColor: 'yellow',
    },
    editor: {
      customThemeColor: '#0D9488', shouldConvertPastedHtml: false, showFrontMatter: true,
      showHeaderTemplate: true, showFooterTemplate: false, darkMode: 'dark', syntaxTheme: 'dracula', aiPanelMode: 'sidebar',
    },
    header: '开头', footer: '结尾', wechatLinkAutoAdapt: true,
    wechat: { appId: 'app-id', appSecret: 'must-not-import' },
  }));

  expect(result).toEqual({ settings });
});

test('rejects malformed or unsupported settings backups', () => {
  expect(parseSettingsBackup('{')).toEqual({ error: '配置文件不是有效的 JSON。' });
  expect(parseSettingsBackup(JSON.stringify({ version: 3, settings }))).toEqual({ error: '不支持的配置文件版本。' });
  expect(parseSettingsBackup(JSON.stringify({ version: 1, theme: { darkMode: 'midnight' } }))).toEqual({ error: '配置字段 darkMode 无效。' });
});
