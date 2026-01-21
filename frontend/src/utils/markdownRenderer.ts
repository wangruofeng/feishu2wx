import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css';

// 创建一个临时的 MarkdownIt 实例用于 escapeHtml
const tempMd = new MarkdownIt();

// 创建 highlight 函数（避免循环引用）
function createHighlightFunction() {
  return function (str: string, lang: string): string {
    if (lang && hljs.getLanguage(lang)) {
      try {
        const highlighted = hljs.highlight(str, { language: lang }).value;
        return `<pre class="hljs"><code>${highlighted}</code></pre>`;
      } catch (__) {
        // 如果高亮失败，使用转义后的文本
      }
    }
    // 使用临时实例的 escapeHtml 方法
    const escaped = tempMd.utils.escapeHtml(str);
    return `<pre><code>${escaped}</code></pre>`;
  };
}

// 创建 MarkdownIt 实例
const md: MarkdownIt = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight: createHighlightFunction(),
});

// 配置链接在新窗口打开
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

// 自定义分割线渲染
md.renderer.rules.hr = function (tokens: any, idx: number, options: any, env: any, self: any) {
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

// 在列表中的段落移除外边距
md.renderer.rules.paragraph_open = function (tokens: any, idx: number, options: any, env: any, self: any) {
  const result = self.renderToken(tokens, idx, options);
  // 如果在列表中，添加一个特殊类
  if (inList) {
    return result.replace('<p>', '<p class="in-list">');
  }
  return result;
};

export function renderMarkdown(markdown: string): string {
  return md.render(markdown);
}
