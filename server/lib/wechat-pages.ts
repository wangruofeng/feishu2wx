import {
  createProcessContentImages,
  hasWebpSignature,
  SupportedImageExtension,
  WechatUploadImage,
} from './wechat-publish';

export {
  base64ToUint8Array,
  createDraft,
  getAccessTokenFromCredentials,
  uploadCoverImage,
} from './wechat-publish';

async function passThroughWechatUploadImage(
  data: Uint8Array,
  ext: SupportedImageExtension
): Promise<WechatUploadImage> {
  if (ext === 'webp' || hasWebpSignature(data)) {
    throw new Error('Cloudflare Pages 暂不支持 WebP 图片推送，请先转换为 PNG/GIF 后重试');
  }

  return { data, ext };
}

export const processContentImages = createProcessContentImages(passThroughWechatUploadImage);
