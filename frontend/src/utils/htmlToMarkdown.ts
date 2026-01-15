import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

export function convertHtmlToMarkdown(html: string): string {
  const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
    emDelimiter: '*',
    strongDelimiter: '**',
  });

  // 使用 GitHub Flavored Markdown 插件
  turndownService.use(gfm);

  // 自定义规则：处理代码块
  turndownService.addRule('codeBlock', {
    filter: function (node) {
      return (
        node.nodeName === 'PRE' &&
        node.firstChild &&
        node.firstChild.nodeName === 'CODE'
      );
    },
    replacement: function (content, node) {
      const codeNode = node.firstChild as HTMLElement;
      const className = codeNode.getAttribute('class') || '';
      const langMatch = className.match(/language-(\w+)/);
      const lang = langMatch ? langMatch[1] : '';
      const code = codeNode.textContent || '';
      return '\n\n```' + lang + '\n' + code + '\n```\n\n';
    }
  });

  // 自定义规则：处理图片
  turndownService.addRule('image', {
    filter: 'img',
    replacement: function (content, node) {
      const img = node as HTMLImageElement;
      const alt = img.getAttribute('alt') || '';
      const src = img.getAttribute('src') || '';
      const title = img.getAttribute('title') || '';
      return title ? `![${alt}](${src} "${title}")` : `![${alt}](${src})`;
    }
  });

  // 处理飞书特有的格式
  turndownService.addRule('feishuHighlight', {
    filter: function (node) {
      return (
        node.nodeName === 'SPAN' &&
        (node as HTMLElement).style.backgroundColor !== ''
      );
    },
    replacement: function (content) {
      return `==${content}==`;
    }
  });

  try {
    return turndownService.turndown(html);
  } catch (error) {
    console.error('HTML转Markdown失败:', error);
    return '';
  }
}
