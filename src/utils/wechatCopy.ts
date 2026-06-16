import { CodeBlockStyle } from './markdownRenderer';
import { modernCodeBlockStyles } from './codeBlockStyles';
import { WECHAT_IMAGE_CAPTION_TAG, WECHAT_IMAGE_WRAPPER_TAG } from './wechatTagWhitelist';

/**
 * 获取主题相关的样式配置
 */
function getThemeStyles(theme: string) {
  // 向后兼容：旧版 'green' → 新版 'teal'
  const normalizedTheme = theme === 'green' ? 'teal' : theme;

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
    teal: {
      primaryColor: '#0D9488',
      primaryColorDark: '#0F766E',
      headingColor: '#115E59',
      headingColorH2: '#115E59',
      headingColorH3H6: '#0F766E',
      linkColor: '#0D9488',
      blockquoteBorderColor: '#0D9488',
      blockquoteBgColor: '#F0FDFA',
      tableHeaderBgColor: '#F0FDFA',
      tableHeaderColor: '#115E59',
    },
    classic: {
      primaryColor: '#000000e6',
      primaryColorDark: '#000000cc',
      headingColor: '#000000cc',
      headingColorH2: '#000000cc',
      headingColorH3H6: '#000000e6',
      linkColor: '#1890ff',
      blockquoteBorderColor: '#000000e6',
      blockquoteBgColor: '#f5f5f5',
      tableHeaderBgColor: '#f5f5f5',
      tableHeaderColor: '#000000cc',
    },
    orange: {
      primaryColor: '#EA580C',
      primaryColorDark: '#9A3412',
      headingColor: '#9A3412',
      headingColorH2: '#9A3412',
      headingColorH3H6: '#C2410C',
      linkColor: '#EA580C',
      blockquoteBorderColor: '#EA580C',
      blockquoteBgColor: '#FFF7ED',
      tableHeaderBgColor: '#FFF7ED',
      tableHeaderColor: '#9A3412',
    },
    blue: {
      primaryColor: '#0F4C81',
      primaryColorDark: '#0a3357',
      headingColor: '#0F4C81',
      headingColorH2: '#0F4C81',
      headingColorH3H6: '#1a5c8f',
      linkColor: '#0F4C81',
      blockquoteBorderColor: '#0F4C81',
      blockquoteBgColor: '#f0f7ff',
      tableHeaderBgColor: '#f0f7ff',
      tableHeaderColor: '#0F4C81',
    },
  };

  return themes[normalizedTheme] || themes.classic;
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

function preserveCodeWhitespaceForWechat(codeEl: HTMLElement): void {
  const textNodes: Text[] = [];
  const walker = document.createTreeWalker(codeEl, NodeFilter.SHOW_TEXT);
  let currentNode = walker.nextNode();

  while (currentNode) {
    if (currentNode.nodeType === Node.TEXT_NODE) {
      textNodes.push(currentNode as Text);
    }
    currentNode = walker.nextNode();
  }

  textNodes.forEach((textNode) => {
    const value = textNode.textContent ?? '';
    if (!value.includes('\n') && !value.includes('\t') && !value.includes('  ')) {
      return;
    }

    const lines = value.replace(/\r\n/g, '\n').split('\n');
    const fragment = document.createDocumentFragment();

    lines.forEach((line, index) => {
      const normalizedLine = line
        .replace(/\t/g, '    ')
        .replace(/ /g, '\u00a0');

      if (normalizedLine) {
        fragment.appendChild(document.createTextNode(normalizedLine));
      }

      if (index < lines.length - 1) {
        fragment.appendChild(document.createElement('br'));
      }
    });

    textNode.parentNode?.replaceChild(fragment, textNode);
  });
}

function isWhitespaceTextNode(node: Node): boolean {
  return node.nodeType === Node.TEXT_NODE && !(node.textContent?.trim());
}

function isEmptyParagraph(node: Node | null): node is HTMLElement {
  if (!(node instanceof HTMLElement) || node.tagName !== 'P') {
    return false;
  }

  const meaningfulNodes = Array.from(node.childNodes).filter((child) => {
    if (isWhitespaceTextNode(child)) {
      return false;
    }
    return !(child instanceof HTMLBRElement);
  });

  return meaningfulNodes.length === 0;
}

function isImageBlock(node: Node | null): boolean {
  if (!(node instanceof HTMLElement)) {
    return false;
  }

  if (node.tagName === 'IMG') {
    return true;
  }

  return node.classList.contains('img-figure') || node.classList.contains('wechat-image-wrapper');
}

function removeSpacingSiblingsAround(node: Node): void {
  let previous = node.previousSibling;
  while (previous && (isWhitespaceTextNode(previous) || previous instanceof HTMLBRElement || isEmptyParagraph(previous))) {
    const current = previous;
    previous = previous.previousSibling;
    current.parentNode?.removeChild(current);
  }

  let next = node.nextSibling;
  while (next && (isWhitespaceTextNode(next) || next instanceof HTMLBRElement || isEmptyParagraph(next))) {
    const current = next;
    next = next.nextSibling;
    current.parentNode?.removeChild(current);
  }
}

function removeEmptyParagraphsAdjacentToImages(container: HTMLElement): void {
  const emptyParagraphs = Array.from(container.querySelectorAll('p')).filter(isEmptyParagraph);

  emptyParagraphs.forEach((paragraph) => {
    const previous = paragraph.previousSibling;
    const next = paragraph.nextSibling;

    if (isImageBlock(previous) || isImageBlock(next)) {
      paragraph.remove();
    }
  });
}

function removeListFormattingWhitespace(container: HTMLElement): void {
  const listContainers = container.querySelectorAll('ul, ol');
  listContainers.forEach((list) => {
    Array.from(list.childNodes).forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE && /[\r\n]/.test(child.textContent || '') && !child.textContent?.trim()) {
        child.parentNode?.removeChild(child);
      }
    });
  });

  const listItems = container.querySelectorAll('li');
  listItems.forEach((li) => {
    Array.from(li.childNodes).forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE && /[\r\n]/.test(child.textContent || '') && !child.textContent?.trim()) {
        child.parentNode?.removeChild(child);
      }
    });
  });
}

function applyCompactImageWrapperStyles(wrapper: HTMLElement): void {
  wrapper.className = 'wechat-image-wrapper';
  wrapper.style.margin = '16px 0';
  wrapper.style.padding = '0';
  wrapper.style.fontSize = '0';
  wrapper.style.lineHeight = '0';
  wrapper.style.textAlign = 'center';
  wrapper.style.clear = 'both';
}

function downgradeImageFiguresForWechat(container: HTMLElement): void {
  const figures = Array.from(container.querySelectorAll('figure.img-figure'));

  figures.forEach((figure) => {
    const wrapper = document.createElement(WECHAT_IMAGE_WRAPPER_TAG);
    wrapper.className = 'wechat-image-wrapper';

    Array.from(figure.childNodes).forEach((child) => {
      if (child instanceof HTMLElement && child.tagName === 'FIGCAPTION') {
        const caption = document.createElement(WECHAT_IMAGE_CAPTION_TAG);
        caption.className = 'img-caption';
        while (child.firstChild) {
          caption.appendChild(child.firstChild);
        }
        wrapper.appendChild(caption);
        return;
      }

      wrapper.appendChild(child);
    });

    figure.parentNode?.replaceChild(wrapper, figure);
  });
}

function wrapStandaloneImages(container: HTMLElement): void {
  const images = Array.from(container.querySelectorAll('img'));

  images.forEach((img) => {
    const imgEl = img as HTMLImageElement;
    const parent = imgEl.parentElement;
    if (!parent || parent.classList.contains('img-figure') || parent.classList.contains('wechat-image-wrapper')) {
      return;
    }

    const wrapper = document.createElement('section');
    applyCompactImageWrapperStyles(wrapper);
    parent.insertBefore(wrapper, imgEl);
    wrapper.appendChild(imgEl);
  });
}

function isSvgImageSource(src: string): boolean {
  const cleanSrc = src.split(/[?#]/)[0].toLowerCase();
  return cleanSrc.endsWith('.svg') || src.toLowerCase().startsWith('data:image/svg+xml');
}

function decodeSvgDataUrl(dataUrl: string): string | null {
  const match = dataUrl.match(/^data:image\/svg\+xml(?:;charset=[^;,]+)?(;base64)?,(.*)$/i);
  if (!match) {
    return null;
  }

  try {
    const data = match[2];
    return match[1] ? atob(data) : decodeURIComponent(data);
  } catch (error) {
    console.warn('解析 SVG data URL 失败:', error);
    return null;
  }
}

function parseSvgLength(value: string | null): number | null {
  if (!value || value.trim().endsWith('%')) {
    return null;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function getSvgSize(svgText: string): { width: number; height: number } {
  const fallbackSize = { width: 800, height: 450 };
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  const svg = doc.documentElement;

  if (!svg || svg.nodeName.toLowerCase() !== 'svg') {
    return fallbackSize;
  }

  const width = parseSvgLength(svg.getAttribute('width'));
  const height = parseSvgLength(svg.getAttribute('height'));
  if (width && height) {
    return { width, height };
  }

  const viewBox = svg.getAttribute('viewBox') || svg.getAttribute('viewbox');
  if (viewBox) {
    const values = viewBox.trim().split(/\s+/).map(Number);
    if (values.length === 4 && values.every(Number.isFinite) && values[2] > 0 && values[3] > 0) {
      return { width: values[2], height: values[3] };
    }
  }

  if (width) {
    return { width, height: Math.round(width * fallbackSize.height / fallbackSize.width) };
  }

  if (height) {
    return { width: Math.round(height * fallbackSize.width / fallbackSize.height), height };
  }

  return fallbackSize;
}

function constrainSvgSize(size: { width: number; height: number }): { width: number; height: number } {
  const maxSide = 1600;
  const longestSide = Math.max(size.width, size.height);

  if (longestSide <= maxSide) {
    return size;
  }

  const ratio = maxSide / longestSide;
  return {
    width: Math.round(size.width * ratio),
    height: Math.round(size.height * ratio),
  };
}

function ensureSvgNamespace(svgText: string): string {
  if (/^<svg[\s>]/i.test(svgText.trim()) && !/\sxmlns=/.test(svgText)) {
    return svgText.replace(/^<svg/i, '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  return svgText;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('SVG 图片加载失败'));
    image.src = src;
  });
}

async function rasterizeSvgTextToPng(svgText: string): Promise<string> {
  const normalizedSvg = ensureSvgNamespace(svgText);
  const { width, height } = constrainSvgSize(getSvgSize(normalizedSvg));
  const blob = new Blob([normalizedSvg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  try {
    const image = await loadImage(url);
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(width);
    canvas.height = Math.ceil(height);

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('浏览器不支持 Canvas 渲染');
    }

    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function getSvgTextFromImageSource(src: string): Promise<string | null> {
  if (src.toLowerCase().startsWith('data:image/svg+xml')) {
    return decodeSvgDataUrl(src);
  }

  try {
    const response = await fetch(src);
    if (!response.ok) {
      return null;
    }
    return await response.text();
  } catch (error) {
    console.warn('读取 SVG 图片失败，保留原图:', error);
    return null;
  }
}

function getInlineSvgAlt(svg: SVGSVGElement): string {
  return svg.getAttribute('aria-label') || svg.querySelector('title')?.textContent || '';
}

export async function convertSvgImagesToPng(html: string): Promise<string> {
  const container = document.createElement('div');
  container.innerHTML = html;

  const inlineSvgs = Array.from(container.querySelectorAll('svg'));
  for (const svg of inlineSvgs) {
    if (svg.closest('pre, code')) {
      continue;
    }

    try {
      const pngDataUrl = await rasterizeSvgTextToPng(svg.outerHTML);
      const img = document.createElement('img');
      img.src = pngDataUrl;
      img.alt = getInlineSvgAlt(svg as SVGSVGElement);
      svg.replaceWith(img);
    } catch (error) {
      console.warn('内联 SVG 转 PNG 失败，保留原 SVG:', error);
    }
  }

  const images = Array.from(container.querySelectorAll('img'));
  for (const img of images) {
    const src = img.getAttribute('src') || '';
    if (!isSvgImageSource(src)) {
      continue;
    }

    const svgText = await getSvgTextFromImageSource(src);
    if (!svgText) {
      continue;
    }

    try {
      img.setAttribute('src', await rasterizeSvgTextToPng(svgText));
    } catch (error) {
      console.warn('SVG 图片转 PNG 失败，保留原图:', error);
    }
  }

  return container.innerHTML;
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
  theme: string = 'classic',
  font: string = 'default',
  showH1Underline: boolean = true,
  imageBorderStyle: 'border' | 'shadow' | 'default' = 'border',
  imageBorderRadius: boolean = false,
  codeBlockStyle: CodeBlockStyle = 'classic',
  invertH1: boolean = false,
  invertH2: boolean = false,
  alignH2Left: boolean = false,
  showBlockquoteBg: boolean = true
): string {
  const themeStyles = getThemeStyles(theme);
  const fontFamily = getFontFamily(font);

  // 创建临时容器处理HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  // 直接应用主题样式（使用可靠的主题配置，而不是不稳定的计算样式）
  removePreviewOnlyElements(tempDiv);
  downgradeImageFiguresForWechat(tempDiv);
  applyThemeStyles(tempDiv, theme, themeStyles, fontFamily, showH1Underline, imageBorderStyle, imageBorderRadius, codeBlockStyle, invertH1, invertH2, alignH2Left, showBlockquoteBg);

  return tempDiv.innerHTML;
}

function removePreviewOnlyElements(container: HTMLElement): void {
  container.querySelectorAll('[data-preview-only="true"]').forEach((element) => {
    element.remove();
  });
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
  theme: string,
  themeStyles: ReturnType<typeof getThemeStyles>,
  fontFamily: string,
  showH1Underline: boolean,
  imageBorderStyle: 'border' | 'shadow' | 'default',
  imageBorderRadius: boolean,
  codeBlockStyle: CodeBlockStyle,
  invertH1: boolean,
  invertH2: boolean,
  alignH2Left: boolean,
  showBlockquoteBg: boolean = true
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
    imgEl.style.display = 'inline-block';
    imgEl.style.verticalAlign = 'top';
    // 上下间距由图片外层块统一控制，避免图片自身和 figure/wrapper 叠加。
    imgEl.style.margin = '0 auto';
    imgEl.style.borderRadius = imageBorderRadius ? '4px' : '0';

    // 根据图片边框模式设置样式
    if (imageBorderStyle === 'border') {
      imgEl.style.border = '0.5px solid #e0e0e0';
      imgEl.style.boxShadow = 'none';
    } else if (imageBorderStyle === 'shadow') {
      // 阴影模式：原始阴影效果
      imgEl.style.border = 'none';
      imgEl.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.05)';
    }
    // default 模式：不额外设置图片边框或阴影

    // 确保图片有完整的URL
    if (imgEl.src && !imgEl.src.startsWith('http') && !imgEl.src.startsWith('data:')) {
      if (imgEl.src.startsWith('/')) {
        imgEl.src = window.location.origin + imgEl.src;
      }
    }
  });

  // 处理图片说明文字
  const captions = container.querySelectorAll('.img-caption');
  captions.forEach((caption) => {
    const captionEl = caption as HTMLElement;
    captionEl.style.fontSize = '12px';
    captionEl.style.color = 'rgb(167, 167, 167)';
    captionEl.style.textAlign = 'center';
    captionEl.style.margin = '6px 0 0';
    captionEl.style.lineHeight = '1.5';
  });

  // 处理图片容器
  const figures = container.querySelectorAll('.img-figure');
  figures.forEach((figure) => {
    const figureEl = figure as HTMLElement;
    figureEl.style.margin = '16px 0';
    figureEl.style.padding = '0';
    figureEl.style.textAlign = 'center';
    figureEl.style.fontSize = '0';
    figureEl.style.lineHeight = '0';
  });

  const imageWrappers = container.querySelectorAll('.wechat-image-wrapper');
  imageWrappers.forEach((wrapper) => {
    applyCompactImageWrapperStyles(wrapper as HTMLElement);
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
      headerEl.style.backgroundColor = modernCodeBlockStyles.headerBackgroundColor;
      headerEl.style.padding = modernCodeBlockStyles.headerPadding;
      headerEl.style.display = 'flex';
      headerEl.style.alignItems = 'center';
      headerEl.style.gap = modernCodeBlockStyles.dotGap;
      headerEl.style.margin = '0';
      headerEl.style.borderTopLeftRadius = modernCodeBlockStyles.borderRadius;
      headerEl.style.borderTopRightRadius = modernCodeBlockStyles.borderRadius;
      headerEl.style.position = 'sticky';
      headerEl.style.top = '0';
      headerEl.style.zIndex = '10';
      headerEl.style.flexShrink = '0';
      headerEl.style.width = '100%';
      headerEl.style.boxSizing = 'border-box';
      
      // 处理3个圆点
      const dots = headerEl.querySelectorAll('.code-block-dot');
      dots.forEach((dot, index) => {
        const dotEl = dot as HTMLElement;
        dotEl.style.width = modernCodeBlockStyles.dotSize;
        dotEl.style.height = modernCodeBlockStyles.dotSize;
        dotEl.style.borderRadius = '50%';
        dotEl.style.display = 'inline-block';
        dotEl.style.margin = '0';
        dotEl.style.padding = '0';
        dotEl.style.border = 'none';
        dotEl.style.fontSize = '0';
        dotEl.style.lineHeight = '0';
        dotEl.style.overflow = 'hidden';
        dotEl.innerHTML = '&nbsp;';
        
        // 根据类名设置颜色
        if (dotEl.classList.contains('red')) {
          dotEl.style.backgroundColor = modernCodeBlockStyles.redDotColor;
        } else if (dotEl.classList.contains('orange')) {
          dotEl.style.backgroundColor = modernCodeBlockStyles.orangeDotColor;
        } else if (dotEl.classList.contains('green')) {
          dotEl.style.backgroundColor = modernCodeBlockStyles.greenDotColor;
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
      preEl.style.backgroundColor = modernCodeBlockStyles.preBackgroundColor;
      preEl.style.padding = '0';
      preEl.style.borderRadius = modernCodeBlockStyles.borderRadius;
      preEl.style.marginBottom = '16px';
      preEl.style.fontSize = modernCodeBlockStyles.fontSize;
      preEl.style.lineHeight = modernCodeBlockStyles.lineHeight;
      preEl.style.fontFamily = 'Consolas, Monaco, "Courier New", monospace';
      preEl.style.display = 'flex';
      preEl.style.flexDirection = 'column';
      preEl.style.overflow = 'hidden';
      preEl.style.whiteSpace = 'pre';
      preEl.style.textAlign = 'left';

      // 创建一个可滚动的代码容器
      const codeContainer = document.createElement('div');
      codeContainer.style.overflowX = 'auto';
      codeContainer.style.overflowY = 'visible';
      codeContainer.style.flex = '1';
      codeContainer.style.whiteSpace = 'pre';
      codeContainer.style.textAlign = 'left';

      // code 元素样式
      newCodeEl.style.backgroundColor = 'transparent';
      newCodeEl.style.padding = modernCodeBlockStyles.codePadding;
      newCodeEl.style.display = 'block';
      newCodeEl.style.color = modernCodeBlockStyles.codeTextColor;
      newCodeEl.style.borderRadius = '0';
      newCodeEl.style.fontSize = modernCodeBlockStyles.fontSize;
      newCodeEl.style.lineHeight = modernCodeBlockStyles.lineHeight;
      newCodeEl.style.fontFamily = 'Consolas, Monaco, "Courier New", monospace';
      newCodeEl.style.minWidth = 'fit-content';
      newCodeEl.style.whiteSpace = 'pre';
      newCodeEl.style.wordBreak = 'keep-all';
      newCodeEl.style.wordWrap = 'normal';
      newCodeEl.style.textAlign = 'left';

      // 如果有语法高亮，将 highlight.js 的 CSS 类转换为内联样式
      // 如果没有语法高亮，直接使用原始 HTML，确保空白字符被保留
      if (hasHighlighting) {
        convertHighlightClassesToInlineStyles(newCodeEl, true);
      } else {
        // 对于没有语法高亮的代码块，确保 white-space 正确设置
        newCodeEl.style.whiteSpace = 'pre';
      }

      preserveCodeWhitespaceForWechat(newCodeEl);

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
      preEl.style.textAlign = 'left';

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
      newCodeEl.style.textAlign = 'left';

      // 如果有语法高亮，将 highlight.js 的 CSS 类转换为内联样式
      // 如果没有语法高亮，直接使用原始 HTML，确保空白字符被保留
      if (hasHighlighting) {
        convertHighlightClassesToInlineStyles(newCodeEl, false);
      } else {
        // 对于没有语法高亮的代码块，确保 white-space 正确设置
        newCodeEl.style.whiteSpace = 'pre';
      }

      preserveCodeWhitespaceForWechat(newCodeEl);

      // 将新的 code 元素添加到 pre（经典样式）
      preEl.appendChild(newCodeEl);
    }
  });

  // 将只包含图片的 <p> 替换为其内容本身，避免微信给 <p> 添加默认间距产生额外空行
  const allParagraphs = container.querySelectorAll('p');
  const imageParagraphs: HTMLElement[] = [];
  allParagraphs.forEach((p) => {
    const pEl = p as HTMLElement;
    const containsImage = pEl.querySelector('img');
    const hasDirectText = Array.from(pEl.childNodes).some(node =>
      node.nodeType === Node.TEXT_NODE && (node.textContent?.trim().length ?? 0) > 0
    );
    if (containsImage && !hasDirectText) {
      imageParagraphs.push(pEl);
    }
  });
  imageParagraphs.forEach((pEl) => {
    const parent = pEl.parentNode;
    if (!parent) return;
    while (pEl.firstChild) {
      const child = pEl.firstChild;
      if (child.nodeType === Node.TEXT_NODE && !(child.textContent?.trim())) {
        pEl.removeChild(child);
        continue;
      }
      parent.insertBefore(child, pEl);
    }
    parent.removeChild(pEl);
  });

  wrapStandaloneImages(container);
  const compactImageBlocks = container.querySelectorAll('img, .img-figure, .wechat-image-wrapper');
  compactImageBlocks.forEach((block) => removeSpacingSiblingsAround(block));
  removeEmptyParagraphsAdjacentToImages(container);

  // 处理段落间距
  const paragraphs = container.querySelectorAll('p');
  paragraphs.forEach((p) => {
    const pEl = p as HTMLElement;
    if (pEl.classList.contains('img-caption')) {
      return;
    }
    if (pEl.textContent?.trim()) {
      pEl.style.fontSize = '16px';
      // 检查 p 后面是否跟着列表，如果是则减少下间距
      const nextSibling = pEl.nextElementSibling;
      const isFollowedByList = nextSibling && (
        nextSibling.tagName === 'UL' || nextSibling.tagName === 'OL'
      );
      pEl.style.marginBottom = isFollowedByList ? '4px' : '24px';
      pEl.style.marginTop = '0';
      pEl.style.lineHeight = '1.8';
      pEl.style.color = '#333';
      pEl.style.fontFamily = fontFamily;
      pEl.style.textAlign = 'left';
    }
  });

  // 处理标题 - 完整样式（使用主题颜色，使用px单位确保兼容性）
  const h1Elements = container.querySelectorAll('h1');
  h1Elements.forEach((h1, index) => {
    const h1El = h1 as HTMLElement;
    let inlineWrapper = h1El.querySelector(':scope > .h1-inline-block') as HTMLElement | null;

    if (!inlineWrapper) {
      inlineWrapper = document.createElement('span');
      inlineWrapper.className = 'h1-inline-block';

      while (h1El.firstChild) {
        inlineWrapper.appendChild(h1El.firstChild);
      }

      h1El.appendChild(inlineWrapper);
    }

    // 使用px单位，微信公众号编辑器对em单位支持可能不好
    h1El.style.fontSize = '22px';
    // 第一个 h1 的 margin-top 为 8px，后续为 48px
    h1El.style.marginTop = index === 0 ? '8px' : '48px';
    h1El.style.marginBottom = '16px';
    h1El.style.marginLeft = '0';
    h1El.style.marginRight = '0';
    h1El.style.fontWeight = 'bold';
    h1El.style.lineHeight = '1.25';
    // 根据 showH1Underline 和 invertH1 决定是否显示底部横线
    h1El.style.borderBottom = showH1Underline && !invertH1 ? `1px solid ${themeStyles.headingColor}` : 'none';
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

    inlineWrapper.style.display = invertH1 ? 'table' : 'inline';
    inlineWrapper.style.margin = invertH1 ? '0 auto' : '0';
    inlineWrapper.style.padding = invertH1 ? '6px 14px' : '0';
    // 橙色主题的反显背景色使用 headingColor（与 H1 文本色一致），其他主题使用 primaryColor
    const invertH1BgColor = theme === 'orange' ? themeStyles.headingColor : themeStyles.primaryColor;
    inlineWrapper.style.backgroundColor = invertH1 ? invertH1BgColor : 'transparent';
    inlineWrapper.style.color = invertH1 ? '#ffffff' : themeStyles.headingColor;
    inlineWrapper.style.borderRadius = '0';
    inlineWrapper.style.lineHeight = '1.25';
    inlineWrapper.style.setProperty('box-decoration-break', invertH1 ? 'clone' : 'slice');
    inlineWrapper.style.setProperty('-webkit-box-decoration-break', invertH1 ? 'clone' : 'slice');
  });

  const h2Elements = container.querySelectorAll('h2');
  h2Elements.forEach((h2) => {
    const h2El = h2 as HTMLElement;
    let inlineWrapper = h2El.querySelector(':scope > .h2-inline-block') as HTMLElement | null;

    if (invertH2 && !inlineWrapper) {
      inlineWrapper = document.createElement('span');
      inlineWrapper.className = 'h2-inline-block';
      while (h2El.firstChild) {
        inlineWrapper.appendChild(h2El.firstChild);
      }
      h2El.appendChild(inlineWrapper);
    }

    h2El.style.fontSize = '18px';
    h2El.style.marginTop = '32px';
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
    h2El.style.textAlign = alignH2Left ? 'left' : 'center';
    h2El.style.fontFamily = fontFamily;

    if (inlineWrapper) {
      inlineWrapper.style.display = invertH2 ? 'inline-block' : 'inline';
      inlineWrapper.style.margin = invertH2 ? '0 auto' : '0';
      inlineWrapper.style.padding = invertH2 ? '4px 12px' : '0';
      inlineWrapper.style.backgroundColor = invertH2 ? themeStyles.primaryColor : 'transparent';
      inlineWrapper.style.color = invertH2 ? '#ffffff' : themeStyles.headingColorH2;
      inlineWrapper.style.borderRadius = '0';
      inlineWrapper.style.lineHeight = '1.25';
    }
  });

  const h3Elements = container.querySelectorAll('h3');
  h3Elements.forEach((h3) => {
    const h3El = h3 as HTMLElement;
    h3El.style.fontSize = '16px';
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
    // 检查是否是嵌套列表
    const parentLi = listEl.parentElement;
    const isNested = parentLi && parentLi.tagName === 'LI';

    listEl.style.marginBottom = isNested ? '4px' : '16px';
    listEl.style.marginTop = isNested ? '4px' : '0';
    listEl.style.paddingLeft = '30px';
    listEl.style.color = '#333';
    listEl.style.fontFamily = fontFamily;
    listEl.style.textAlign = 'left';
    listEl.style.fontSize = '16px';
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
  removeListFormattingWhitespace(container);

  // 处理列表项
  const listItems = container.querySelectorAll('li');
  listItems.forEach((li) => {
    const liEl = li as HTMLElement;
    liEl.style.marginBottom = '4px';
    liEl.style.lineHeight = '1.8';
    liEl.style.color = '#333';
    liEl.style.fontFamily = fontFamily;
    liEl.style.fontSize = '16px';

    // 处理列表项内的空白字符，确保 strong/b 标签后的文本不会换行
    // 将所有文本节点中的换行符和多余空格替换为单个空格
    const textNodes: Node[] = [];
    const walker = document.createTreeWalker(
      liEl,
      NodeFilter.SHOW_TEXT,
      null
    );

    let node: Node | null;
    while ((node = walker.nextNode())) {
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

  // 处理 task list checkbox：添加内联样式
  const checkboxes = container.querySelectorAll('.task-checkbox');
  checkboxes.forEach((cb: Element) => {
    const cbEl = cb as HTMLElement;
    cbEl.style.marginRight = '4px';
    cbEl.style.fontSize = '1em';
    cbEl.style.verticalAlign = 'middle';
    if (cbEl.classList.contains('checked')) {
      cbEl.style.opacity = '0.85';
    }
  });

  // task list item: 移除列表样式标记
  const taskItems = container.querySelectorAll('li.task-list-item');
  taskItems.forEach((li: Element) => {
    const liEl = li as HTMLElement;
    liEl.style.listStyle = 'none';
    liEl.style.marginLeft = '-20px';
  });

  // 处理脚注分隔线
  const footnotesSep = container.querySelectorAll('hr.footnotes-sep');
  footnotesSep.forEach((hr: Element) => {
    const hrEl = hr as HTMLElement;
    hrEl.style.border = 'none';
    hrEl.style.borderTop = '1px solid #ddd';
    hrEl.style.margin = '24px 0 8px';
    hrEl.style.height = '0';
    hrEl.style.background = 'none';
  });

  // 处理脚注区块
  const footnotesSections = container.querySelectorAll('section.footnotes');
  footnotesSections.forEach((section: Element) => {
    const secEl = section as HTMLElement;
    secEl.style.fontSize = '0.85em';
    secEl.style.color = '#666';
    secEl.style.lineHeight = '1.6';
    secEl.style.fontFamily = fontFamily;
  });

  const footnotesLists = container.querySelectorAll('ol.footnotes-list');
  footnotesLists.forEach((ol: Element) => {
    const olEl = ol as HTMLElement;
    olEl.style.paddingLeft = '24px';
    olEl.style.margin = '0';
  });

  const footnoteItems = container.querySelectorAll('.footnote-item');
  footnoteItems.forEach((li: Element) => {
    const liEl = li as HTMLElement;
    liEl.style.marginBottom = '4px';
  });

  // 脚注引用（正文中上标）
  const footnoteRefs = container.querySelectorAll('.footnote-ref');
  footnoteRefs.forEach((ref: Element) => {
    const refEl = ref as HTMLElement;
    refEl.style.fontSize = '0.75em';
    refEl.style.verticalAlign = 'super';
    const a = refEl.querySelector('a');
    if (a) {
      const aEl = a as HTMLElement;
      aEl.style.color = themeStyles.linkColor;
      aEl.style.textDecoration = 'none';
    }
  });

  // 脚注返回链接
  const footnoteBackrefs = container.querySelectorAll('.footnote-backref');
  footnoteBackrefs.forEach((a: Element) => {
    const aEl = a as HTMLElement;
    aEl.style.color = themeStyles.linkColor;
    aEl.style.textDecoration = 'none';
  });

  // 处理引用（使用主题颜色）
  const blockquotes = container.querySelectorAll('blockquote');
  blockquotes.forEach((blockquote) => {
    const bqEl = blockquote as HTMLElement;
    bqEl.style.margin = '16px 0';
    bqEl.style.padding = '12px 16px';
    bqEl.style.borderLeft = `4px solid ${themeStyles.blockquoteBorderColor}`;
    bqEl.style.backgroundColor = showBlockquoteBg ? themeStyles.blockquoteBgColor : 'transparent';
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
    cellEl.style.fontSize = '14px';
  });

  // 处理表头（使用主题颜色）
  const tableHeaders = container.querySelectorAll('th');
  tableHeaders.forEach((th: Element) => {
    const thEl = th as HTMLElement;
    thEl.style.backgroundColor = themeStyles.tableHeaderBgColor;
    thEl.style.fontWeight = '600';
    thEl.style.color = themeStyles.tableHeaderColor;
    thEl.style.fontFamily = fontFamily;
    thEl.style.fontSize = '14px';
  });

  // 处理分隔线（等高实线）
  const horizontalRules = container.querySelectorAll('hr');
  horizontalRules.forEach((hr) => {
    const hrEl = hr as HTMLElement;

    // 清除默认样式
    hrEl.style.border = 'none';
    hrEl.style.margin = '24px 0';
    hrEl.style.height = '1px';
    hrEl.style.padding = '0';
    hrEl.style.width = '100%';
    hrEl.style.display = 'block';
    hrEl.style.boxSizing = 'border-box';

    // 使用纯黑色 10% 透明度作为分割线颜色
    hrEl.style.background = 'rgba(0, 0, 0, 0.1)';
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
  theme: string = 'classic',
  font: string = 'default',
  showH1Underline: boolean = true,
  imageBorderStyle: 'border' | 'shadow' | 'default' = 'border',
  imageBorderRadius: boolean = false,
  codeBlockStyle: CodeBlockStyle = 'classic',
  invertH1: boolean = false,
  invertH2: boolean = false,
  alignH2Left: boolean = false,
  showBlockquoteBg: boolean = true
): Promise<{ success: boolean; message: string }> {
  const selectedHtml = getSelectedHtmlFromPreview();

  if (!selectedHtml || !selectedHtml.trim()) {
    return {
      success: false,
      message: '请先在预览区域选择要复制的内容'
    };
  }

  return copyHtmlToWeChat(selectedHtml, theme, font, showH1Underline, imageBorderStyle, imageBorderRadius, codeBlockStyle, invertH1, invertH2, alignH2Left, showBlockquoteBg);
}

/**
 * 复制HTML内容到微信公众号编辑器
 * 使用 Clipboard API 的 write 方法来复制富文本格式
 */
export async function copyHtmlToWeChat(
  html: string,
  theme: string = 'classic',
  font: string = 'default',
  showH1Underline: boolean = true,
  imageBorderStyle: 'border' | 'shadow' | 'default' = 'border',
  imageBorderRadius: boolean = false,
  codeBlockStyle: CodeBlockStyle = 'classic',
  invertH1: boolean = false,
  invertH2: boolean = false,
  alignH2Left: boolean = false,
  showBlockquoteBg: boolean = true
): Promise<{ success: boolean; message: string }> {
  if (!html || !html.trim()) {
    return { success: false, message: '没有内容可复制' };
  }

  const htmlWithRasterizedSvg = await convertSvgImagesToPng(html);
  const formattedHtml = formatForWeChat(htmlWithRasterizedSvg, theme, font, showH1Underline, imageBorderStyle, imageBorderRadius, codeBlockStyle, invertH1, invertH2, alignH2Left, showBlockquoteBg);
  
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
        message: '已成功复制到剪贴板！\n\n请打开微信公众号编辑器，按 Ctrl+V (Windows) 或 Cmd+V (Mac) 粘贴内容。' 
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
        message: '已成功复制到剪贴板！\n\n请打开微信公众号编辑器，按 Ctrl+V (Windows) 或 Cmd+V (Mac) 粘贴内容。' 
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
        message: '已成功复制到剪贴板！\n\n请打开微信公众号编辑器，按 Ctrl+V (Windows) 或 Cmd+V (Mac) 粘贴内容。\n\n注意：由于浏览器限制，部分样式可能丢失。' 
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
