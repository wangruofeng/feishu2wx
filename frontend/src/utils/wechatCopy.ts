/**
 * 获取主题相关的样式配置
 */
function getThemeStyles(theme: string) {
  const themes: Record<string, {
    primaryColor: string;
    primaryColorDark: string;
    headingColor: string;
    headingColorH2: string;
    headingColorH3H6: string;
    linkColor: string;
    blockquoteBorderColor: string;
    blockquoteBgColor: string;
    tableHeaderBgColor: string;
    tableHeaderColor: string;
  }> = {
    green: {
      primaryColor: '#52c41a',
      primaryColorDark: '#237804',
      headingColor: '#237804',
      headingColorH2: '#237804',
      headingColorH3H6: '#389e0d',
      linkColor: '#52c41a',
      blockquoteBorderColor: '#52c41a',
      blockquoteBgColor: '#f6ffed',
      tableHeaderBgColor: '#f6ffed',
      tableHeaderColor: '#237804',
    },
    light: {
      primaryColor: '#1890ff',
      primaryColorDark: '#0050b3',
      headingColor: '#0050b3',
      headingColorH2: '#0050b3',
      headingColorH3H6: '#096dd9',
      linkColor: '#1890ff',
      blockquoteBorderColor: '#1890ff',
      blockquoteBgColor: '#e6f7ff',
      tableHeaderBgColor: '#e6f7ff',
      tableHeaderColor: '#0050b3',
    },
    dark: {
      primaryColor: '#52c41a',
      primaryColorDark: '#52c41a',
      headingColor: '#52c41a',
      headingColorH2: '#52c41a',
      headingColorH3H6: '#73d13d',
      linkColor: '#52c41a',
      blockquoteBorderColor: '#52c41a',
      blockquoteBgColor: '#1f3a0f',
      tableHeaderBgColor: '#1f3a0f',
      tableHeaderColor: '#52c41a',
    },
    classic: {
      primaryColor: '#333',
      primaryColorDark: '#000',
      headingColor: '#000',
      headingColorH2: '#000',
      headingColorH3H6: '#333',
      linkColor: '#1890ff',
      blockquoteBorderColor: '#333',
      blockquoteBgColor: '#f5f5f5',
      tableHeaderBgColor: '#f5f5f5',
      tableHeaderColor: '#000',
    },
    purple: {
      primaryColor: '#722ed1',
      primaryColorDark: '#391085',
      headingColor: '#391085',
      headingColorH2: '#391085',
      headingColorH3H6: '#531dab',
      linkColor: '#722ed1',
      blockquoteBorderColor: '#722ed1',
      blockquoteBgColor: '#f9f0ff',
      tableHeaderBgColor: '#f9f0ff',
      tableHeaderColor: '#391085',
    },
    orange: {
      primaryColor: '#fa8c16',
      primaryColorDark: '#ad4e00',
      headingColor: '#ad4e00',
      headingColorH2: '#ad4e00',
      headingColorH3H6: '#d46b08',
      linkColor: '#fa8c16',
      blockquoteBorderColor: '#fa8c16',
      blockquoteBgColor: '#fff7e6',
      tableHeaderBgColor: '#fff7e6',
      tableHeaderColor: '#ad4e00',
    },
    pink: {
      primaryColor: '#eb2f96',
      primaryColorDark: '#9e1068',
      headingColor: '#9e1068',
      headingColorH2: '#9e1068',
      headingColorH3H6: '#c41d7f',
      linkColor: '#eb2f96',
      blockquoteBorderColor: '#eb2f96',
      blockquoteBgColor: '#fff0f6',
      tableHeaderBgColor: '#fff0f6',
      tableHeaderColor: '#9e1068',
    },
    blue: {
      primaryColor: '#13c2c2',
      primaryColorDark: '#006d75',
      headingColor: '#006d75',
      headingColorH2: '#006d75',
      headingColorH3H6: '#08979c',
      linkColor: '#13c2c2',
      blockquoteBorderColor: '#13c2c2',
      blockquoteBgColor: '#e6fffb',
      tableHeaderBgColor: '#e6fffb',
      tableHeaderColor: '#006d75',
    },
    red: {
      primaryColor: '#ff4d4f',
      primaryColorDark: '#a8071a',
      headingColor: '#a8071a',
      headingColorH2: '#a8071a',
      headingColorH3H6: '#cf1322',
      linkColor: '#ff4d4f',
      blockquoteBorderColor: '#ff4d4f',
      blockquoteBgColor: '#fff1f0',
      tableHeaderBgColor: '#fff1f0',
      tableHeaderColor: '#a8071a',
    },
    cyan: {
      primaryColor: '#13c2c2',
      primaryColorDark: '#002329',
      headingColor: '#002329',
      headingColorH2: '#002329',
      headingColorH3H6: '#00474f',
      linkColor: '#13c2c2',
      blockquoteBorderColor: '#13c2c2',
      blockquoteBgColor: '#e6fffb',
      tableHeaderBgColor: '#e6fffb',
      tableHeaderColor: '#002329',
    },
  };

  return themes[theme] || themes.green;
}

/**
 * 获取字体配置
 */
function getFontFamily(fontKey: string): string {
  const fonts: Record<string, string> = {
    'default': '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif',
    'microsoft-yahei': '"Microsoft YaHei", "微软雅黑", Arial, sans-serif',
    'simsun': 'SimSun, "宋体", serif',
    'simhei': 'SimHei, "黑体", sans-serif',
    'arial': 'Arial, sans-serif',
    'helvetica': 'Helvetica, Arial, sans-serif',
    'times': '"Times New Roman", Times, serif',
    'georgia': 'Georgia, serif',
    'verdana': 'Verdana, sans-serif',
    'courier': '"Courier New", Courier, monospace',
    'roboto': '"Roboto", -apple-system, BlinkMacSystemFont, sans-serif',
    'open-sans': '"Open Sans", -apple-system, BlinkMacSystemFont, sans-serif',
    'lato': '"Lato", -apple-system, BlinkMacSystemFont, sans-serif',
    'montserrat': '"Montserrat", -apple-system, BlinkMacSystemFont, sans-serif',
    'raleway': '"Raleway", -apple-system, BlinkMacSystemFont, sans-serif',
    'poppins': '"Poppins", -apple-system, BlinkMacSystemFont, sans-serif',
  };
  return fonts[fontKey] || fonts['default'];
}

/**
 * 将HTML内容转换为微信公众号编辑器可接受的格式
 * 微信公众号编辑器使用的是富文本格式，需要特殊处理
 * 所有样式都必须以内联样式的方式添加，确保完整复制
 *
 * 方案：直接使用主题配置应用样式，确保颜色值准确且为十六进制格式
 */
export function formatForWeChat(html: string, theme: string = 'green', font: string = 'default', showH1: boolean = true, imageBorderStyle: 'border' | 'shadow' = 'border'): string {
  const themeStyles = getThemeStyles(theme);
  const fontFamily = getFontFamily(font);

  // 创建临时容器处理HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  // 直接应用主题样式（使用可靠的主题配置，而不是不稳定的计算样式）
  applyThemeStyles(tempDiv, themeStyles, fontFamily, showH1, imageBorderStyle);

  return tempDiv.innerHTML;
}

/**
 * 应用主题特定的样式
 * 直接使用主题配置应用所有样式，确保颜色值准确
 */
function applyThemeStyles(
  container: HTMLElement,
  themeStyles: ReturnType<typeof getThemeStyles>,
  fontFamily: string,
  showH1: boolean,
  imageBorderStyle: 'border' | 'shadow'
): void {
  // 首先设置容器的字体，作为默认字体
  container.style.fontFamily = fontFamily;

  // 处理图片：确保图片有完整的样式和URL
  const images = container.querySelectorAll('img');
  images.forEach((img) => {
    const imgEl = img as HTMLImageElement;
    // 设置完整的图片样式
    imgEl.style.maxWidth = '100%';
    imgEl.style.width = 'auto';
    imgEl.style.height = 'auto';
    imgEl.style.display = 'block';
    imgEl.style.margin = '16px auto';
    imgEl.style.borderRadius = '4px';

    // 根据图片边框模式设置样式
    if (imageBorderStyle === 'border') {
      imgEl.style.border = '0.5px solid #e0e0e0';
      imgEl.style.boxShadow = 'none';
    } else {
      // 阴影模式：原始阴影效果
      imgEl.style.border = 'none';
      imgEl.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.05)';
    }

    // 确保图片有完整的URL
    if (imgEl.src && !imgEl.src.startsWith('http') && !imgEl.src.startsWith('data:')) {
      if (imgEl.src.startsWith('/')) {
        imgEl.src = window.location.origin + imgEl.src;
      }
    }
  });

  // 处理行内代码
  const inlineCodes = container.querySelectorAll('code:not(pre code)');
  inlineCodes.forEach((code) => {
    const codeEl = code as HTMLElement;
    codeEl.style.backgroundColor = '#f5f5f5';
    codeEl.style.padding = '2px 6px';
    codeEl.style.borderRadius = '3px';
    codeEl.style.fontSize = '0.9em';
    codeEl.style.fontFamily = 'Consolas, Monaco, "Courier New", monospace';
    codeEl.style.color = '#333';
    codeEl.style.fontWeight = 'bold';
  });

  // 处理代码块：微信公众号不支持代码高亮，转换为纯文本样式
  const codeBlocks = container.querySelectorAll('pre');
  codeBlocks.forEach((pre) => {
    const preEl = pre as HTMLElement;
    preEl.style.backgroundColor = '#f5f5f5';
    preEl.style.padding = '16px';
    preEl.style.borderRadius = '6px';
    preEl.style.overflowX = 'auto';
    preEl.style.marginBottom = '16px';
    preEl.style.fontSize = '14px';
    preEl.style.lineHeight = '1.5';
    preEl.style.fontFamily = 'Consolas, Monaco, "Courier New", monospace';
    preEl.style.color = '#333';
    
    // 处理代码块内的code标签
    const codeInPre = preEl.querySelectorAll('code');
    codeInPre.forEach((code) => {
      const codeEl = code as HTMLElement;
      codeEl.style.backgroundColor = 'transparent';
      codeEl.style.padding = '0';
      codeEl.style.borderRadius = '0';
      codeEl.style.fontSize = 'inherit';
      codeEl.style.fontFamily = 'inherit';
      codeEl.style.color = 'inherit';
    });
  });

  // 处理段落间距
  const paragraphs = container.querySelectorAll('p');
  paragraphs.forEach((p) => {
    const pEl = p as HTMLElement;
    if (pEl.textContent?.trim()) {
      pEl.style.fontSize = '16px';
      pEl.style.marginBottom = '16px';
      pEl.style.marginTop = '0';
      pEl.style.lineHeight = '1.8';
      pEl.style.color = '#333';
      pEl.style.fontFamily = fontFamily;
    }
  });

  // 处理标题 - 完整样式（使用主题颜色，使用px单位确保兼容性）
  const h1Elements = container.querySelectorAll('h1');
  h1Elements.forEach((h1, index) => {
    const h1El = h1 as HTMLElement;
    // 使用px单位，微信公众号编辑器对em单位支持可能不好
    h1El.style.fontSize = '24px';
    // 第一个 h1 保持较小的 margin-top，其他 h1 使用较大的 margin-top
    h1El.style.marginTop = index === 0 ? '24px' : '40px';
    h1El.style.marginBottom = '16px';
    h1El.style.marginLeft = '0';
    h1El.style.marginRight = '0';
    h1El.style.fontWeight = 'bold';
    h1El.style.lineHeight = '1.25';
    // 根据 showH1 决定是否显示底部横线
    h1El.style.borderBottom = showH1 ? `1px solid ${themeStyles.headingColor}` : 'none';
    h1El.style.borderTop = 'none';
    h1El.style.borderLeft = 'none';
    h1El.style.borderRight = 'none';
    h1El.style.paddingBottom = '8px';
    h1El.style.paddingTop = '0';
    h1El.style.paddingLeft = '0';
    h1El.style.paddingRight = '0';
    h1El.style.color = themeStyles.headingColor;
    h1El.style.display = 'block';
    h1El.style.textAlign = 'center';
    h1El.style.fontFamily = fontFamily;
  });

  const h2Elements = container.querySelectorAll('h2');
  h2Elements.forEach((h2) => {
    const h2El = h2 as HTMLElement;
    h2El.style.fontSize = '18px';
    h2El.style.marginTop = '40px';
    h2El.style.marginBottom = '16px';
    h2El.style.marginLeft = '0';
    h2El.style.marginRight = '0';
    h2El.style.fontWeight = 'bold';
    h2El.style.lineHeight = '1.25';
    h2El.style.borderBottom = 'none';
    h2El.style.borderTop = 'none';
    h2El.style.borderLeft = 'none';
    h2El.style.borderRight = 'none';
    h2El.style.paddingBottom = '0';
    h2El.style.paddingTop = '0';
    h2El.style.paddingLeft = '0';
    h2El.style.paddingRight = '0';
    h2El.style.color = themeStyles.headingColorH2;
    h2El.style.display = 'block';
    h2El.style.fontFamily = fontFamily;
  });

  const h3Elements = container.querySelectorAll('h3');
  h3Elements.forEach((h3) => {
    const h3El = h3 as HTMLElement;
    h3El.style.fontSize = '20px';
    h3El.style.marginTop = '24px';
    h3El.style.marginBottom = '16px';
    h3El.style.marginLeft = '0';
    h3El.style.marginRight = '0';
    h3El.style.fontWeight = 'bold';
    h3El.style.lineHeight = '1.25';
    h3El.style.color = themeStyles.headingColorH3H6;
    h3El.style.display = 'block';
    h3El.style.fontFamily = fontFamily;
  });

  const h4Elements = container.querySelectorAll('h4, h5, h6');
  h4Elements.forEach((h) => {
    const hEl = h as HTMLElement;
    hEl.style.marginTop = '24px';
    hEl.style.marginBottom = '16px';
    hEl.style.fontWeight = '600';
    hEl.style.lineHeight = '1.25';
    hEl.style.color = themeStyles.headingColorH3H6;
    hEl.style.fontFamily = fontFamily;
  });

  // 处理列表
  const lists = container.querySelectorAll('ul, ol');
  lists.forEach((list) => {
    const listEl = list as HTMLElement;
    listEl.style.marginBottom = '16px';
    listEl.style.marginTop = '0';
    listEl.style.paddingLeft = '30px';
    listEl.style.color = '#333';
    listEl.style.fontFamily = fontFamily;
    listEl.style.textAlign = 'left';
  });

  // 处理列表项
  const listItems = container.querySelectorAll('li');
  listItems.forEach((li) => {
    const liEl = li as HTMLElement;
    liEl.style.marginBottom = '4px';
    liEl.style.lineHeight = '1.8';
    liEl.style.color = '#333';
    liEl.style.fontFamily = fontFamily;
  });

  // 处理列表内的段落，移除额外间距
  const listParagraphs = container.querySelectorAll('li p');
  listParagraphs.forEach((p: Element) => {
    const pEl = p as HTMLElement;
    pEl.style.marginBottom = '0';
    pEl.style.marginTop = '0';
  });

  // 处理引用（使用主题颜色）
  const blockquotes = container.querySelectorAll('blockquote');
  blockquotes.forEach((blockquote) => {
    const bqEl = blockquote as HTMLElement;
    bqEl.style.margin = '16px 0';
    bqEl.style.padding = '12px 16px';
    bqEl.style.borderLeft = `4px solid ${themeStyles.blockquoteBorderColor}`;
    bqEl.style.backgroundColor = themeStyles.blockquoteBgColor;
    bqEl.style.color = '#333';
    bqEl.style.borderRadius = '0 4px 4px 0';
    bqEl.style.fontFamily = fontFamily;
    
    // 处理 blockquote 内部元素的 margin，确保上下 padding 一致
    const firstChild = bqEl.firstElementChild as HTMLElement;
    const lastChild = bqEl.lastElementChild as HTMLElement;
    if (firstChild) {
      firstChild.style.marginTop = '0';
    }
    if (lastChild) {
      lastChild.style.marginBottom = '0';
    }
  });

  // 处理链接（使用主题颜色）
  const links = container.querySelectorAll('a');
  links.forEach((link) => {
    const linkEl = link as HTMLAnchorElement;
    linkEl.style.color = themeStyles.linkColor;
    linkEl.style.textDecoration = 'none';
    linkEl.style.borderBottom = '1px solid transparent';
    linkEl.style.fontFamily = fontFamily;
    // 确保链接在新窗口打开
    if (!linkEl.target) {
      linkEl.target = '_blank';
    }
  });

  // 处理表格
  const tables = container.querySelectorAll('table');
  tables.forEach((table) => {
    const tableEl = table as HTMLElement;
    tableEl.style.width = '100%';
    tableEl.style.borderCollapse = 'collapse';
    tableEl.style.marginBottom = '16px';
    tableEl.style.marginTop = '0';
  });

  // 处理表格单元格
  const tableCells = container.querySelectorAll('td, th');
  tableCells.forEach((cell: Element) => {
    const cellEl = cell as HTMLElement;
    cellEl.style.padding = '8px 12px';
    cellEl.style.border = '1px solid #f0f0f0';
    cellEl.style.color = '#333';
    cellEl.style.fontFamily = fontFamily;
  });

  // 处理表头（使用主题颜色）
  const tableHeaders = container.querySelectorAll('th');
  tableHeaders.forEach((th: Element) => {
    const thEl = th as HTMLElement;
    thEl.style.backgroundColor = themeStyles.tableHeaderBgColor;
    thEl.style.fontWeight = '600';
    thEl.style.color = themeStyles.tableHeaderColor;
    thEl.style.fontFamily = fontFamily;
  });

  // 处理分隔线（从两边往中间变粗，使用平滑渐变）
  // 注意：微信公众号编辑器不支持复杂的 HTML 结构（如绝对定位的 div），
  // 使用简单的渐变背景和 border 来实现效果
  const horizontalRules = container.querySelectorAll('hr');
  horizontalRules.forEach((hr) => {
    const hrEl = hr as HTMLElement;
    const hrColor = themeStyles.primaryColor;
    
    // 清除默认样式
    hrEl.style.border = 'none';
    hrEl.style.margin = '24px 0';
    hrEl.style.height = '1px';
    hrEl.style.padding = '0';
    hrEl.style.width = '100%';
    hrEl.style.display = 'block';
    hrEl.style.boxSizing = 'border-box';
    
    // 使用渐变背景实现从两边往中间变粗的效果
    // 微信公众号编辑器支持 linear-gradient，使用渐变透明度来模拟从细到粗
    // 通过渐变点控制从两边淡入到中间的效果
    hrEl.style.background = `linear-gradient(to right, transparent 0%, ${hrColor} 4%, ${hrColor} 10%, ${hrColor} 18%, ${hrColor} 28%, ${hrColor} 38%, ${hrColor} 40%, ${hrColor} 50%, ${hrColor} 60%, ${hrColor} 62%, ${hrColor} 72%, ${hrColor} 82%, ${hrColor} 90%, ${hrColor} 96%, transparent 100%)`;
    hrEl.style.backgroundSize = '100% 1px';
    hrEl.style.backgroundRepeat = 'no-repeat';
    hrEl.style.backgroundPosition = 'center';
    // 确保分割线可见
    hrEl.style.opacity = '1';
  });

  // 处理加粗文本
  const strongElements = container.querySelectorAll('strong, b');
  strongElements.forEach((strong) => {
    const strongEl = strong as HTMLElement;
    strongEl.style.fontWeight = 'bold';
    strongEl.style.fontStyle = 'normal';
    strongEl.style.fontFamily = fontFamily;
  });

  // 处理斜体文本
  const emElements = container.querySelectorAll('em, i');
  emElements.forEach((em) => {
    const emEl = em as HTMLElement;
    emEl.style.fontStyle = 'italic';
    emEl.style.fontWeight = 'normal';
    emEl.style.fontFamily = fontFamily;
  });
}

/**
 * 复制HTML内容到微信公众号编辑器
 * 使用 Clipboard API 的 write 方法来复制富文本格式
 */
export async function copyHtmlToWeChat(html: string, theme: string = 'green', font: string = 'default', showH1: boolean = true, imageBorderStyle: 'border' | 'shadow' = 'border'): Promise<{ success: boolean; message: string }> {
  if (!html || !html.trim()) {
    return { success: false, message: '没有内容可复制' };
  }

  const formattedHtml = formatForWeChat(html, theme, font, showH1, imageBorderStyle);
  
  try {
    // 方法1: 使用 Clipboard API 的 write 方法（推荐，支持富文本）
    if (navigator.clipboard && navigator.clipboard.write && window.isSecureContext) {
      try {
        // 创建 ClipboardItem，包含 HTML 和纯文本两种格式
        const textContent = document.createElement('div');
        textContent.innerHTML = formattedHtml;
        const plainText = textContent.textContent || textContent.innerText || '';

        const htmlBlob = new Blob([formattedHtml], { type: 'text/html' });
        const textBlob = new Blob([plainText], { type: 'text/plain' });

        const clipboardItem = new ClipboardItem({
          'text/html': htmlBlob,
          'text/plain': textBlob,
        });

        await navigator.clipboard.write([clipboardItem]);
        return { 
          success: true, 
          message: '✅ 已成功复制到剪贴板！\n\n请打开微信公众号编辑器，按 Ctrl+V (Windows) 或 Cmd+V (Mac) 粘贴内容。' 
        };
      } catch (clipboardError) {
        console.warn('Clipboard API write 失败，尝试降级方案:', clipboardError);
        // 继续尝试降级方案
      }
    }

    // 方法2: 使用 execCommand 复制（降级方案，更可靠的方式）
    const container = document.createElement('div');
    container.innerHTML = formattedHtml;
    // 设置容器样式，确保内容可被选择但不在视图中
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '800px';
    container.style.maxHeight = '600px';
    container.style.overflow = 'auto';
    container.style.backgroundColor = 'white';
    container.style.padding = '20px';
    container.setAttribute('contenteditable', 'true');
    container.setAttribute('spellcheck', 'false');
    document.body.appendChild(container);

    try {
      // 聚焦容器
      container.focus();
      
      // 选择所有内容
      const range = document.createRange();
      range.selectNodeContents(container);
      const selection = window.getSelection();
      
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
        
        // 等待一小段时间确保选择完成
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // 尝试复制
        const successful = document.execCommand('copy');
        
        // 清理选择
        selection.removeAllRanges();
        
        // 移除容器
        document.body.removeChild(container);
        
        if (successful) {
          return { 
            success: true, 
            message: '✅ 已成功复制到剪贴板！\n\n请打开微信公众号编辑器，按 Ctrl+V (Windows) 或 Cmd+V (Mac) 粘贴内容。\n\n提示：如果样式不完整，请尝试在微信公众号编辑器中点击"清除格式"后再粘贴。' 
          };
        } else {
          return { 
            success: false, 
            message: '❌ 复制失败。\n\n请尝试以下方法：\n1. 手动选择右侧预览区域的内容\n2. 按 Ctrl+C (Windows) 或 Cmd+C (Mac) 复制\n3. 然后粘贴到微信公众号编辑器' 
          };
        }
      }
      
      document.body.removeChild(container);
      return { 
        success: false, 
        message: '❌ 无法选择内容进行复制。\n\n请手动选择右侧预览区域的内容并复制。' 
      };
    } catch (err) {
      // 确保容器被移除
      if (container.parentNode) {
        document.body.removeChild(container);
      }
      console.error('execCommand 复制失败:', err);
      return { 
        success: false, 
        message: '❌ 复制失败。\n\n请手动选择右侧预览区域的内容，按 Ctrl+C (Windows) 或 Cmd+C (Mac) 复制，然后粘贴到微信公众号编辑器。' 
      };
    }
  } catch (error) {
    console.error('复制过程出错:', error);
    return { 
      success: false, 
      message: '❌ 复制失败。\n\n请手动选择右侧预览区域的内容并复制。' 
    };
  }
}

/**
 * 复制纯文本到剪贴板（备用方法）
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // 降级方案
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
    console.error('复制文本失败:', err);
    return false;
  }
}
