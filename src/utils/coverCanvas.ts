const COVER_WIDTH = 900;
const COVER_HEIGHT = 383;

/**
 * 从 HTML 中提取第一个图片 URL
 */
export function getFirstImageUrl(html: string): string | null {
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : null;
}

/**
 * 生成默认封面图（渐变背景 + 标题文字）
 */
export async function generateDefaultCover(title: string): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = COVER_WIDTH;
  canvas.height = COVER_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 不可用');

  // 渐变背景
  const gradient = ctx.createLinearGradient(0, 0, COVER_WIDTH, COVER_HEIGHT);
  gradient.addColorStop(0, '#4A7FE0');
  gradient.addColorStop(1, '#3560B0');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, COVER_WIDTH, COVER_HEIGHT);

  // 标题文字
  const displayTitle = title.length > 20 ? title.slice(0, 20) + '...' : title;
  ctx.fillStyle = 'white';
  ctx.font = 'bold 42px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(displayTitle, COVER_WIDTH / 2, COVER_HEIGHT / 2 - 25);

  // 副标题
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = '20px system-ui, -apple-system, sans-serif';
  ctx.fillText('微信公众号文章', COVER_WIDTH / 2, COVER_HEIGHT / 2 + 30);

  return canvas.toDataURL('image/jpeg', 0.9);
}

/**
 * 裁剪图片为封面比例（900x383, 2.35:1）
 */
export async function cropImageToCover(imageUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = COVER_WIDTH;
      canvas.height = COVER_HEIGHT;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas 不可用'));
        return;
      }

      // 居中裁剪
      const targetRatio = COVER_WIDTH / COVER_HEIGHT;
      const sourceRatio = img.width / img.height;

      let sx = 0, sy = 0, sw = img.width, sh = img.height;
      if (sourceRatio > targetRatio) {
        // 宽图，裁左右
        sw = img.height * targetRatio;
        sx = (img.width - sw) / 2;
      } else {
        // 高图，裁上下
        sh = img.width / targetRatio;
        sy = (img.height - sh) / 2;
      }

      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, COVER_WIDTH, COVER_HEIGHT);
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = () => reject(new Error(`无法加载图片: ${imageUrl}`));
    img.src = imageUrl;
  });
}

/**
 * 根据优先级生成封面 data URL
 */
export async function generateCover(coverUrl: string | undefined, htmlContent: string, title: string): Promise<string> {
  // 1. 用户指定的封面 URL
  if (coverUrl) {
    try {
      return await cropImageToCover(coverUrl);
    } catch {
      // 加载失败，继续 fallback
    }
  }

  // 2. 文章首图
  const firstUrl = getFirstImageUrl(htmlContent);
  if (firstUrl && !firstUrl.startsWith('data:')) {
    try {
      return await cropImageToCover(firstUrl);
    } catch {
      // 加载失败，继续 fallback
    }
  }

  // 3. 默认封面
  return generateDefaultCover(title);
}
