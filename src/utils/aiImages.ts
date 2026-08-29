// AI 聊天图片输入：读取文件并缩放到 1600px 内转 base64（小体积 PNG 保持原格式，其余转 JPEG；
// SVG 光栅化为 PNG，上游模型接口不接受 image/svg+xml）。

import type { AiImage } from './aiChat';

// SVG 无位图尺寸：从 width/height/viewBox 解析固有尺寸，经 <img> 光栅化。
// 小图（如图标）放大到 1024px 保证模型可辨认，上限 1600px，输出 PNG 保留透明度。
async function readSvgFileAsAiImage(file: File): Promise<AiImage | null> {
  try {
    const text = await file.text();
    const width = Number(text.match(/\bwidth\s*=\s*["']([\d.]+)/i)?.[1]);
    const height = Number(text.match(/\bheight\s*=\s*["']([\d.]+)/i)?.[1]);
    const viewBox = text.match(/viewBox\s*=\s*["']([\d.\s+-]+)["']/)?.[1]?.trim().split(/[\s,]+/).map(Number);
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    try {
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error('svg decode failed'));
        image.src = objectUrl;
      });
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
    const sourceWidth = width || (viewBox?.length === 4 ? viewBox[2] : 0) || image.naturalWidth || 1024;
    const sourceHeight = height || (viewBox?.length === 4 ? viewBox[3] : 0) || image.naturalHeight || sourceWidth;
    const longest = Math.max(sourceWidth, sourceHeight);
    const scale = longest > 1600 ? 1600 / longest : longest < 1024 ? 1024 / longest : 1;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(sourceWidth * scale));
    canvas.height = Math.max(1, Math.round(sourceHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const previewUrl = canvas.toDataURL('image/png');
    const match = previewUrl.match(/^data:(image\/[\w+.-]+);base64,(.+)$/);
    if (!match) return null;
    return { mimeType: match[1], data: match[2], previewUrl };
  } catch {
    return null;
  }
}

export async function readImageFileAsAiImage(file: File): Promise<AiImage | null> {
  if (!file.type.startsWith('image/')) return null;
  if (file.type === 'image/svg+xml') return readSvgFileAsAiImage(file);
  try {
    const bitmap = await createImageBitmap(file);
    const maxEdge = 1600;
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const mimeType = file.type === 'image/png' && file.size < 350_000 ? 'image/png' : 'image/jpeg';
    const previewUrl = canvas.toDataURL(mimeType, 0.86);
    const match = previewUrl.match(/^data:(image\/[\w+.-]+);base64,(.+)$/);
    if (!match) return null;
    return { mimeType: match[1], data: match[2], previewUrl };
  } catch {
    // canvas 不可用（如特定格式解码失败）时退回原始 base64
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const previewUrl = String(reader.result ?? '');
        const match = previewUrl.match(/^data:(image\/[\w+.-]+);base64,(.+)$/);
        resolve(match ? { mimeType: match[1], data: match[2], previewUrl } : null);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  }
}
