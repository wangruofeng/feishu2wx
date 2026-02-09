import { CodeBlockStyle } from './markdownRenderer';

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
export function formatForWeChat(
  html: string,
  theme: string = 'green',
  font: string = 'default',
  showH1: boolean = true,
  imageBorderStyle: 'border' | 'shadow' = 'border',
  codeBlockStyle: CodeBlockStyle = 'classic'
): string {
  const themeStyles = getThemeStyles(theme);
  const fontFamily = getFontFamily(font);

  // 创建临时容器处理HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  // 直接应用主题样式（使用可靠的主题配置，而不是不稳定的计算样式）
  applyThemeStyles(tempDiv, themeStyles, fontFamily, showH1, imageBorderStyle, codeBlockStyle);

  return tempDiv.innerHTML;
}

/**
 * 从预览 DOM 中读取实际的样式并应用到目标元素
 * 这样可以确保预览和微信拷贝的样式完全一致
 */
function convertHighlightClassesToInlineStyles(element: HTMLElement, isDark: boolean): void {
  // 如果没有子元素（纯文本），直接返回，不处理
  if (element.children.length === 0 && !element.querySelector('span')) {
    return;
  }

  // 尝试从实际的预览 DOM 中查找对应的代码块
  const previewContent = document.querySelector('.preview-content');
  let sourceElement: HTMLElement | null = null;
  
  if (previewContent) {
    // 查找预览中对应的代码块（通过比较内容）
    const codeBlocks = previewContent.querySelectorAll('pre code');
    const targetText = element.textContent?.trim();
    for (let i = 0; i < codeBlocks.length; i++) {
      const codeBlock = codeBlocks[i];
      if (codeBlock.textContent?.trim() === targetText) {
        sourceElement = codeBlock as HTMLElement;
        break;
      }
    }
  }

  // 如果找到了预览中的对应元素，直接使用；否则创建临时容器
  let previewContainer: HTMLElement | null = null;
  let clonedElement: HTMLElement | null = null;
  
  if (sourceElement) {
    clonedElement = sourceElement;
  } else {
    // 创建一个临时的预览容器，应用相同的 CSS 类
    previewContainer = document.createElement('div');
    previewContainer.className = 'preview-content';
    previewContainer.style.position = 'absolute';
    previewContainer.style.left = '-9999px';
    previewContainer.style.top = '0';
    previewContainer.style.visibility = 'hidden';
    previewContainer.style.width = '800px'; // 设置宽度以确保样式正确计算
    document.body.appendChild(previewContainer);
    
    // 克隆元素到预览容器中（深拷贝以保留所有文本节点）
    clonedElement = element.cloneNode(true) as HTMLElement;
    previewContainer.appendChild(clonedElement);
    
    // 强制浏览器计算样式
    void clonedElement.offsetHeight;
  }

  try {
    if (!clonedElement) {
      return;
    }

    // 递归处理所有子元素和文本节点，从预览容器读取样式并应用到目标元素
    const processElement = (sourceEl: Node, targetEl: Node) => {
      if (sourceEl instanceof HTMLElement && targetEl instanceof HTMLElement) {
        // 获取计算样式
        const computedStyle = window.getComputedStyle(sourceEl);
        const color = computedStyle.color;
        const fontWeight = computedStyle.fontWeight;
        const fontStyle = computedStyle.fontStyle;
        const backgroundColor = computedStyle.backgroundColor;

        // 应用样式到目标元素
        // 只应用非默认值
        if (color) {
          // 排除默认的黑色（rgb(0,0,0) 或接近黑色）
          const rgbMatch = color.match(/\d+/g);
          if (rgbMatch && rgbMatch.length >= 3) {
            const r = parseInt(rgbMatch[0]);
            const g = parseInt(rgbMatch[1]);
            const b = parseInt(rgbMatch[2]);
            // 如果不是纯黑色或接近黑色，应用颜色
            if (r > 10 || g > 10 || b > 10) {
              targetEl.style.color = color;
            }
          } else {
            // 如果不是 RGB 格式，直接应用（可能是颜色名称或 hex）
            targetEl.style.color = color;
          }
        }
        if (fontWeight && fontWeight !== 'normal' && fontWeight !== '400') {
          targetEl.style.fontWeight = fontWeight;
        }
        if (fontStyle && fontStyle !== 'normal') {
          targetEl.style.fontStyle = fontStyle;
        }
        if (backgroundColor) {
          // 排除透明背景
          const rgbMatch = backgroundColor.match(/\d+/g);
          if (rgbMatch && rgbMatch.length >= 4) {
            const alpha = parseFloat(rgbMatch[3] || '1');
            if (alpha > 0.01) {
              targetEl.style.backgroundColor = backgroundColor;
            }
          } else if (backgroundColor !== 'transparent' && backgroundColor !== 'rgba(0, 0, 0, 0)') {
            targetEl.style.backgroundColor = backgroundColor;
          }
        }

        // 确保保留空白字符
        targetEl.style.whiteSpace = 'pre';

        // 移除类名（因为已经转换为内联样式）
        const classes = Array.from(targetEl.classList);
        classes.forEach(cls => {
          if (cls.startsWith('hljs-')) {
            targetEl.classList.remove(cls);
          }
        });
      } else if (sourceEl.nodeType === Node.TEXT_NODE && targetEl.nodeType === Node.TEXT_NODE) {
        // 文本节点：确保内容一致（包括空白字符）
        if (sourceEl.textContent !== targetEl.textContent) {
          targetEl.textContent = sourceEl.textContent;
        }
        return; // 文本节点没有子节点
      }

      // 递归处理所有子节点（包括文本节点和元素节点）
      const sourceChildNodes = Array.from(sourceEl.childNodes);
      const targetChildNodes = Array.from(targetEl.childNodes);
      
      // 确保目标元素有足够的子节点
      while (targetChildNodes.length < sourceChildNodes.length) {
        const sourceNode = sourceChildNodes[targetChildNodes.length];
        if (sourceNode.nodeType === Node.TEXT_NODE) {
          targetEl.appendChild(document.createTextNode(sourceNode.textContent || ''));
        } else if (sourceNode instanceof HTMLElement) {
          const cloned = sourceNode.cloneNode(false) as HTMLElement;
          targetEl.appendChild(cloned);
        }
        targetChildNodes.push(targetEl.lastChild!);
      }

      // 处理所有匹配的子节点
      for (let i = 0; i < Math.min(sourceChildNodes.length, targetChildNodes.length); i++) {
        processElement(sourceChildNodes[i], targetChildNodes[i]);
      }
    };

    // 处理所有子节点（包括文本节点）
    if (clonedElement) {
      const sourceChildNodes = Array.from(clonedElement.childNodes);
      const targetChildNodes = Array.from(element.childNodes);
      
      // 确保目标元素有足够的子节点
      while (targetChildNodes.length < sourceChildNodes.length) {
        const sourceNode = sourceChildNodes[targetChildNodes.length];
        if (sourceNode && sourceNode.nodeType === Node.TEXT_NODE) {
          element.appendChild(document.createTextNode(sourceNode.textContent || ''));
        } else if (sourceNode instanceof HTMLElement) {
          const cloned = sourceNode.cloneNode(false) as HTMLElement;
          element.appendChild(cloned);
        }
        const lastChild = element.lastChild;
        if (lastChild) {
          targetChildNodes.push(lastChild);
        }
      }

      // 处理所有匹配的子节点
      for (let i = 0; i < Math.min(sourceChildNodes.length, targetChildNodes.length); i++) {
        const sourceNode = sourceChildNodes[i];
        const targetNode = targetChildNodes[i];
        if (sourceNode && targetNode) {
          processElement(sourceNode, targetNode);
        }
      }
    }
  } finally {
    // 清理临时容器（如果创建了的话）
    if (previewContainer && previewContainer.parentNode) {
      document.body.removeChild(previewContainer);
    }
  }
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
  imageBorderStyle: 'border' | 'shadow',
  codeBlockStyle: CodeBlockStyle
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

  // 处理代码块：保留语法高亮的 HTML 结构，转换为内联样式
  const codeBlocks = container.querySelectorAll('pre');
  codeBlocks.forEach((pre) => {
    const preEl = pre as HTMLElement;
    const isModern = codeBlockStyle === 'modern' && preEl.classList.contains('modern-code-block');

    // 获取头部和 code 元素
    const header = preEl.querySelector('.code-block-header');
    // 优先查找 code-block-content 内的 code，如果没有则直接查找 code
    const codeContainer = preEl.querySelector('.code-block-content');
    const codeEl = codeContainer ? codeContainer.querySelector('code') : preEl.querySelector('code');
    if (!codeEl) return;

    // 如果是现代样式且有头部，先克隆头部（在清空之前）
    let headerClone: HTMLElement | null = null;
    if (isModern && header) {
      headerClone = header.cloneNode(true) as HTMLElement;
    }

    // 保留 code 元素内部的 HTML 结构（包括语法高亮的 span 标签）
    // 使用 cloneNode 深拷贝以保留所有文本节点和空白字符
    const codeClone = codeEl.cloneNode(true) as HTMLElement;
    const codeHtml = codeClone.innerHTML;
    // 检查是否有语法高亮的元素（highlight.js 生成的元素通常有以 hljs- 开头的类名）
    // 使用属性选择器 [class*="hljs-"] 来匹配包含 hljs- 的类名
    const hasHighlighting = codeEl.querySelector('[class*="hljs-"]') !== null || 
                            codeEl.querySelector('.hljs span') !== null ||
                            codeEl.querySelector('span[class*="hljs"]') !== null;

    // 清空 pre 元素，重新构建内容
    preEl.innerHTML = '';

    // 如果是现代样式且有头部，保留头部并应用内联样式
    if (isModern && headerClone) {
      const headerEl = headerClone;
      
      // 头部容器样式 - 固定在顶部，横向滚动时不动
      headerEl.style.backgroundColor = '#21252b';
      headerEl.style.padding = '10px 16px';
      headerEl.style.borderBottom = '1px solid #3e4451';
      headerEl.style.display = 'flex';
      headerEl.style.alignItems = 'center';
      headerEl.style.gap = '6px';
      headerEl.style.margin = '0';
      headerEl.style.borderTopLeftRadius = '8px';
      headerEl.style.borderTopRightRadius = '8px';
      headerEl.style.position = 'sticky';
      headerEl.style.top = '0';
      headerEl.style.zIndex = '10';
      headerEl.style.flexShrink = '0';
      
      // 处理3个圆点
      const dots = headerEl.querySelectorAll('.code-block-dot');
      dots.forEach((dot, index) => {
        const dotEl = dot as HTMLElement;
        dotEl.style.width = '12px';
        dotEl.style.height = '12px';
        dotEl.style.borderRadius = '50%';
        dotEl.style.display = 'inline-block';
        dotEl.style.margin = '0';
        dotEl.style.padding = '0';
        dotEl.style.border = 'none';
        
        // 根据类名设置颜色
        if (dotEl.classList.contains('red')) {
          dotEl.style.backgroundColor = '#ff5f56';
        } else if (dotEl.classList.contains('orange')) {
          dotEl.style.backgroundColor = '#ffbd2e';
        } else if (dotEl.classList.contains('green')) {
          dotEl.style.backgroundColor = '#27c93f';
        }
        
        // 移除类名（因为已经转换为内联样式）
        dotEl.className = '';
      });
      
      // 移除头部的类名
      headerEl.className = '';
      
      preEl.appendChild(headerEl);
    }

    // 创建新的 code 元素，保留原有的 HTML 结构（包括语法高亮）
    const newCodeEl = document.createElement('code');
    // 直接设置 innerHTML 以保留所有空白字符和 HTML 结构
    newCodeEl.innerHTML = codeHtml;
    // 确保保留空白字符
    newCodeEl.setAttribute('data-preserve-whitespace', 'true');

    if (isModern) {
      // 现代样式：深色背景，类似 IDE（Atom One Dark 主题）
      preEl.style.backgroundColor = '#282c34';
      preEl.style.padding = '0';
      preEl.style.borderRadius = '8px';
      preEl.style.marginBottom = '16px';
      preEl.style.fontSize = '14px';
      preEl.style.lineHeight = '1.5';
      preEl.style.fontFamily = 'Consolas, Monaco, "Courier New", monospace';
      preEl.style.display = 'flex';
      preEl.style.flexDirection = 'column';
      preEl.style.overflow = 'hidden';
      preEl.style.whiteSpace = 'pre';

      // 创建一个可滚动的代码容器
      const codeContainer = document.createElement('div');
      codeContainer.style.overflowX = 'auto';
      codeContainer.style.overflowY = 'visible';
      codeContainer.style.flex = '1';
      codeContainer.style.whiteSpace = 'pre';

      // code 元素样式
      newCodeEl.style.backgroundColor = 'transparent';
      newCodeEl.style.padding = '16px';
      newCodeEl.style.display = 'block';
      newCodeEl.style.color = '#e6e6e6';
      newCodeEl.style.borderRadius = '0';
      newCodeEl.style.fontSize = '14px';
      newCodeEl.style.fontFamily = 'Consolas, Monaco, "Courier New", monospace';
      newCodeEl.style.minWidth = 'fit-content';
      newCodeEl.style.whiteSpace = 'pre';
      newCodeEl.style.wordBreak = 'keep-all';
      newCodeEl.style.wordWrap = 'normal';

      // 如果有语法高亮，将 highlight.js 的 CSS 类转换为内联样式
      // 如果没有语法高亮，直接使用原始 HTML，确保空白字符被保留
      if (hasHighlighting) {
        convertHighlightClassesToInlineStyles(newCodeEl, true);
      } else {
        // 对于没有语法高亮的代码块，确保 white-space 正确设置
        newCodeEl.style.whiteSpace = 'pre';
      }

      // 将 code 元素添加到可滚动容器
      codeContainer.appendChild(newCodeEl);
      
      // 将可滚动容器添加到 pre（在头部之后）
      preEl.appendChild(codeContainer);
    } else {
      // 经典样式：浅色背景
      preEl.style.backgroundColor = '#f5f5f5';
      preEl.style.padding = '16px';
      preEl.style.borderRadius = '6px';
      preEl.style.overflowX = 'auto';
      preEl.style.marginBottom = '16px';
      preEl.style.fontSize = '14px';
      preEl.style.lineHeight = '1.5';
      preEl.style.fontFamily = 'Consolas, Monaco, "Courier New", monospace';
      preEl.style.color = '#333';
      preEl.style.whiteSpace = 'pre';

      // code 元素样式
      newCodeEl.style.backgroundColor = 'transparent';
      newCodeEl.style.padding = '0';
      newCodeEl.style.color = '#333';
      newCodeEl.style.borderRadius = '0';
      newCodeEl.style.fontSize = '14px';
      newCodeEl.style.fontFamily = 'Consolas, Monaco, "Courier New", monospace';
      newCodeEl.style.whiteSpace = 'pre';
      newCodeEl.style.wordBreak = 'keep-all';
      newCodeEl.style.wordWrap = 'normal';

      // 如果有语法高亮，将 highlight.js 的 CSS 类转换为内联样式
      // 如果没有语法高亮，直接使用原始 HTML，确保空白字符被保留
      if (hasHighlighting) {
        convertHighlightClassesToInlineStyles(newCodeEl, false);
      } else {
        // 对于没有语法高亮的代码块，确保 white-space 正确设置
        newCodeEl.style.whiteSpace = 'pre';
      }

      // 将新的 code 元素添加到 pre（经典样式）
      preEl.appendChild(newCodeEl);
    }
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

  // 先展开 li > p，避免微信把 p 转成 section 后把「第一个子元素」提到 li 下、其余包进 section 导致换行
  const listItemsWithP = container.querySelectorAll('li > p');
  listItemsWithP.forEach((p) => {
    const pEl = p as HTMLElement;
    const li = pEl.parentElement;
    if (li && li.tagName === 'LI') {
      while (pEl.firstChild) {
        li.insertBefore(pEl.firstChild, pEl);
      }
      pEl.remove();
    }
  });

  // 处理列表项
  const listItems = container.querySelectorAll('li');
  listItems.forEach((li) => {
    const liEl = li as HTMLElement;
    liEl.style.marginBottom = '4px';
    liEl.style.lineHeight = '1.8';
    liEl.style.color = '#333';
    liEl.style.fontFamily = fontFamily;

    // 处理列表项内的空白字符，确保 strong/b 标签后的文本不会换行
    // 将所有文本节点中的换行符和多余空格替换为单个空格
    const textNodes: Node[] = [];
    const walker = document.createTreeWalker(
      liEl,
      NodeFilter.SHOW_TEXT,
      null
    );

    let node: Node | null;
    while (node = walker.nextNode()) {
      if (node.textContent && node.textContent.trim()) {
        textNodes.push(node);
      }
    }

    // 处理每个文本节点，将内部换行符替换为空格
    textNodes.forEach(textNode => {
      if (textNode.textContent) {
        // 将连续的空白字符（包括换行符、制表符等）替换为单个空格
        textNode.textContent = textNode.textContent.replace(/[\r\n\t]+/g, ' ');
      }
    });
  });

  // 处理列表内的段落：移除间距并设为 inline，减少微信公众号编辑器误加换行的概率（不展开 DOM，避免必现换行）
  const listParagraphs = container.querySelectorAll('li p');
  listParagraphs.forEach((p: Element) => {
    const pEl = p as HTMLElement;
    pEl.style.marginBottom = '0';
    pEl.style.marginTop = '0';
    pEl.style.paddingLeft = '0';
    pEl.style.paddingRight = '0';
    pEl.style.display = 'inline';
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

    // 微信编辑器会清理 a 标签的颜色，需要给内部元素也设置颜色
    // 遍历链接内的所有子元素，给它们也设置颜色
    const childElements = linkEl.querySelectorAll('*');
    childElements.forEach((child) => {
      const childEl = child as HTMLElement;
      childEl.style.color = themeStyles.linkColor;
    });

    // 如果链接内只有文本节点（没有子元素），用 span 包裹文本并设置颜色
    // 这样可以更有效地防止微信编辑器清理颜色
    if (linkEl.children.length === 0 && linkEl.textContent?.trim()) {
      const span = document.createElement('span');
      span.style.color = themeStyles.linkColor;
      span.textContent = linkEl.textContent;
      linkEl.innerHTML = '';
      linkEl.appendChild(span);
    }

    // 如果直接子元素是 strong/b/em/i/span/code 等，确保它们也有颜色
    Array.from(linkEl.children).forEach((child) => {
      const childEl = child as HTMLElement;
      if (['STRONG', 'B', 'EM', 'I', 'SPAN', 'CODE'].includes(childEl.tagName)) {
        childEl.style.color = themeStyles.linkColor;
      }
    });

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
  // 注意：微信公众号编辑器可能对 strong/b 标签有特殊处理，导致布局问题
  // 因此，我们将列表项内的 strong/b 标签替换为 span 标签，用内联样式实现加粗
  const strongElements = container.querySelectorAll('strong, b');
  strongElements.forEach((strong) => {
    const strongEl = strong as HTMLElement;

    // 检查是否在列表项内
    const parentLi = strongEl.closest('li');

    if (parentLi) {
      // 在列表项内：将 strong/b 替换为 span，避免微信公众号的特殊处理
      const span = document.createElement('span');
      span.style.fontWeight = 'bold';
      span.style.fontStyle = 'normal';
      span.style.fontFamily = fontFamily;
      span.style.display = 'inline'; // 确保行内显示

      // 复制所有子节点
      while (strongEl.firstChild) {
        span.appendChild(strongEl.firstChild);
      }

      // 替换原元素
      strongEl.parentNode?.replaceChild(span, strongEl);
    } else {
      // 不在列表项内：保持原样，只添加样式
      strongEl.style.fontWeight = 'bold';
      strongEl.style.fontStyle = 'normal';
      strongEl.style.fontFamily = fontFamily;
    }
  });

  // 微信公众号会把 li 的「第一个子元素」提到 li 下、其余包进 section 导致换行。将每个 li 的全部内容包进一个 span，使 li 仅有一个直接子节点
  const listItemsToWrap = container.querySelectorAll('ul li, ol li');
  listItemsToWrap.forEach((li) => {
    const liEl = li as HTMLElement;
    if (liEl.childNodes.length === 0) return;
    const wrapper = document.createElement('span');
    wrapper.style.display = 'inline';
    while (liEl.firstChild) {
      wrapper.appendChild(liEl.firstChild);
    }
    liEl.appendChild(wrapper);
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
 * 获取预览区域中选中的 HTML 内容
 */
function getSelectedHtmlFromPreview(): string | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return null;
  }

  const range = selection.getRangeAt(0);
  const previewElement = document.querySelector('.preview-content');
  
  if (!previewElement) {
    return null;
  }

  // 检查选中内容是否在预览区域内
  if (!previewElement.contains(range.commonAncestorContainer)) {
    return null;
  }

  // 创建临时容器来获取选中的 HTML
  const tempDiv = document.createElement('div');
  tempDiv.appendChild(range.cloneContents());
  return tempDiv.innerHTML;
}

/**
 * 复制选中的内容到微信公众号编辑器
 */
export async function copySelectedToWeChat(
  theme: string = 'green',
  font: string = 'default',
  showH1: boolean = true,
  imageBorderStyle: 'border' | 'shadow' = 'border',
  codeBlockStyle: CodeBlockStyle = 'classic'
): Promise<{ success: boolean; message: string }> {
  const selectedHtml = getSelectedHtmlFromPreview();
  
  if (!selectedHtml || !selectedHtml.trim()) {
    return { 
      success: false, 
      message: '请先在预览区域选择要复制的内容' 
    };
  }

  return copyHtmlToWeChat(selectedHtml, theme, font, showH1, imageBorderStyle, codeBlockStyle);
}

/**
 * 复制HTML内容到微信公众号编辑器
 * 使用 Clipboard API 的 write 方法来复制富文本格式
 */
export async function copyHtmlToWeChat(
  html: string,
  theme: string = 'green',
  font: string = 'default',
  showH1: boolean = true,
  imageBorderStyle: 'border' | 'shadow' = 'border',
  codeBlockStyle: CodeBlockStyle = 'classic'
): Promise<{ success: boolean; message: string }> {
  if (!html || !html.trim()) {
    return { success: false, message: '没有内容可复制' };
  }

  const formattedHtml = formatForWeChat(html, theme, font, showH1, imageBorderStyle, codeBlockStyle);
  
  // 方法1: 优先使用 Clipboard API（现代浏览器，支持富文本）
  if (navigator.clipboard && navigator.clipboard.write && window.isSecureContext) {
    try {
      // 创建 ClipboardItem，包含 HTML 和纯文本两种格式
      const textContent = document.createElement('div');
      textContent.innerHTML = formattedHtml;
      const plainText = textContent.textContent || textContent.innerText || '';

      const htmlBlob = new Blob([formattedHtml], { type: 'text/html' });
      const textBlob = new Blob([plainText], { type: 'text/plain' });

      // 尝试两种方式创建 ClipboardItem（某些浏览器要求 Promise，某些要求 Blob）
      let clipboardItem;
      try {
        // 方式1: 使用 Promise（某些浏览器要求）
        clipboardItem = new ClipboardItem({
          'text/html': Promise.resolve(htmlBlob),
          'text/plain': Promise.resolve(textBlob),
        });
      } catch (e) {
        // 方式2: 直接使用 Blob（某些浏览器要求）
        clipboardItem = new ClipboardItem({
          'text/html': htmlBlob,
          'text/plain': textBlob,
        });
      }

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

  // 方法2: 使用 execCommand 复制（兼容性更好）
  // 创建一个隐藏的 contenteditable div，自动选择并复制
  const container = document.createElement('div');
  container.innerHTML = formattedHtml;
  container.contentEditable = 'true';
  container.style.position = 'fixed';
  container.style.left = '0';
  container.style.top = '0';
  container.style.width = '1px';
  container.style.height = '1px';
  container.style.opacity = '0.01'; // 极小的透明度，确保元素可见
  container.style.pointerEvents = 'none';
  container.style.overflow = 'hidden';
  container.style.zIndex = '999999';
  container.style.backgroundColor = 'transparent';
  
  document.body.appendChild(container);

  try {
    // 等待 DOM 更新
    await new Promise(resolve => setTimeout(resolve, 20));
    
    // 聚焦容器（某些浏览器需要聚焦才能复制）
    container.focus();
    
    // 等待聚焦完成
    await new Promise(resolve => setTimeout(resolve, 20));

    // 使用 selectAll 命令选择所有内容（最可靠的方法）
    let copySuccess = false;
    try {
      const selectAllSuccess = document.execCommand('selectAll', false, undefined);
      if (selectAllSuccess) {
        await new Promise(resolve => setTimeout(resolve, 100));
        copySuccess = document.execCommand('copy');
      }
    } catch (e) {
      // selectAll 失败，尝试手动选择
    }

    // 如果 selectAll 失败，尝试手动创建选择范围
    if (!copySuccess) {
      const range = document.createRange();
      range.selectNodeContents(container);
      const selection = window.getSelection();
      
      if (selection) {
        selection.removeAllRanges();
        try {
          selection.addRange(range);
          await new Promise(resolve => setTimeout(resolve, 100));
          copySuccess = document.execCommand('copy');
        } catch (e) {
          // 如果添加范围失败，尝试选择整个容器
          try {
            const fullRange = document.createRange();
            fullRange.selectNode(container);
            selection.removeAllRanges();
            selection.addRange(fullRange);
            await new Promise(resolve => setTimeout(resolve, 100));
            copySuccess = document.execCommand('copy');
          } catch (e2) {
            // 所有选择方法都失败
          }
        }
        
        // 清理选择
        selection.removeAllRanges();
      }
    }
    
    // 移除容器
    if (container.parentNode) {
      document.body.removeChild(container);
    }
    
    if (copySuccess) {
      return { 
        success: true, 
        message: '✅ 已成功复制到剪贴板！\n\n请打开微信公众号编辑器，按 Ctrl+V (Windows) 或 Cmd+V (Mac) 粘贴内容。' 
      };
    }
  } catch (err) {
    console.error('execCommand 复制失败:', err);
    // 确保容器被移除
    if (container.parentNode) {
      document.body.removeChild(container);
    }
  }

  // 方法3: 使用 textarea 作为最后的后备方案
  try {
    const textarea = document.createElement('textarea');
    textarea.value = formattedHtml;
    textarea.style.position = 'fixed';
    textarea.style.left = '0';
    textarea.style.top = '0';
    textarea.style.width = '2px';
    textarea.style.height = '2px';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    document.body.appendChild(textarea);
    
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const copySuccess = document.execCommand('copy');
    document.body.removeChild(textarea);
    
    if (copySuccess) {
      return { 
        success: true, 
        message: '✅ 已成功复制到剪贴板！\n\n请打开微信公众号编辑器，按 Ctrl+V (Windows) 或 Cmd+V (Mac) 粘贴内容。\n\n注意：由于浏览器限制，部分样式可能丢失。' 
      };
    }
  } catch (err) {
    console.error('textarea 复制失败:', err);
  }

  // 所有方法都失败
  return { 
    success: false, 
    message: '❌ 复制失败。\n\n请手动选择右侧预览区域的内容，按 Ctrl+C (Windows) 或 Cmd+C (Mac) 复制，然后粘贴到微信公众号编辑器。' 
  };
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
