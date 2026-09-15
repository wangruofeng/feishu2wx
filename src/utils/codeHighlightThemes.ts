/**
 * 预览/导出代码块的语法高亮主题。
 *
 * 与编辑器源码配色（mdSourceHighlight.ts 的 MdSyntaxThemeKey）共用同一组选项，
 * 「源码配色」切换时同时作用于：编辑器 Markdown 源码、预览代码块、复制/导出内容。
 * none 时不注入任何变量，预览与复制沿用各自的默认配色（极简浅底 / 现代 Atom One Dark）。
 */
import { MdSyntaxThemeKey } from './mdSourceHighlight';

export interface CodeThemeSurfaces {
  /** 代码块背景（classic 的 pre、modern 的整体底色） */
  background: string;
  /** modern 代码块头部（红绿灯条）背景 */
  headerBackground: string;
  /** 代码基础文字色 */
  text: string;
}

/** token 分组与 PreviewPane.css 的 hljs 选择器分组一一对应 */
export interface CodeThemeTokens {
  comment: string;
  keyword: string;
  section: string;
  literal: string;
  string: string;
  attr: string;
  symbol: string;
  builtin: string;
}

export interface CodeHighlightTheme extends CodeThemeSurfaces, CodeThemeTokens {}

export const codeHighlightThemes: Record<Exclude<MdSyntaxThemeKey, 'none'>, CodeHighlightTheme> = {
  github: {
    background: '#f6f8fa',
    headerBackground: '#eef1f4',
    text: '#24292e',
    comment: '#57606a',
    keyword: '#cf222e',
    section: '#0550ae',
    literal: '#0550ae',
    string: '#0a3069',
    attr: '#953800',
    symbol: '#8250df',
    builtin: '#953800',
  },
  dracula: {
    background: '#282a36',
    headerBackground: '#21222c',
    text: '#f8f8f2',
    comment: '#6272a4',
    keyword: '#ff79c6',
    section: '#50fa7b',
    literal: '#bd93f9',
    string: '#f1fa8c',
    attr: '#8be9fd',
    symbol: '#ffb86c',
    builtin: '#8be9fd',
  },
  monokai: {
    background: '#272822',
    headerBackground: '#1e1f1c',
    text: '#f8f8f2',
    comment: '#75715e',
    keyword: '#f92672',
    section: '#a6e22e',
    literal: '#ae81ff',
    string: '#e6db74',
    attr: '#66d9ef',
    symbol: '#fd971f',
    builtin: '#66d9ef',
  },
};

/** 把主题映射成 `--code-*` CSS 变量字典，注入 .preview-content；none 返回空对象（沿用默认配色）。 */
export function getCodeThemeCssVars(themeKey: MdSyntaxThemeKey): Record<string, string> {
  if (themeKey === 'none') return {};
  const theme = codeHighlightThemes[themeKey];
  const vars: Record<string, string> = {
    '--code-bg': theme.background,
    '--code-header-bg': theme.headerBackground,
    '--code-text': theme.text,
  };
  (Object.keys(theme) as (keyof CodeHighlightTheme)[]).forEach((key) => {
    if (key === 'background' || key === 'headerBackground' || key === 'text') return;
    vars[`--code-tok-${key}`] = theme[key];
  });
  return vars;
}

/** 复制/导出管线用的表面色；none 返回 null，调用方保持既有默认值。 */
export function getCodeThemeSurfaces(themeKey: MdSyntaxThemeKey): CodeThemeSurfaces | null {
  if (themeKey === 'none') return null;
  const theme = codeHighlightThemes[themeKey];
  return {
    background: theme.background,
    headerBackground: theme.headerBackground,
    text: theme.text,
  };
}
