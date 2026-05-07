import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

// 创建 Turndown 实例
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
  emDelimiter: '*',
  strongDelimiter: '**',
  linkStyle: 'inlined',
  linkReferenceStyle: 'full',
});

// 使用 GitHub Flavored Markdown 插件
turndownService.use(gfm);

// 自定义规则：处理飞书特有的代码块格式
turndownService.addRule('feishuCodeBlock', {
  filter: function (node): boolean {
    if (node.nodeName !== 'DIV' || !(node instanceof HTMLElement)) {
      return false;
    }
    return !!(
      node.classList &&
      (node.classList.contains('code-block') ||
        node.classList.contains('highlight') ||
        node.getAttribute('data-language'))
    );
  },
  replacement: function (content, node) {
    const language = (node as HTMLElement).getAttribute('data-language') || '';
    const code = content.trim();
    return `\n\`\`\`${language}\n${code}\n\`\`\`\n`;
  },
});

// 自定义规则：处理高亮文本（飞书中的高亮）
turndownService.addRule('feishuHighlight', {
  filter: function (node): boolean {
    if (node.nodeName !== 'SPAN' || !(node instanceof HTMLElement)) {
      return false;
    }
    return !!(
      node.classList &&
      (node.classList.contains('highlight') ||
        node.classList.contains('mark') ||
        (node.style && node.style.backgroundColor))
    );
  },
  replacement: function (content) {
    return `==${content}==`;
  },
});

// 自定义规则：处理分割线
turndownService.addRule('horizontalRule', {
  filter: 'hr',
  replacement: function () {
    return '\n---\n';
  },
});

/**
 * 将 HTML 转换为 Markdown
 * @param html HTML 字符串
 * @returns Markdown 字符串
 */
export function convertHtmlToMarkdown(html: string): string {
  if (!html || !html.trim()) {
    return '';
  }

  try {
    // 清理 HTML，移除一些不需要的标签和属性
    let cleanedHtml = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '');

    // 转换为 Markdown
    const markdown = turndownService.turndown(cleanedHtml);

    // 清理多余的空白行（保留最多两个连续换行）
    const cleanedMarkdown = markdown
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return cleanedMarkdown;
  } catch (error) {
    console.error('Error converting HTML to Markdown:', error);
    // 如果转换失败，尝试提取纯文本
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || '';
  }
}
