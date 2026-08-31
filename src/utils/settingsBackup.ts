export interface SettingsBackup {
  theme: 'classic' | 'orange' | 'blue' | 'teal' | 'custom';
  customThemeColor: string;
  font: string;
  shouldConvertPastedHtml: boolean;
  codeBlockStyle: 'classic' | 'modern';
  imageBorderStyle: 'border' | 'shadow' | 'default';
  imageBorderRadius: boolean;
  showH1Underline: boolean;
  invertH1: boolean;
  alignH1Left: boolean;
  invertH2: boolean;
  alignH2Left: boolean;
  showHorizontalRule: boolean;
  showFrontMatter: boolean;
  tableShadow: boolean;
  blockquoteBackgroundMode: 'none' | 'theme';
  blockquoteColorMode: 'default' | 'theme';
  blockquoteHeightMode: 'loose' | 'compact';
  textAlignMode: 'left' | 'justify';
  headerTemplate: string;
  footerTemplate: string;
  showHeaderTemplate: boolean;
  showFooterTemplate: boolean;
  wechatLinkAutoAdapt: boolean;
  markerHighlightColor: 'purple' | 'yellow' | 'green' | 'blue' | 'pink';
  darkMode: 'system' | 'light' | 'dark';
  syntaxTheme: 'github' | 'dracula' | 'monokai' | 'none';
  aiPanelMode: 'drawer' | 'sidebar';
}

const VERSION = 1;

const enumValues: Record<string, readonly string[]> = {
  theme: ['classic', 'orange', 'blue', 'teal', 'custom'],
  codeBlockStyle: ['classic', 'modern'],
  imageBorderStyle: ['border', 'shadow', 'default'],
  blockquoteBackgroundMode: ['none', 'theme'],
  blockquoteColorMode: ['default', 'theme'],
  blockquoteHeightMode: ['loose', 'compact'],
  textAlignMode: ['left', 'justify'],
  markerHighlightColor: ['purple', 'yellow', 'green', 'blue', 'pink'],
  darkMode: ['system', 'light', 'dark'],
  syntaxTheme: ['github', 'dracula', 'monokai', 'none'],
  aiPanelMode: ['drawer', 'sidebar'],
};

const booleanFields = new Set([
  'shouldConvertPastedHtml', 'imageBorderRadius', 'showH1Underline', 'invertH1', 'alignH1Left',
  'invertH2', 'alignH2Left', 'showHorizontalRule', 'showFrontMatter', 'tableShadow',
  'showHeaderTemplate', 'showFooterTemplate', 'wechatLinkAutoAdapt',
]);

const stringFields = new Set(['customThemeColor', 'font', 'headerTemplate', 'footerTemplate']);
const settingKeys = new Set([...Object.keys(enumValues), ...Array.from(booleanFields), ...Array.from(stringFields)]);
const themeFields = new Set([
  'theme', 'font', 'codeBlockStyle', 'imageBorderStyle', 'imageBorderRadius', 'showH1Underline',
  'invertH1', 'alignH1Left', 'invertH2', 'alignH2Left', 'showHorizontalRule', 'tableShadow',
  'blockquoteBackgroundMode', 'blockquoteColorMode', 'blockquoteHeightMode', 'textAlignMode',
  'markerHighlightColor',
]);
const editorFields = new Set([
  'customThemeColor', 'shouldConvertPastedHtml', 'showFrontMatter', 'showHeaderTemplate',
  'showFooterTemplate', 'darkMode', 'syntaxTheme', 'aiPanelMode',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function createSettingsBackup(settings: SettingsBackup): string {
  const safeSettings = Object.fromEntries(Object.entries(settings).filter(([key]) => settingKeys.has(key)));
  const theme = Object.fromEntries(Object.entries(safeSettings).filter(([key]) => themeFields.has(key)));
  const editor = Object.fromEntries(Object.entries(safeSettings).filter(([key]) => editorFields.has(key)));
  return JSON.stringify({
    version: VERSION,
    theme: { ...theme, showBlockquoteBg: theme.blockquoteBackgroundMode !== 'none' },
    editor,
    header: safeSettings.headerTemplate,
    footer: safeSettings.footerTemplate,
    wechatLinkAutoAdapt: safeSettings.wechatLinkAutoAdapt,
  }, null, 2);
}

function validateSettings(values: Record<string, unknown>): { settings: Partial<SettingsBackup> } | { error: string } {
  const settings: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) {
    if (key in enumValues) {
      if (typeof value !== 'string' || !enumValues[key].includes(value)) return { error: `配置字段 ${key} 无效。` };
      settings[key] = value;
    } else if (booleanFields.has(key)) {
      if (typeof value !== 'boolean') return { error: `配置字段 ${key} 无效。` };
      settings[key] = value;
    } else if (stringFields.has(key)) {
      if (typeof value !== 'string') return { error: `配置字段 ${key} 无效。` };
      settings[key] = value;
    }
  }

  if (Object.keys(settings).length === 0) return { error: '配置文件不包含可导入的设置。' };
  return { settings: settings as Partial<SettingsBackup> };
}

export function parseSettingsBackup(json: string): { settings: Partial<SettingsBackup> } | { error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { error: '配置文件不是有效的 JSON。' };
  }

  if (!isRecord(parsed) || parsed.version !== VERSION) return { error: '不支持的配置文件版本。' };
  if (!isRecord(parsed.theme) && !isRecord(parsed.editor)) return { error: '配置文件不包含可导入的设置。' };
  return validateSettings({
    ...(isRecord(parsed.theme) ? parsed.theme : {}),
    ...(isRecord(parsed.editor) ? parsed.editor : {}),
    ...(parsed.header === undefined ? {} : { headerTemplate: parsed.header }),
    ...(parsed.footer === undefined ? {} : { footerTemplate: parsed.footer }),
    ...(parsed.wechatLinkAutoAdapt === undefined ? {} : { wechatLinkAutoAdapt: parsed.wechatLinkAutoAdapt }),
  });
}
