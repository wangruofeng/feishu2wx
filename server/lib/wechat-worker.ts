import { createProcessContentImages } from './wechat-publish';
import { normalizeWechatUploadImage } from './webp-normalizer-node';

export {
  base64ToUint8Array,
  createDraft,
  getAccessTokenFromCredentials,
  uploadCoverImage,
} from './wechat-publish';

export const processContentImages = createProcessContentImages(normalizeWechatUploadImage);
