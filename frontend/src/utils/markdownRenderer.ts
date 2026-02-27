import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';

// 创建一个临时的 MarkdownIt 实例用于 escapeHtml
const tempMd = new MarkdownIt();

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
const md: MarkdownIt = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight: createHighlightFunction(),
});

// 创建现代风格的 MarkdownIt 实例
const mdModern: MarkdownIt = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight: createModernHighlightFunction(),
});

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

// 移除 Markdown 源码顶部的 Front Matter（YAML 块）
function removeFrontMatter(markdown: string): string {
  // 检查是否以 --- 开头（Front Matter 开始）
  if (!markdown.startsWith('---')) {
    return markdown;
  }

  // 找到第二个 --- 的位置（Front Matter 结束）
  const firstNewline = markdown.indexOf('\n');
  if (firstNewline === -1) return markdown;

  // 从第二行开始查找结束标记
  let contentAfterFirst = markdown.slice(firstNewline + 1);
  const endIndex = contentAfterFirst.indexOf('\n---');

  if (endIndex === -1) {
    // 没有找到结束标记，可能不是有效的 Front Matter
    return markdown;
  }

  // 返回 Front Matter 后面的内容
  return contentAfterFirst.slice(endIndex + 4).trim();
}

export function renderMarkdown(markdown: string): string {
  // 移除 Front Matter
  const markdownWithoutFrontMatter = removeFrontMatter(markdown);

  const selectedMd = currentCodeBlockStyle === 'modern' ? mdModern : md;
  let html = selectedMd.render(markdownWithoutFrontMatter);

  // 处理被误识别为链接的 .md 文件名
  // 将指向 .md 文件的链接转换回普通文本
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

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

  return tempDiv.innerHTML;
}
