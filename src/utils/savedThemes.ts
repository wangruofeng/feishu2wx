export interface ArticleThemeSettings {
  theme: 'classic' | 'orange' | 'blue' | 'teal' | 'custom';
  customThemeColor: string;
  font: string;
  codeBlockStyle: 'classic' | 'modern';
  imageBorderStyle: 'border' | 'shadow' | 'default';
  imageBorderRadius: boolean;
  showH1Underline: boolean;
  invertH1: boolean;
  alignH1Left: boolean;
  invertH2: boolean;
  alignH2Left: boolean;
  showH2Underline: boolean;
  showHorizontalRule: boolean;
  showFrontMatter: boolean;
  tableShadow: boolean;
  blockquoteBackgroundMode: 'none' | 'theme';
  blockquoteColorMode: 'default' | 'theme';
  blockquoteHeightMode: 'loose' | 'compact';
  textAlignMode: 'left' | 'justify';
  markerHighlightColor: 'purple' | 'yellow' | 'green' | 'blue' | 'pink';
}

export interface SavedArticleTheme {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  settings: ArticleThemeSettings;
}

export const SAVED_THEMES_KEY = 'feishu2wx_savedThemes';
const FILE_VERSION = 1;
const FILE_TYPE = 'feishu2wx-theme';

const enumFields: Record<string, readonly string[]> = {
  theme: ['classic', 'orange', 'blue', 'teal', 'custom'],
  codeBlockStyle: ['classic', 'modern'],
  imageBorderStyle: ['border', 'shadow', 'default'],
  blockquoteBackgroundMode: ['none', 'theme'],
  blockquoteColorMode: ['default', 'theme'],
  blockquoteHeightMode: ['loose', 'compact'],
  textAlignMode: ['left', 'justify'],
  markerHighlightColor: ['purple', 'yellow', 'green', 'blue', 'pink'],
};

const booleanFields = new Set([
  'imageBorderRadius', 'showH1Underline', 'invertH1', 'alignH1Left', 'invertH2',
  'alignH2Left', 'showH2Underline', 'showHorizontalRule', 'showFrontMatter', 'tableShadow',
]);
const stringFields = new Set(['customThemeColor', 'font']);
export const ARTICLE_THEME_SETTING_KEYS = [
  ...Object.keys(enumFields), ...Array.from(booleanFields), ...Array.from(stringFields),
].sort();

export function articleThemeSettingsEqual(
  a: ArticleThemeSettings,
  b: ArticleThemeSettings,
): boolean {
  return ARTICLE_THEME_SETTING_KEYS.every((key) => Object.is(
    a[key as keyof ArticleThemeSettings],
    b[key as keyof ArticleThemeSettings],
  ));
}
const settingKeySet = new Set(ARTICLE_THEME_SETTING_KEYS);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function validateSettings(value: unknown): { settings: ArticleThemeSettings } | { error: string } {
  if (!isRecord(value)) return { error: '主题配置不是有效对象。' };
  const keys = Object.keys(value);
  const extraKey = keys.find((key) => !settingKeySet.has(key));
  if (extraKey) return { error: `主题配置包含不支持的字段 ${extraKey}。` };
  const missingKey = ARTICLE_THEME_SETTING_KEYS.find((key) => !(key in value));
  if (missingKey) return { error: `主题配置缺少字段 ${missingKey}。` };

  const settings: Record<string, unknown> = {};
  for (const key of ARTICLE_THEME_SETTING_KEYS) {
    const fieldValue = value[key];
    if (key in enumFields) {
      if (typeof fieldValue !== 'string' || !enumFields[key].includes(fieldValue)) {
        return { error: `主题配置字段 ${key} 无效。` };
      }
    } else if (booleanFields.has(key)) {
      if (typeof fieldValue !== 'boolean') return { error: `主题配置字段 ${key} 无效。` };
    } else if (stringFields.has(key) && typeof fieldValue !== 'string') {
      return { error: `主题配置字段 ${key} 无效。` };
    }
    settings[key] = fieldValue;
  }
  return { settings: settings as unknown as ArticleThemeSettings };
}

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `theme-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function validateStoredTheme(value: unknown): SavedArticleTheme | null {
  if (!isRecord(value)) return null;
  const name = typeof value.name === 'string' ? value.name.trim() : '';
  if (!name || typeof value.id !== 'string' || !value.id || typeof value.createdAt !== 'number'
    || !Number.isFinite(value.createdAt) || typeof value.updatedAt !== 'number' || !Number.isFinite(value.updatedAt)) return null;
  const result = validateSettings(value.settings);
  if ('error' in result) return null;
  return { id: value.id, name, createdAt: value.createdAt, updatedAt: value.updatedAt, settings: result.settings };
}

export function loadSavedThemes(storage: Storage = localStorage): SavedArticleTheme[] {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(SAVED_THEMES_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.map(validateStoredTheme).filter((theme): theme is SavedArticleTheme => Boolean(theme))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export function persistSavedThemes(themes: SavedArticleTheme[], storage: Storage = localStorage):
  { success: true } | { success: false; error: string } {
  try {
    storage.setItem(SAVED_THEMES_KEY, JSON.stringify(themes));
    return { success: true };
  } catch {
    return { success: false, error: '主题保存失败，请检查浏览器存储空间。' };
  }
}

export function saveThemeSnapshot(
  themes: SavedArticleTheme[],
  rawName: string,
  settings: ArticleThemeSettings,
  now = Date.now(),
  idFactory: () => string = createId,
): { themes: SavedArticleTheme[]; overwritten: boolean } {
  const name = rawName.trim();
  const existing = themes.find((theme) => theme.name === name);
  const theme: SavedArticleTheme = existing
    ? { ...existing, name, updatedAt: now, settings: { ...settings } }
    : { id: idFactory(), name, createdAt: now, updatedAt: now, settings: { ...settings } };
  return {
    themes: [theme, ...themes.filter((item) => item.id !== theme.id)].sort((a, b) => b.updatedAt - a.updatedAt),
    overwritten: Boolean(existing),
  };
}

export function deleteSavedTheme(themes: SavedArticleTheme[], id: string): SavedArticleTheme[] {
  return themes.filter((theme) => theme.id !== id);
}

function pickSettings(settings: ArticleThemeSettings): ArticleThemeSettings {
  return Object.fromEntries(ARTICLE_THEME_SETTING_KEYS.map((key) => [key, settings[key as keyof ArticleThemeSettings]])) as unknown as ArticleThemeSettings;
}

export function serializeSavedTheme(theme: SavedArticleTheme): string {
  return JSON.stringify({
    version: FILE_VERSION,
    type: FILE_TYPE,
    name: theme.name.trim(),
    settings: pickSettings(theme.settings),
  }, null, 2);
}

export function parseSavedTheme(
  json: string,
  now = Date.now(),
  idFactory: () => string = createId,
): { theme: SavedArticleTheme } | { error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { error: '主题文件不是有效的 JSON。' };
  }
  if (!isRecord(parsed)) return { error: '主题文件格式无效。' };
  if (parsed.version !== FILE_VERSION) return { error: '不支持的主题文件版本。' };
  if (parsed.type !== FILE_TYPE) return { error: '文件不是 feishu2wx 主题。' };
  const allowedRootKeys = new Set(['version', 'type', 'name', 'settings']);
  const extraRootKey = Object.keys(parsed).find((key) => !allowedRootKeys.has(key));
  if (extraRootKey) return { error: `主题文件包含不支持的字段 ${extraRootKey}。` };
  const name = typeof parsed.name === 'string' ? parsed.name.trim() : '';
  if (!name) return { error: '主题名称不能为空。' };
  const result = validateSettings(parsed.settings);
  if ('error' in result) return result;
  return { theme: { id: idFactory(), name, createdAt: now, updatedAt: now, settings: result.settings } };
}

export function savedThemeFilename(name: string): string {
  const safeName = name.trim().replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, '-').replace(/-+/g, '-');
  return `feishu2wx-theme-${safeName || '未命名'}.json`;
}
