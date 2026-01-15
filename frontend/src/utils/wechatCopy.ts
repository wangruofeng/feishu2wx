/**
 * 将HTML内容转换为微信公众号编辑器可接受的格式
 * 微信公众号编辑器使用的是富文本格式，需要特殊处理
 */
export function formatForWeChat(html: string): string {
  // 创建一个临时div来处理HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  // 处理图片：确保图片有合适的样式
  const images = tempDiv.querySelectorAll('img');
  images.forEach((img) => {
    img.style.maxWidth = '100%';
    img.style.height = 'auto';
    img.style.display = 'block';
    img.style.margin = '10px auto';
  });

  // 处理代码块：微信公众号不支持代码高亮，转换为纯文本
  const codeBlocks = tempDiv.querySelectorAll('pre code');
  codeBlocks.forEach((code) => {
    const pre = code.parentElement;
    if (pre) {
      pre.style.backgroundColor = '#f5f5f5';
      pre.style.padding = '10px';
      pre.style.borderRadius = '4px';
      pre.style.overflow = 'auto';
      pre.style.fontSize = '14px';
      pre.style.lineHeight = '1.5';
    }
  });

  // 处理段落间距
  const paragraphs = tempDiv.querySelectorAll('p');
  paragraphs.forEach((p) => {
    if (p.textContent?.trim()) {
      p.style.marginBottom = '10px';
      p.style.lineHeight = '1.8';
    }
  });

  // 处理标题
  const headings = tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6');
  headings.forEach((heading) => {
    heading.style.marginTop = '20px';
    heading.style.marginBottom = '10px';
    heading.style.fontWeight = 'bold';
  });

  // 处理列表
  const lists = tempDiv.querySelectorAll('ul, ol');
  lists.forEach((list) => {
    list.style.marginLeft = '20px';
    list.style.marginBottom = '10px';
  });

  return tempDiv.innerHTML;
}

/**
 * 复制内容到剪贴板
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    // 使用现代 Clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // 降级方案：使用传统方法
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      try {
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        return successful;
      } catch (err) {
        document.body.removeChild(textArea);
        return false;
      }
    }
  } catch (err) {
    console.error('复制失败:', err);
    return false;
  }
}

/**
 * 复制HTML内容到微信公众号编辑器
 */
export async function copyHtmlToWeChat(html: string): Promise<boolean> {
  const formattedHtml = formatForWeChat(html);
  
  // 创建一个包含HTML的div
  const container = document.createElement('div');
  container.innerHTML = formattedHtml;
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  document.body.appendChild(container);

  try {
    // 选择所有内容
    const range = document.createRange();
    range.selectNodeContents(container);
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
      
      // 尝试复制
      const successful = document.execCommand('copy');
      selection.removeAllRanges();
      
      document.body.removeChild(container);
      return successful;
    }
    
    document.body.removeChild(container);
    return false;
  } catch (err) {
    document.body.removeChild(container);
    return false;
  }
}
