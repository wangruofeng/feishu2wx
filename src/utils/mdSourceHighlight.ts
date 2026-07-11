/**
 * Markdown 源码语法高亮（用于编辑器 textarea 的叠加高亮层）。
 *
 * 设计要点：
 * - 纯函数，输入 Markdown 源码字符串，输出带 `<span class="md-tok-xxx">` 的 HTML 串。
 * - 每个原始字符在输出中恰好出现一次（经 HTML 转义或被 span 包裹），
 *   span 不跨越换行，因此配合 `white-space: pre-wrap` 可与 textarea 像素级对齐。
 * - 采用「行扫描 + 行内正则匹配 + 重叠区间贪心去重」的轻量方案，不引入新依赖。
 */

export type MdSyntaxThemeKey = 'github' | 'dracula' | 'monokai' | 'none';

interface ThemeColors {
  heading: string;
  quote: string;
  codeblock: string;
  code: string;
  list: string;
  bold: string;
  italic: string;
  link: string;
  image: string;
  hr: string;
  frontmatter: string;
}

/** 预设配色方案：github 偏亮色、dracula/monokai 偏暗色，适合编辑器源码区分。 */
export const mdSyntaxThemes: Record<Exclude<MdSyntaxThemeKey, 'none'>, ThemeColors> = {
  github: {
    heading: '#0550ae',
    quote: '#57606a',
    codeblock: '#6e7781',
    code: '#0550ae',
    list: '#116329',
    bold: '#1f2328',
    italic: '#6f42c1',
    link: '#0969da',
    image: '#bf3989',
    hr: '#8c959f',
    frontmatter: '#8250df',
  },
  dracula: {
    heading: '#bd93f9',
    quote: '#6272a4',
    codeblock: '#50fa7b',
    code: '#50fa7b',
    list: '#8be9fd',
    bold: '#ffb86c',
    italic: '#f1fa8c',
    link: '#ff79c6',
    image: '#ff79c6',
    hr: '#44475a',
    frontmatter: '#bd93f9',
  },
  monokai: {
    heading: '#66d9ef',
    quote: '#75715e',
    codeblock: '#a6e22e',
    code: '#a6e22e',
    list: '#fd971f',
    bold: '#f92672',
    italic: '#e6db74',
    link: '#66d9ef',
    image: '#ae81ff',
    hr: '#49483e',
    frontmatter: '#ae81ff',
  },
};

/** 把配色方案映射成 `--md-tok-*` CSS 变量字典，供高亮层容器注入。none 返回空对象。 */
export function getMdSyntaxCssVars(themeKey: MdSyntaxThemeKey): Record<string, string> {
  if (themeKey === 'none') return {};
  const theme = mdSyntaxThemes[themeKey];
  const vars: Record<string, string> = {};
  (Object.keys(theme) as (keyof ThemeColors)[]).forEach((key) => {
    vars[`--md-tok-${key}`] = theme[key];
  });
  return vars;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

interface InlineMatch {
  start: number;
  end: number; // exclusive
  cls: string;
}

/** 收集一行内的所有行内标记匹配（可能重叠，后续贪心去重）。 */
function collectInlineMatches(text: string): InlineMatch[] {
  const matches: InlineMatch[] = [];
  let m: RegExpExecArray | null;

  // 行内代码（反引号），内部不再解析
  const codeRe = /(`+)([\s\S]+?)(\1)/g;
  while ((m = codeRe.exec(text)) !== null) {
    matches.push({ start: m.index, end: m.index + m[0].length, cls: 'md-tok-code' });
  }
  // 图片 ![alt](url)
  const imgRe = /(!\[)([^\]]*)\]\(([^)\s]*)(?:\s+"[^"]*")?\)/g;
  while ((m = imgRe.exec(text)) !== null) {
    matches.push({ start: m.index, end: m.index + m[0].length, cls: 'md-tok-image' });
  }
  // 链接 [text](url) —— 要求 [ 前非 !，避免与图片重复
  const linkRe = /(?<!!)(\[)([^\]]*)\]\(([^)\s]*)(?:\s+"[^"]*")?\)/g;
  while ((m = linkRe.exec(text)) !== null) {
    matches.push({ start: m.index, end: m.index + m[0].length, cls: 'md-tok-link' });
  }
  // 加粗 ** ** 或 __ __（\1 反向引用保证开闭标记一致）
  const boldRe = /(\*\*|__)(?!\s)([\s\S]+?)(?!\s)\1/g;
  while ((m = boldRe.exec(text)) !== null) {
    matches.push({ start: m.index, end: m.index + m[0].length, cls: 'md-tok-bold' });
  }
  // 斜体 * * 或 _ _
  const italicRe = /(\*|_)(?!\s)([^*\n]+?)(?!\s)\1/g;
  while ((m = italicRe.exec(text)) !== null) {
    matches.push({ start: m.index, end: m.index + m[0].length, cls: 'md-tok-italic' });
  }

  // 起始位置升序、长度降序（长度优先，使 ** 自然胜过 *）
  matches.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));
  return matches;
}

/** 对单行文本做行内高亮：输出 HTML，未匹配部分转义，匹配部分包裹 span。 */
function tokenizeInline(text: string): string {
  const all = collectInlineMatches(text);
  // 贪心选取不重叠区间（collectInlineMatches 已按 start 升序、长度降序排序）
  const chosen: InlineMatch[] = [];
  let end = 0;
  for (const mt of all) {
    if (mt.start >= end) {
      chosen.push(mt);
      end = mt.end;
    }
  }

  let result = '';
  let pos = 0;
  for (const mt of chosen) {
    result += escapeHtml(text.slice(pos, mt.start));
    result += `<span class="${mt.cls}">${escapeHtml(text.slice(mt.start, mt.end))}</span>`;
    pos = mt.end;
  }
  result += escapeHtml(text.slice(pos));
  return result;
}

/**
 * 把 Markdown 源码转成带语法高亮 span 的 HTML（保留原换行 `\n`）。
 * 行级元素（标题/引用/代码块/列表/分割线/frontmatter）整体着色；
 * 普通行与引用/列表的内容部分做行内标记着色。
 */
export function tokenizeMarkdown(source: string): string {
  const lines = source.split('\n');
  const out: string[] = [];
  let inCodeBlock = false;
  let inFrontmatter = false;
  let isFirstLine = true;

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const trimmed = line.trim();

    // frontmatter 起始（仅文档首行 --- 触发）
    if (isFirstLine) {
      isFirstLine = false;
      if (trimmed === '---') {
        inFrontmatter = true;
        out.push(`<span class="md-tok-frontmatter">${escapeHtml(line)}</span>`);
        continue;
      }
    }

    // frontmatter 区间内整体着色，遇到闭合 --- 结束
    if (inFrontmatter) {
      if (trimmed === '---') inFrontmatter = false;
      out.push(`<span class="md-tok-frontmatter">${escapeHtml(line)}</span>`);
      continue;
    }

    // 围栏代码块：``` 切换状态，整行（含围栏与内容）着色
    if (/^\s*```/.test(line)) {
      inCodeBlock = !inCodeBlock;
      out.push(`<span class="md-tok-codeblock">${escapeHtml(line)}</span>`);
      continue;
    }
    if (inCodeBlock) {
      out.push(`<span class="md-tok-codeblock">${escapeHtml(line)}</span>`);
      continue;
    }

    // 分割线 --- / *** / ___（至少三个相同字符）
    if (/^\s*([-*_])(\1{2,})[ \t]*$/.test(line)) {
      out.push(`<span class="md-tok-hr">${escapeHtml(line)}</span>`);
      continue;
    }

    // ATX 标题（#~######，# 后需空格或行尾）
    if (/^#{1,6}(\s|$)/.test(line)) {
      out.push(`<span class="md-tok-heading">${escapeHtml(line)}</span>`);
      continue;
    }

    // 引用 >（含嵌套 >）：前缀着色，剩余内容行内解析
    const bq = line.match(/^\s{0,3}(?:>\s?)+/);
    if (bq) {
      const prefix = bq[0];
      out.push(`<span class="md-tok-quote">${escapeHtml(prefix)}</span>${tokenizeInline(line.slice(prefix.length))}`);
      continue;
    }

    // 列表（无序/有序/任务列表）：标记与复选框着色，内容行内解析
    const li = line.match(/^(\s*)([-*+]|\d+\.)\s+(\[[ xX]\]\s+)?/);
    if (li) {
      const indent = li[1];
      const marker = li[0].slice(indent.length); // 标记 + 空格 + 可选任务框
      const content = line.slice(li[0].length);
      out.push(`${escapeHtml(indent)}<span class="md-tok-list">${escapeHtml(marker)}</span>${tokenizeInline(content)}`);
      continue;
    }

    // 普通行：行内解析
    out.push(tokenizeInline(line));
  }

  return out.join('\n');
}
