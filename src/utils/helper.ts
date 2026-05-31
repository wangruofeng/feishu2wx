/**
 * 将 HTML 中的 WebP 图片转为 PNG base64 data URI
 * 微信推送 API 不支持 WebP 格式，需在前端预处理
 */
export async function convertWebpToPng(html: string): Promise<string> {
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
  const matches = Array.from(html.matchAll(imgRegex));

  if (matches.length === 0) return html;

  let result = html;

  for (const match of matches) {
    const url = match[1];
    try {
      if (await isWebpImage(url)) {
        const pngDataUrl = await webpToPngDataUrl(url);
        result = result.split(match[0]).join(match[0].replace(url, pngDataUrl));
      }
    } catch (e) {
      console.warn(`WebP 转换失败: ${url}`, e);
    }
  }

  return result;
}

async function isWebpImage(url: string): Promise<boolean> {
  if (/^data:image\/webp[;,]/i.test(url) || hasWebpSignature(url)) {
    return true;
  }

  if (!/^https?:\/\//i.test(url)) {
    return /\.webp(?:[?#].*)?$/i.test(url);
  }

  try {
    const res = await fetch(url);
    if (!res.ok) {
      return /\.webp(?:[?#].*)?$/i.test(url);
    }

    const bytes = new Uint8Array(await res.arrayBuffer());
    return hasWebpSignature(bytes);
  } catch {
    return /\.webp(?:[?#].*)?$/i.test(url);
  }
}

function hasWebpSignature(input: string | Uint8Array): boolean {
  let bytes: Uint8Array;

  if (typeof input === 'string') {
    const base64Match = input.match(/^data:image\/\w+;base64,(.+)$/i);
    if (!base64Match) return false;
    bytes = base64ToBytes(base64Match[1]);
  } else {
    bytes = input;
  }

  return bytes.length >= 12
    && bytes[0] === 82
    && bytes[1] === 73
    && bytes[2] === 70
    && bytes[3] === 70
    && bytes[8] === 87
    && bytes[9] === 69
    && bytes[10] === 66
    && bytes[11] === 80;
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
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
