/**
 * 获取主题相关的样式配置
 */
function getThemeStyles(theme: string) {
  const themes: Record<string, {
    primaryColor: string;
    primaryColorDark: string;
    headingColor: string;
    headingColorH2: string;
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
      linkColor: '#13c2c2',
      blockquoteBorderColor: '#13c2c2',
      blockquoteBgColor: '#e6fffb',
      tableHeaderBgColor: '#e6fffb',
      tableHeaderColor: '#006d75',
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
 */
export function formatForWeChat(html: string, theme: string = 'green', font: string = 'default'): string {
  const themeStyles = getThemeStyles(theme);
  const fontFamily = getFontFamily(font);
  
  // 创建一个临时div来处理HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  // 首先设置容器的字体，作为默认字体
  tempDiv.style.fontFamily = fontFamily;

  // 处理图片：确保图片有完整的样式和URL
  const images = tempDiv.querySelectorAll('img');
  images.forEach((img) => {
    const imgEl = img as HTMLImageElement;
    // 设置完整的图片样式
    imgEl.style.maxWidth = '100%';
    imgEl.style.width = 'auto';
    imgEl.style.height = 'auto';
    imgEl.style.display = 'block';
    imgEl.style.margin = '16px auto';
    imgEl.style.borderRadius = '4px';
    imgEl.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
    // 确保图片有完整的URL
    if (imgEl.src && !imgEl.src.startsWith('http') && !imgEl.src.startsWith('data:')) {
      if (imgEl.src.startsWith('/')) {
        imgEl.src = window.location.origin + imgEl.src;
      }
    }
  });

  // 处理行内代码
  const inlineCodes = tempDiv.querySelectorAll('code:not(pre code)');
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
  const codeBlocks = tempDiv.querySelectorAll('pre');
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
  const paragraphs = tempDiv.querySelectorAll('p');
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
  const h1Elements = tempDiv.querySelectorAll('h1');
  h1Elements.forEach((h1) => {
    const h1El = h1 as HTMLElement;
    // 使用px单位，微信公众号编辑器对em单位支持可能不好
    h1El.style.fontSize = '24px';
    h1El.style.marginTop = '24px';
    h1El.style.marginBottom = '16px';
    h1El.style.marginLeft = '0';
    h1El.style.marginRight = '0';
    h1El.style.fontWeight = 'bold';
    h1El.style.lineHeight = '1.25';
    h1El.style.borderBottom = `1px solid ${themeStyles.primaryColor}`;
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

  const h2Elements = tempDiv.querySelectorAll('h2');
  h2Elements.forEach((h2) => {
    const h2El = h2 as HTMLElement;
    h2El.style.fontSize = '18px';
    h2El.style.marginTop = '24px';
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

  const h3Elements = tempDiv.querySelectorAll('h3');
  h3Elements.forEach((h3) => {
    const h3El = h3 as HTMLElement;
    h3El.style.fontSize = '20px';
    h3El.style.marginTop = '24px';
    h3El.style.marginBottom = '16px';
    h3El.style.marginLeft = '0';
    h3El.style.marginRight = '0';
    h3El.style.fontWeight = 'bold';
    h3El.style.lineHeight = '1.25';
    h3El.style.color = themeStyles.headingColor;
    h3El.style.display = 'block';
    h3El.style.fontFamily = fontFamily;
  });

  const h4Elements = tempDiv.querySelectorAll('h4, h5, h6');
  h4Elements.forEach((h) => {
    const hEl = h as HTMLElement;
    hEl.style.marginTop = '24px';
    hEl.style.marginBottom = '16px';
    hEl.style.fontWeight = '600';
    hEl.style.lineHeight = '1.25';
    hEl.style.color = themeStyles.headingColor;
    hEl.style.fontFamily = fontFamily;
  });

  // 处理列表
  const lists = tempDiv.querySelectorAll('ul, ol');
  lists.forEach((list) => {
    const listEl = list as HTMLElement;
    listEl.style.marginBottom = '16px';
    listEl.style.marginTop = '0';
    listEl.style.paddingLeft = '30px';
    listEl.style.color = '#333';
    listEl.style.fontFamily = fontFamily;
  });

  // 处理列表项
  const listItems = tempDiv.querySelectorAll('li');
  listItems.forEach((li) => {
    const liEl = li as HTMLElement;
    liEl.style.marginBottom = '8px';
    liEl.style.lineHeight = '1.8';
    liEl.style.color = '#333';
    liEl.style.fontFamily = fontFamily;
  });

  // 处理引用（使用主题颜色）
  const blockquotes = tempDiv.querySelectorAll('blockquote');
  blockquotes.forEach((blockquote) => {
    const bqEl = blockquote as HTMLElement;
    bqEl.style.margin = '16px 0';
    bqEl.style.padding = '12px 16px';
    bqEl.style.borderLeft = `4px solid ${themeStyles.blockquoteBorderColor}`;
    bqEl.style.backgroundColor = themeStyles.blockquoteBgColor;
    bqEl.style.color = '#333';
    bqEl.style.borderRadius = '0 4px 4px 0';
    bqEl.style.fontFamily = fontFamily;
  });

  // 处理链接（使用主题颜色）
  const links = tempDiv.querySelectorAll('a');
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
  const tables = tempDiv.querySelectorAll('table');
  tables.forEach((table) => {
    const tableEl = table as HTMLElement;
    tableEl.style.width = '100%';
    tableEl.style.borderCollapse = 'collapse';
    tableEl.style.marginBottom = '16px';
    tableEl.style.marginTop = '0';
  });

  // 处理表格单元格
  const tableCells = tempDiv.querySelectorAll('td, th');
  tableCells.forEach((cell) => {
    const cellEl = cell as HTMLElement;
    cellEl.style.padding = '8px 12px';
    cellEl.style.border = '1px solid #e8e8e8';
    cellEl.style.color = '#333';
    cellEl.style.fontFamily = fontFamily;
  });

  // 处理表头（使用主题颜色）
  const tableHeaders = tempDiv.querySelectorAll('th');
  tableHeaders.forEach((th) => {
    const thEl = th as HTMLElement;
    thEl.style.backgroundColor = themeStyles.tableHeaderBgColor;
    thEl.style.fontWeight = '600';
    thEl.style.color = themeStyles.tableHeaderColor;
    thEl.style.fontFamily = fontFamily;
  });

  // 处理分隔线
  const horizontalRules = tempDiv.querySelectorAll('hr');
  horizontalRules.forEach((hr) => {
    const hrEl = hr as HTMLElement;
    hrEl.style.border = 'none';
    hrEl.style.borderTop = '2px solid #e8e8e8';
    hrEl.style.margin = '24px 0';
    hrEl.style.height = '0';
  });

  // 处理加粗文本（必须在最后处理，确保样式不被其他处理覆盖）
  const strongElements = tempDiv.querySelectorAll('strong, b');
  strongElements.forEach((strong) => {
    const strongEl = strong as HTMLElement;
    // 强制设置加粗样式
    strongEl.style.fontWeight = 'bold';
    strongEl.style.fontStyle = 'normal';
    // 确保颜色
    strongEl.style.color = strongEl.style.color || '#333';
    // 确保显示方式
    strongEl.style.display = 'inline';
  });

  // 处理斜体文本
  const emElements = tempDiv.querySelectorAll('em, i');
  emElements.forEach((em) => {
    const emEl = em as HTMLElement;
    emEl.style.fontStyle = 'italic';
    emEl.style.fontWeight = 'normal';
    // 确保颜色
    emEl.style.color = emEl.style.color || '#333';
    // 确保显示方式
    emEl.style.display = 'inline';
  });

  // 最后确保所有文本都有颜色和字体（但要排除已经处理过的 strong、em 等）
  const allTextElements = tempDiv.querySelectorAll('*');
  allTextElements.forEach((el) => {
    const elHtml = el as HTMLElement;
    const tagName = elHtml.tagName;
    // 如果元素没有设置颜色，且不是链接、代码、加粗、斜体等特殊元素，设置默认颜色
    if (!elHtml.style.color && 
        !['A', 'CODE', 'PRE', 'STRONG', 'B', 'EM', 'I'].includes(tagName) &&
        elHtml.textContent?.trim()) {
      elHtml.style.color = '#333';
    }
    // 如果元素没有设置字体，且不是代码块，设置默认字体
    if (!elHtml.style.fontFamily && 
        !['CODE', 'PRE'].includes(tagName) &&
        elHtml.textContent?.trim()) {
      elHtml.style.fontFamily = fontFamily;
    }
  });

  // 再次确保 strong 和 b 标签的加粗样式和字体（防止被覆盖）
  const finalStrongElements = tempDiv.querySelectorAll('strong, b');
  finalStrongElements.forEach((strong) => {
    const strongEl = strong as HTMLElement;
    strongEl.style.fontWeight = 'bold';
    strongEl.style.fontFamily = fontFamily;
  });

  // 确保 em 和 i 标签也应用字体
  const finalEmElements = tempDiv.querySelectorAll('em, i');
  finalEmElements.forEach((em) => {
    const emEl = em as HTMLElement;
    emEl.style.fontFamily = fontFamily;
  });

  return tempDiv.innerHTML;
}

/**
 * 复制HTML内容到微信公众号编辑器
 * 使用 Clipboard API 的 write 方法来复制富文本格式
 */
export async function copyHtmlToWeChat(html: string, theme: string = 'green', font: string = 'default'): Promise<{ success: boolean; message: string }> {
  if (!html || !html.trim()) {
    return { success: false, message: '没有内容可复制' };
  }

  const formattedHtml = formatForWeChat(html, theme, font);
  
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
