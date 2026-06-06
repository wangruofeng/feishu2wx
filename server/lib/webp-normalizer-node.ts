import {
  hasWebpSignature,
  SupportedImageExtension,
  WechatUploadImage,
} from './wechat-publish';

const WECHAT_UPLOADIMG_MAX_BYTES = 1024 * 1024;

export async function normalizeWechatUploadImage(
  data: Uint8Array,
  ext: SupportedImageExtension
): Promise<WechatUploadImage> {
  if (ext !== 'webp' && !hasWebpSignature(data)) {
    return { data, ext };
  }

  const { default: sharp } = await import('sharp');
  const input = Buffer.from(data);
  const image = sharp(input, { animated: true });
  const metadata = await image.metadata();

  if ((metadata.pages || 1) > 1) {
    const widths = [800, 640, 512, 480, 420, 360, 300];

    for (const width of widths) {
      const gif = await sharp(input, { animated: true })
        .resize({
          width,
          height: width,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .gif({ colours: 128, effort: 10 })
        .toBuffer();

      if (gif.length <= WECHAT_UPLOADIMG_MAX_BYTES) {
        return { data: new Uint8Array(gif), ext: 'gif' };
      }
    }

    throw new Error('动态 WebP 转 GIF 后仍超过微信正文图片大小限制，请压缩动图后重试');
  }

  const png = await sharp(input).png().toBuffer();
  return { data: new Uint8Array(png), ext: 'png' };
}
