import { hasSvgContent, type CoverImageNormalizer } from './publish-handler';
import { hasWebpSignature } from './wechat-publish';

// librsvg 要求 XML 声明位于文档最前，去掉 BOM 与前导空白。
function stripSvgPreamble(data: Uint8Array): Uint8Array {
  let i = 0;
  while (i < data.length) {
    const ch = data[i];
    if (ch === 0xEF || ch === 0xBB || ch === 0xBF || ch === 0x20 || ch === 0x09 || ch === 0x0A || ch === 0x0D) {
      i += 1;
      continue;
    }
    break;
  }
  return data.slice(i);
}

// 仅由 Node 发布入口导入，禁止进入 Pages Functions 的依赖图。
export const normalizeCoverImage: CoverImageNormalizer = async (data, inferredExt) => {
  const isWebp = inferredExt === 'webp' || hasWebpSignature(data);
  const isSvg = inferredExt === 'svg' || hasSvgContent(data);
  if (!isWebp && !isSvg) {
    return { data, ext: inferredExt === 'png' || inferredExt === 'gif' ? inferredExt : 'jpg' };
  }

  const { default: sharp } = await import('sharp');
  const input = isSvg ? stripSvgPreamble(data) : data;
  const png = await sharp(Buffer.from(input)).png().toBuffer();
  return { data: new Uint8Array(png), ext: 'png' };
};
