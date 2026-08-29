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

export function renderAiMarkdown(text: string): string {
  try {
    return md.render(text);
  } catch {
    return '';
  }
}
