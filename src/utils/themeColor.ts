/**
 * 自定义主题色工具：由用户选择的单一主色推导出完整主题色板，
 * 预览（CSS 变量）与公众号导出（getThemeStyles）共用同一套推导结果。
 */

export interface CustomThemePalette {
  primaryColor: string;
  primaryColorDark: string;
  headingColor: string;
  headingColorH2: string;
  headingColorH3H6: string;
  linkColor: string;
  blockquoteBorderColor: string;
  blockquoteThemeColor: string;
  blockquoteBgColor: string;
  tableHeaderBgColor: string;
  tableHeaderColor: string;
}

/** 未设置自定义色时的回退主色（与青绿主题一致）。 */
export const CUSTOM_THEME_DEFAULT = '#0d9488';

/** 规范化 hex 输入为 #rrggbb 小写；非法输入返回空串。 */
export function normalizeHex(input: string): string {
  const match = input.replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(match)) return '';
  return `#${match.toLowerCase()}`;
}

export function isValidHexColor(input: string): boolean {
  return normalizeHex(input) !== '';
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = normalizeHex(hex);
  if (!normalized) return null;
  return {
    r: parseInt(normalized.slice(1, 3), 16),
    g: parseInt(normalized.slice(3, 5), 16),
    b: parseInt(normalized.slice(5, 7), 16),
  };
}

function toHex(value: number): string {
  const clamped = Math.max(0, Math.min(255, Math.round(value)));
  return clamped.toString(16).padStart(2, '0');
}

/** 向白/黑方向按比例混合（percent 为负表示变暗）。 */
function shade(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const target = percent >= 0 ? 255 : 0;
  const ratio = Math.abs(percent) / 100;
  return `#${toHex(rgb.r + (target - rgb.r) * ratio)}${toHex(rgb.g + (target - rgb.g) * ratio)}${toHex(rgb.b + (target - rgb.b) * ratio)}`;
}

/** 与白色按 weight 混合，用于生成引用块等处的淡色背景。 */
function tintWithWhite(hex: string, weight: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `#${toHex(rgb.r + (255 - rgb.r) * weight)}${toHex(rgb.g + (255 - rgb.g) * weight)}${toHex(rgb.b + (255 - rgb.b) * weight)}`;
}

/**
 * 由用户主色推导完整主题色板。
 * 非法输入时回退到默认主色，保证任何情况下都返回可用色板。
 */
export function buildCustomThemePalette(color: string): CustomThemePalette {
  const base = normalizeHex(color) || CUSTOM_THEME_DEFAULT;
  return {
    primaryColor: base,
    primaryColorDark: shade(base, -12),
    headingColor: shade(base, -38),
    headingColorH2: shade(base, -38),
    headingColorH3H6: shade(base, -18),
    linkColor: '#576B95',
    blockquoteBorderColor: base,
    blockquoteThemeColor: base,
    blockquoteBgColor: tintWithWhite(base, 0.93),
    tableHeaderBgColor: '#f5f5f5',
    tableHeaderColor: '#333',
  };
}
