import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';
import footnote from 'markdown-it-footnote';
import DOMPurify from 'dompurify';

// 创建一个临时的 MarkdownIt 实例用于 escapeHtml
const tempMd = new MarkdownIt();

const SANITIZE_CONFIG = {
  ADD_ATTR: ['data-mermaid-source', 'referrerpolicy'],
  ALLOW_DATA_ATTR: true,
  FORBID_TAGS: ['base', 'embed', 'form', 'iframe', 'object', 'script', 'style'],
};

function sanitizeRenderedHtml(html: string): string {
  return DOMPurify.sanitize(html, SANITIZE_CONFIG);
}

// 代码块样式类型
export type CodeBlockStyle = 'classic' | 'modern';

// 当前代码块样式（全局变量，用于渲染时判断）
let currentCodeBlockStyle: CodeBlockStyle = 'classic';

// 设置代码块样式
export function setCodeBlockStyle(style: CodeBlockStyle) {
  currentCodeBlockStyle = style;
}

// 获取代码块样式
export function getCodeBlockStyle(): CodeBlockStyle {
  return currentCodeBlockStyle;
}

// 分割线渲染开关（全局变量）
let showHorizontalRule = true;

const CJK_STRONG_TRAILING_PUNCTUATION = new Set(['。', '！', '？', '；', '：', '，', '、', '…', '.', ',', '!', '?', ';', ':']);

function getLastChar(value: string): string {
  return Array.from(value).pop() || '';
}

function isWhitespace(value: string): boolean {
  return /\s/.test(value);
}

function markRule(state: any, silent: boolean): boolean {
  const start = state.pos;
  const source = state.src;

  if (source.charCodeAt(start) !== 0x3D || source.charCodeAt(start + 1) !== 0x3D) {
    return false;
  }

  const close = source.indexOf('==', start + 2);
  if (close === -1 || close === start + 2) {
    return false;
  }

  const content = source.slice(start + 2, close);
  if (/\r|\n/.test(content)) {
    return false;
  }

  if (!silent) {
    const openToken = state.push('mark_open', 'mark', 1);
    openToken.markup = '==';

    const textToken = state.push('text', '', 0);
    textToken.content = content;

    const closeToken = state.push('mark_close', 'mark', -1);
    closeToken.markup = '==';
  }

  state.pos = close + 2;
  return true;
}

function cjkPunctuationStrongRule(state: any, silent: boolean): boolean {
  const start = state.pos;
  const source = state.src;

  if (source.charCodeAt(start) !== 0x2A || source.charCodeAt(start + 1) !== 0x2A) {
    return false;
  }

  let searchFrom = start + 2;
  if (searchFrom >= state.posMax || source.charCodeAt(searchFrom) === 0x2A) {
    return false;
  }

  while (searchFrom < state.posMax) {
    const close = source.indexOf('**', searchFrom);
    if (close === -1) {
      return false;
    }

    const content = source.slice(start + 2, close);
    const nextChar = source.charAt(close + 2);

    if (content && CJK_STRONG_TRAILING_PUNCTUATION.has(getLastChar(content)) && nextChar && !isWhitespace(nextChar)) {
      if (!silent) {
        const openToken = state.push('strong_open', 'strong', 1);
        openToken.markup = '**';

        const textToken = state.push('text', '', 0);
        textToken.content = content;

        const closeToken = state.push('strong_close', 'strong', -1);
        closeToken.markup = '**';
      }

      state.pos = close + 2;
      return true;
    }

    searchFrom = close + 2;
  }

  return false;
}

function registerCjkPunctuationStrong(markdown: MarkdownIt): MarkdownIt {
  markdown.inline.ruler.before('emphasis', 'mark', markRule);
  markdown.inline.ruler.before('emphasis', 'cjk_punctuation_strong', cjkPunctuationStrongRule);
  return markdown;
}

// 设置分割线是否显示
export function setShowHorizontalRule(show: boolean) {
  showHorizontalRule = show;
}

// 获取分割线是否显示
export function getShowHorizontalRule(): boolean {
  return showHorizontalRule;
}

// 创建 highlight 函数（使用 highlight.js 进行语法高亮）
function createHighlightFunction() {
  return function (str: string, lang: string): string {
    if (lang && hljs.getLanguage(lang)) {
      try {
        const highlighted = hljs.highlight(str, { language: lang }).value;
        return `<pre><code class="hljs language-${lang}">${highlighted}</code></pre>`;
      } catch (err) {
        console.warn('Highlight.js error:', err);
      }
    }
    // 如果没有指定语言或语言不支持，尝试自动检测
    try {
      const highlighted = hljs.highlightAuto(str).value;
      return `<pre><code class="hljs">${highlighted}</code></pre>`;
    } catch (err) {
      // 如果自动检测也失败，返回转义后的文本
      const escaped = tempMd.utils.escapeHtml(str);
      return `<pre><code>${escaped}</code></pre>`;
    }
  };
}

// 创建 highlight 函数（现代风格 - 带3个圆点）- 使用 highlight.js 进行语法高亮
function createModernHighlightFunction() {
  return function (str: string, lang: string): string {
    let highlightedCode = '';
    if (lang && hljs.getLanguage(lang)) {
      try {
        highlightedCode = hljs.highlight(str, { language: lang }).value;
      } catch (err) {
        console.warn('Highlight.js error:', err);
        highlightedCode = tempMd.utils.escapeHtml(str);
      }
    } else {
      // 如果没有指定语言或语言不支持，尝试自动检测
      try {
        highlightedCode = hljs.highlightAuto(str).value;
      } catch (err) {
        // 如果自动检测也失败，返回转义后的文本
        highlightedCode = tempMd.utils.escapeHtml(str);
      }
    }
    const langClass = lang ? `language-${lang}` : '';
    return `<pre class="modern-code-block"><div class="code-block-header"><span class="code-block-dot red"></span><span class="code-block-dot orange"></span><span class="code-block-dot green"></span></div><div class="code-block-content"><code class="hljs ${langClass}">${highlightedCode}</code></div></pre>`;
  };
}

// 创建 MarkdownIt 实例
const md: MarkdownIt = registerCjkPunctuationStrong(new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight: createHighlightFunction(),
}).use(footnote));

// 创建现代风格的 MarkdownIt 实例
const mdModern: MarkdownIt = registerCjkPunctuationStrong(new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight: createModernHighlightFunction(),
}).use(footnote));

function renderMermaidFence(tokens: any, idx: number): string | null {
  const token = tokens[idx];
  const lang = token.info.trim().split(/\s+/)[0];
  if (lang !== 'mermaid') {
    return null;
  }

  const escaped = tempMd.utils.escapeHtml(token.content);
  const encodedSource = encodeURIComponent(token.content);
  return `<div class="mermaid" data-mermaid-source="${encodedSource}">${escaped}</div>\n`;
}

function registerMermaidFenceRenderer(markdown: MarkdownIt): void {
  const defaultFence = markdown.renderer.rules.fence || ((tokens: any, idx: number, options: any, env: any, self: any) => (
    self.renderToken(tokens, idx, options)
  ));

  markdown.renderer.rules.fence = (tokens: any, idx: number, options: any, env: any, self: any) => (
    renderMermaidFence(tokens, idx) || defaultFence(tokens, idx, options, env, self)
  );
}

registerMermaidFenceRenderer(md);
registerMermaidFenceRenderer(mdModern);

// 配置链接在新窗口打开（经典风格）
const defaultRender = md.renderer.rules.link_open || function(tokens: any, idx: number, options: any, env: any, self: any) {
  return self.renderToken(tokens, idx, options);
};

md.renderer.rules.link_open = function (tokens: any, idx: number, options: any, env: any, self: any) {
  const aIndex = tokens[idx].attrIndex('target');
  if (aIndex < 0) {
    tokens[idx].attrPush(['target', '_blank']);
  } else {
    tokens[idx].attrs![aIndex][1] = '_blank';
  }
  return defaultRender(tokens, idx, options, env, self);
};

// 自定义分割线渲染（经典风格）
md.renderer.rules.hr = function (tokens: any, idx: number, options: any, env: any, self: any) {
  if (!showHorizontalRule) {
    return ''; // 不渲染分割线
  }
  return '<hr class="custom-hr">';
};

// 配置链接在新窗口打开（现代风格）
const defaultRenderModern = mdModern.renderer.rules.link_open || function(tokens: any, idx: number, options: any, env: any, self: any) {
  return self.renderToken(tokens, idx, options);
};

mdModern.renderer.rules.link_open = function (tokens: any, idx: number, options: any, env: any, self: any) {
  const aIndex = tokens[idx].attrIndex('target');
  if (aIndex < 0) {
    tokens[idx].attrPush(['target', '_blank']);
  } else {
    tokens[idx].attrs![aIndex][1] = '_blank';
  }
  return defaultRenderModern(tokens, idx, options, env, self);
};

// 自定义分割线渲染（现代风格）
mdModern.renderer.rules.hr = function (tokens: any, idx: number, options: any, env: any, self: any) {
  if (!showHorizontalRule) {
    return ''; // 不渲染分割线
  }
  return '<hr class="custom-hr">';
};

// 处理列表项内的段落，移除额外间距
// 记录是否在列表中
let inList = false;

const defaultListOpen = md.renderer.rules.bullet_list_open || function(tokens: any, idx: number, options: any, env: any, self: any) {
  inList = true;
  return self.renderToken(tokens, idx, options);
};

const defaultListClose = md.renderer.rules.bullet_list_close || function(tokens: any, idx: number, options: any, env: any, self: any) {
  inList = false;
  return self.renderToken(tokens, idx, options);
};

const defaultOrderedListOpen = md.renderer.rules.ordered_list_open || function(tokens: any, idx: number, options: any, env: any, self: any) {
  inList = true;
  return self.renderToken(tokens, idx, options);
};

const defaultOrderedListClose = md.renderer.rules.ordered_list_close || function(tokens: any, idx: number, options: any, env: any, self: any) {
  inList = false;
  return self.renderToken(tokens, idx, options);
};

md.renderer.rules.bullet_list_open = defaultListOpen;
md.renderer.rules.bullet_list_close = defaultListClose;
md.renderer.rules.ordered_list_open = defaultOrderedListOpen;
md.renderer.rules.ordered_list_close = defaultOrderedListClose;

// 在列表中的段落移除外边距（经典风格）
md.renderer.rules.paragraph_open = function (tokens: any, idx: number, options: any, _env: any, self: any) {
  const result = self.renderToken(tokens, idx, options);
  // 如果在列表中，添加一个特殊类
  if (inList) {
    return result.replace('<p>', '<p class="in-list">');
  }
  return result;
};

// 在列表中的段落移除外边距（现代风格）
mdModern.renderer.rules.paragraph_open = function (tokens: any, idx: number, options: any, _env: any, self: any) {
  const result = self.renderToken(tokens, idx, options);
  // 如果在列表中，添加一个特殊类
  if (inList) {
    return result.replace('<p>', '<p class="in-list">');
  }
  return result;
};

// 现代风格的列表处理（复用 inList 变量）
const defaultListOpenModern = mdModern.renderer.rules.bullet_list_open || function(tokens: any, idx: number, options: any, _env: any, self: any) {
  inList = true;
  return self.renderToken(tokens, idx, options);
};

const defaultListCloseModern = mdModern.renderer.rules.bullet_list_close || function(tokens: any, idx: number, options: any, _env: any, self: any) {
  inList = false;
  return self.renderToken(tokens, idx, options);
};

const defaultOrderedListOpenModern = mdModern.renderer.rules.ordered_list_open || function(tokens: any, idx: number, options: any, _env: any, self: any) {
  inList = true;
  return self.renderToken(tokens, idx, options);
};

const defaultOrderedListCloseModern = mdModern.renderer.rules.ordered_list_close || function(tokens: any, idx: number, options: any, _env: any, self: any) {
  inList = false;
  return self.renderToken(tokens, idx, options);
};

mdModern.renderer.rules.bullet_list_open = defaultListOpenModern;
mdModern.renderer.rules.bullet_list_close = defaultListCloseModern;
mdModern.renderer.rules.ordered_list_open = defaultOrderedListOpenModern;
mdModern.renderer.rules.ordered_list_close = defaultOrderedListCloseModern;

// 自定义图片渲染：如果有 alt 文本则显示在图片下方
function renderImage(tokens: any, idx: number): string {
  const token = tokens[idx];
  const src = token.attrGet('src') || '';
  const alt = token.content || '';
  const escapedSrc = tempMd.utils.escapeHtml(src);
  const escapedAlt = tempMd.utils.escapeHtml(alt);

  if (alt) {
    return `<figure class="img-figure"><img src="${escapedSrc}" alt="${escapedAlt}"><figcaption class="img-caption">${escapedAlt}</figcaption></figure>`;
  }
  return `<img src="${escapedSrc}" alt="">`;
}

md.renderer.rules.image = renderImage;
mdModern.renderer.rules.image = renderImage;

export interface FrontMatterField {
  key: string;
  value: string | string[];
}

export interface FrontMatterResult {
  content: string;
  fields: FrontMatterField[];
}

/** 从 Markdown 源码中读取 frontmatter 的指定字段（字符串值），不存在时返回空字符串 */
export function getFrontMatterField(markdown: string, key: string): string {
  const { fields } = parseFrontMatter(markdown);
  const field = fields.find((f) => f.key.toLowerCase() === key.toLowerCase());
  if (!field) return '';
  return Array.isArray(field.value) ? field.value.join(', ') : field.value;
}

interface RenderMarkdownOptions {
  showFrontMatter?: boolean;
}

function cleanYamlValue(value: string): string {
  const trimmed = value.trim();
  const quoted = trimmed.match(/^(['"])(.*)\1$/);
  return quoted ? quoted[2] : trimmed;
}

function parseInlineArray(value: string): string[] | null {
  const trimmed = value.trim();
  if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) {
    return null;
  }

  const body = trimmed.slice(1, -1).trim();
  if (!body) {
    return [];
  }

  return body.split(',').map(cleanYamlValue).filter(Boolean);
}

function parseFrontMatterFields(source: string): FrontMatterField[] {
  const lines = source.split(/\r?\n/);
  const fields: FrontMatterField[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const match = line.match(/^([A-Za-z0-9_-]+):(?:\s*(.*))?$/);
    if (!match) {
      continue;
    }

    const key = match[1];
    const rawValue = match[2] || '';
    const inlineArray = parseInlineArray(rawValue);
    if (inlineArray) {
      fields.push({ key, value: inlineArray });
      continue;
    }

    if (rawValue === '|' || rawValue === '>') {
      const blockLines: string[] = [];
      let j = i + 1;
      while (j < lines.length && (/^\s+/.test(lines[j]) || !lines[j].trim())) {
        blockLines.push(lines[j].replace(/^\s{2,}/, ''));
        j += 1;
      }
      fields.push({
        key,
        value: rawValue === '>' ? blockLines.join(' ').trim() : blockLines.join('\n').trim(),
      });
      i = j - 1;
      continue;
    }

    if (rawValue === '') {
      const listValues: string[] = [];
      let j = i + 1;
      while (j < lines.length) {
        const itemMatch = lines[j].match(/^\s*-\s+(.+)$/);
        if (!itemMatch) {
          break;
        }
        listValues.push(cleanYamlValue(itemMatch[1]));
        j += 1;
      }

      fields.push({ key, value: listValues.length > 0 ? listValues : '' });
      i = j - 1;
      continue;
    }

    fields.push({ key, value: cleanYamlValue(rawValue) });
  }

  return fields;
}

// 解析 Markdown 源码顶部的 Front Matter（YAML 块）
export function parseFrontMatter(markdown: string): FrontMatterResult {
  const lines = markdown.split(/\r?\n/);
  if (lines[0]?.trim() !== '---') {
    return { content: markdown, fields: [] };
  }

  const endLineIndex = lines.findIndex((line, index) => index > 0 && line.trim() === '---');
  if (endLineIndex === -1) {
    return { content: markdown, fields: [] };
  }

  const frontMatterSource = lines.slice(1, endLineIndex).join('\n');
  const content = lines.slice(endLineIndex + 1).join('\n').trim();

  return {
    content,
    fields: parseFrontMatterFields(frontMatterSource),
  };
}

/**
 * 从 Markdown 顶部 front matter 中提取标题字段（title / Title）。
 * 提取失败时返回 null。复用 renderMarkdown 的 front matter 解析逻辑。
 */
export function extractFrontMatterTitle(markdown: string): string | null {
  const { fields } = parseFrontMatter(markdown);
  const titleField = fields.find((field) => field.key === 'title' || field.key === 'Title');
  if (!titleField) {
    return null;
  }
  return Array.isArray(titleField.value) ? titleField.value.join(' ').trim() : titleField.value.trim();
}

function renderFrontMatterPreview(fields: FrontMatterField[]): string {
  if (fields.length === 0) {
    return '';
  }

  const rows = fields.map((field) => {
    const key = tempMd.utils.escapeHtml(field.key);
    const value = Array.isArray(field.value)
      ? field.key === 'ai_summary'
        ? `<ul class="frontmatter-summary-list">${field.value.map((item) => `<li>${tempMd.utils.escapeHtml(item)}</li>`).join('')}</ul>`
        : `<div class="frontmatter-tags">${field.value.map((item) => `<span>${tempMd.utils.escapeHtml(item)}</span>`).join('')}</div>`
      : tempMd.utils.escapeHtml(field.value);

    return `<div class="frontmatter-row"><dt>${key}</dt><dd>${value}</dd></div>`;
  }).join('');

  return `<section class="frontmatter-preview" data-preview-only="true" aria-label="元数据"><h2>元数据</h2><dl>${rows}</dl></section>`;
}

export function renderMarkdown(markdown: string, options: RenderMarkdownOptions = {}): string {
  const { content, fields } = parseFrontMatter(markdown);

  const selectedMd = currentCodeBlockStyle === 'modern' ? mdModern : md;
  let html = selectedMd.render(content);

  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  // 处理被误识别为链接的 .md 文件名
  // 将指向 .md 文件的链接转换回普通文本
  // 查找所有链接
  const links = tempDiv.querySelectorAll('a');
  links.forEach((link) => {
    const href = link.getAttribute('href') || '';
    const text = link.textContent || '';

    // 如果链接指向 .md 文件，且链接文本就是文件名，则转换为普通文本
    if (href.toLowerCase().endsWith('.md') && text.toLowerCase().endsWith('.md')) {
      // 将链接替换为普通文本节点
      const textNode = document.createTextNode(text);
      link.parentNode?.replaceChild(textNode, link);
    }
  });

  const images = tempDiv.querySelectorAll('img');
  images.forEach((img) => {
    img.setAttribute('referrerpolicy', 'no-referrer');
  });

  // 处理 task list: 将 li 中的 [x] / [ ] 替换为 checkbox
  const listItems = tempDiv.querySelectorAll('li');
  listItems.forEach((li) => {
    const firstChild = li.firstChild;
    if (firstChild?.nodeType === Node.TEXT_NODE) {
      const text = firstChild.textContent || '';
      const checkedMatch = text.match(/^\[x\]\s?/i);
      const uncheckedMatch = text.match(/^\[\s?\]\s?/);
      const match = checkedMatch || uncheckedMatch;
      if (match) {
        const isChecked = !!checkedMatch;
        const checkbox = document.createElement('span');
        checkbox.className = isChecked ? 'task-checkbox checked' : 'task-checkbox';
        checkbox.textContent = isChecked ? '☑' : '☐';
        firstChild.textContent = text.slice(match[0].length);
        li.insertBefore(checkbox, firstChild);
        li.classList.add('task-list-item');
      }
    }
    // 处理 <li><p>[x] ...</p> 的情况
    const p = li.querySelector(':scope > p');
    if (p && !li.querySelector('.task-checkbox')) {
      const pFirst = p.firstChild;
      if (pFirst?.nodeType === Node.TEXT_NODE) {
        const text = pFirst.textContent || '';
        const checkedMatch = text.match(/^\[x\]\s?/i);
        const uncheckedMatch = text.match(/^\[\s?\]\s?/);
        const match = checkedMatch || uncheckedMatch;
        if (match) {
          const isChecked = !!checkedMatch;
          const checkbox = document.createElement('span');
          checkbox.className = isChecked ? 'task-checkbox checked' : 'task-checkbox';
          checkbox.textContent = isChecked ? '☑' : '☐';
          pFirst.textContent = text.slice(match[0].length);
          p.insertBefore(checkbox, pFirst);
          li.classList.add('task-list-item');
        }
      }
    }
  });

  const h1Elements = tempDiv.querySelectorAll('h1');
  h1Elements.forEach((h1) => {
    if (h1.querySelector(':scope > .h1-inline-block')) {
      return;
    }

    const wrapper = document.createElement('span');
    wrapper.className = 'h1-inline-block';

    while (h1.firstChild) {
      wrapper.appendChild(h1.firstChild);
    }

    h1.appendChild(wrapper);
  });

  const h2Elements = tempDiv.querySelectorAll('h2');
  h2Elements.forEach((h2) => {
    if (h2.querySelector(':scope > .h2-inline-block')) {
      return;
    }

    const wrapper = document.createElement('span');
    wrapper.className = 'h2-inline-block';

    while (h2.firstChild) {
      wrapper.appendChild(h2.firstChild);
    }

    h2.appendChild(wrapper);
  });

  return sanitizeRenderedHtml(`${options.showFrontMatter ? renderFrontMatterPreview(fields) : ''}${tempDiv.innerHTML}`);
}

/**
 * 异步渲染 mermaid 占位块为 SVG。
 * renderMarkdown() 同步产出含 <div class="mermaid" data-mermaid-source> 的占位 HTML，
 * 本函数在离屏 DOM 中用 mermaid.render() 把占位替换为内联 <svg>。
 * 复制/导出管线随后通过 convertSvgImagesToPng() 自动把 <svg> 栅格化为 PNG。
 */
export async function renderMermaidBlocks(html: string): Promise<string> {
  const container = document.createElement('div');
  container.innerHTML = html;
  const mermaidDivs = Array.from(container.querySelectorAll<HTMLElement>('div.mermaid[data-mermaid-source]'));
  if (mermaidDivs.length === 0) return html;

  const { default: mermaid } = await import('mermaid');
  mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'strict' });

  for (const div of mermaidDivs) {
    const encodedSource = div.getAttribute('data-mermaid-source') || '';
    let source = encodedSource;
    try {
      source = decodeURIComponent(encodedSource);
    } catch {
      // Keep the encoded value if a malformed placeholder is encountered.
    }
    try {
      const id = `mermaid-${Math.random().toString(36).slice(2, 10)}`;
      const { svg } = await mermaid.render(id, source);
      div.outerHTML = svg;
    } catch (err) {
      console.warn('Mermaid 渲染失败，保留源码:', err);
    }
  }
  return sanitizeRenderedHtml(container.innerHTML);
}
