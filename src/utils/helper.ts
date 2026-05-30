/**
 * 将 HTML 中的 WebP 图片转为 PNG base64 data URI
 * 微信推送 API 不支持 WebP 格式，需在前端预处理
 */
export async function convertWebpToPng(html: string): Promise<string> {
  const webpImgRegex = /<img[^>]+src=["']([^"']+\.webp[^"']*)["']/gi;
  const matches = [...html.matchAll(webpImgRegex)];

  if (matches.length === 0) return html;

  let result = html;

  for (const match of matches) {
    const url = match[1];
    try {
      const pngDataUrl = await webpToPngDataUrl(url);
      result = result.split(match[0]).join(match[0].replace(url, pngDataUrl));
    } catch (e) {
      console.warn(`WebP 转换失败: ${url}`, e);
    }
  }

  return result;
}

function webpToPngDataUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas 2D context 不可用'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('图片加载失败'));
    img.src = url;
  });
}