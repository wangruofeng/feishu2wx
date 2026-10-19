// AI 聊天气泡的 Markdown 渲染：独立轻量 markdown-it 实例。
// 不复用 renderMarkdown()——那套依赖 DOM 后处理、frontmatter 卡片与 mermaid 占位，不适合聊天气泡。

import MarkdownIt from 'markdown-it';

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  breaks: true,
});

const defaultLinkOpen = md.renderer.rules.link_open
  ?? ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));

md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  tokens[idx].attrSet('target', '_blank');
  tokens[idx].attrSet('rel', 'noopener noreferrer');
  return defaultLinkOpen(tokens, idx, options, env, self);
};

// 工具栏与 pre 分离，长代码横向滚动时复制入口仍留在右上角。
(['fence', 'code_block'] as const).forEach((type) => {
  const renderCode = md.renderer.rules[type]!;
  md.renderer.rules[type] = (tokens, idx, options, env, self) => (
    `<div class="ai-code-block"><div class="ai-code-toolbar"></div>${renderCode(tokens, idx, options, env, self)}</div>`
  );
});

export function renderAiMarkdown(text: string): string {
  try {
    return md.render(text);
  } catch {
    return '';
  }
}
