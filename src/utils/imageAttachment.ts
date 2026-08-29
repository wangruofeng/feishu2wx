// 编辑器图片附件：拖拽/粘贴的图片文件插入为 data URI 图片语法。
// 浏览器对 SVG 常给出空或错误 MIME（如标成 image/png），以后缀白名单优先识别；
// data URI base64 膨胀约 4/3，超限不入稿以防撑爆 localStorage（约 5MB）配额。

const MAX_IMAGE_FILE_BYTES = 2 * 1024 * 1024;

const IMAGE_EXTENSIONS: Record<string, string> = {
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
  ico: 'image/x-icon',
  avif: 'image/avif',
};

export function getImageFileMimeType(file: File): string | null {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (IMAGE_EXTENSIONS[extension]) return IMAGE_EXTENSIONS[extension];
  return file.type.startsWith('image/') ? file.type : null;
}

export function isImageAttachmentFile(file: File): boolean {
  return getImageFileMimeType(file) !== null;
}

/** 读取图片文件为 `![](data:mime;base64,...)`；alt 留空以避免文件名进图片题注 */
export async function readImageFileAsMarkdown(file: File): Promise<string | null> {
  if (file.size > MAX_IMAGE_FILE_BYTES) return null;
  const mimeType = getImageFileMimeType(file);
  if (!mimeType) return null;

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
  const commaIndex = dataUrl.indexOf(',');
  if (commaIndex === -1 || !dataUrl.startsWith('data:')) return null;
  return `![](data:${mimeType};base64,${dataUrl.slice(commaIndex + 1)})`;
}
