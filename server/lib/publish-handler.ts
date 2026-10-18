import { jsonResponse } from './config-handlers';
import { hasWebpSignature } from './wechat-publish';

interface PublishBody {
  title?: string;
  content?: string;
  author?: string;
  digest?: string;
  coverDataUrl?: string;
  coverUrl?: string;
  appId?: string;
  appSecret?: string;
}

interface PublishWechatService {
  getAccessTokenFromCredentials(appId: string, appSecret: string): Promise<string>;
  base64ToUint8Array(base64: string): Uint8Array;
  processContentImages(html: string, token: string): Promise<{
    html: string;
    firstImageUrl: string | null;
  }>;
  uploadCoverImage(data: Uint8Array, filename: string, token: string, contentType?: string): Promise<string>;
  createDraft(params: {
    title: string;
    content: string;
    thumbMediaId: string;
    author?: string;
    digest?: string;
  }, token: string): Promise<string>;
}

const MAX_TITLE_LENGTH = 200;
const MAX_AUTHOR_LENGTH = 200;
const MAX_DIGEST_LENGTH = 120;
const MAX_CONTENT_LENGTH = 5_000_000;
const MAX_COVER_DATA_URL_LENGTH = 12_000_000;
const MAX_COVER_URL_LENGTH = 2_048;
const MAX_CREDENTIAL_LENGTH = 256;

// 图片签名校验保持运行时无关；Node 专用转换通过工厂参数注入。
export function hasSvgContent(data: Uint8Array): boolean {
  const head = new TextDecoder().decode(data.subarray(0, 512)).trimStart();
  return head.startsWith('<svg') || head.startsWith('<?xml');
}

export type CoverImageNormalizer = (
  data: Uint8Array,
  inferredExt: string
) => Promise<{ data: Uint8Array; ext: 'jpg' | 'png' | 'gif' }>;

class UnsupportedCoverImageError extends Error {}

// Pages 只透传微信支持的格式，不能在共享 handler 中导入原生图像库。
const validatePagesCoverImage: CoverImageNormalizer = async (data, inferredExt) => {
  const format = inferredExt === 'webp' || hasWebpSignature(data) ? 'WebP'
    : inferredExt === 'svg' || hasSvgContent(data) ? 'SVG' : null;
  if (format) {
    throw new UnsupportedCoverImageError(`Cloudflare Pages 暂不支持 ${format} 封面转换，请先转换为 PNG/JPG/GIF 后重试`);
  }
  return { data, ext: inferredExt === 'png' || inferredExt === 'gif' ? inferredExt : 'jpg' };
};

function coverContentType(ext: 'jpg' | 'png' | 'gif'): string {
  if (ext === 'png') return 'image/png';
  if (ext === 'gif') return 'image/gif';
  return 'image/jpeg';
}

export function createPublishDraftHandler(
  wechat: PublishWechatService,
  normalizeCoverImage: CoverImageNormalizer = validatePagesCoverImage
) {
  return async function handlePublishDraft(body: PublishBody): Promise<Response> {
    try {
      const { title, content, author, digest, coverDataUrl, coverUrl, appId, appSecret } = body;

      if (
        typeof title !== 'string'
        || typeof content !== 'string'
        || !title.trim()
        || !content.trim()
        || title.length > MAX_TITLE_LENGTH
        || content.length > MAX_CONTENT_LENGTH
        || (author !== undefined && (typeof author !== 'string' || author.length > MAX_AUTHOR_LENGTH))
        || (digest !== undefined && (typeof digest !== 'string' || digest.length > MAX_DIGEST_LENGTH))
        || (coverDataUrl !== undefined && (typeof coverDataUrl !== 'string' || coverDataUrl.length > MAX_COVER_DATA_URL_LENGTH))
        || (coverUrl !== undefined && (typeof coverUrl !== 'string' || coverUrl.length > MAX_COVER_URL_LENGTH))
      ) {
        return jsonResponse({ error: '标题和内容不能为空' }, 400);
      }

      if (
        typeof appId !== 'string'
        || typeof appSecret !== 'string'
        || !appId
        || !appSecret
        || appId.length > MAX_CREDENTIAL_LENGTH
        || appSecret.length > MAX_CREDENTIAL_LENGTH
      ) {
        return jsonResponse({ error: '请先配置公众号 AppID 和 AppSecret' }, 400);
      }

      const token = await wechat.getAccessTokenFromCredentials(appId, appSecret);

      // 1. 处理文中图片
      const { html: processedContent, firstImageUrl } = await wechat.processContentImages(content, token);

      // 2. 上传封面图
      let thumbMediaId: string;

      if (coverDataUrl) {
        const matches = coverDataUrl.match(/^data:image\/([\w.+-]+);base64,(.+)$/);
        if (matches) {
          const mime = matches[1].toLowerCase();
          const baseMime = mime.split('+')[0];
          if (!['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(baseMime)) {
            return jsonResponse({ error: '封面图格式无效' }, 400);
          }
          const data = wechat.base64ToUint8Array(matches[2]);
          const cover = await normalizeCoverImage(data, baseMime === 'jpeg' ? 'jpg' : baseMime);
          thumbMediaId = await wechat.uploadCoverImage(
            cover.data,
            `cover.${cover.ext}`,
            token,
            coverContentType(cover.ext)
          );
        } else {
          return jsonResponse({ error: '封面图格式无效' }, 400);
        }
      } else if (coverUrl) {
        let parsedCoverUrl: URL;
        try {
          parsedCoverUrl = new URL(coverUrl);
        } catch {
          return jsonResponse({ error: '封面图片 URL 无效' }, 400);
        }

        if (parsedCoverUrl.protocol !== 'http:' && parsedCoverUrl.protocol !== 'https:') {
          return jsonResponse({ error: '封面图片 URL 仅支持 HTTP 或 HTTPS' }, 400);
        }

        try {
          const imgRes = await fetch(parsedCoverUrl);
          if (!imgRes.ok) throw new Error(`HTTP ${imgRes.status}`);
          const data = new Uint8Array(await imgRes.arrayBuffer());
          const contentType = imgRes.headers.get('content-type')?.split(';')[0];
          const extension = contentType === 'image/png' ? 'png'
            : contentType === 'image/gif' ? 'gif'
            : contentType === 'image/webp' ? 'webp'
            : contentType === 'image/svg+xml' ? 'svg' : 'jpg';
          const cover = await normalizeCoverImage(data, extension);
          thumbMediaId = await wechat.uploadCoverImage(
            cover.data,
            `cover.${cover.ext}`,
            token,
            coverContentType(cover.ext)
          );
        } catch (error) {
          if (error instanceof UnsupportedCoverImageError) return jsonResponse({ error: error.message }, 400);
          return jsonResponse({ error: '封面图片加载失败，请确认 URL 可公开访问且格式受支持' }, 400);
        }
      } else if (firstImageUrl) {
        try {
          const imgRes = await fetch(firstImageUrl);
          const data = new Uint8Array(await imgRes.arrayBuffer());
          thumbMediaId = await wechat.uploadCoverImage(data, 'cover.jpg', token);
        } catch {
          return jsonResponse({ error: '封面图加载失败，请手动指定封面' }, 400);
        }
      } else {
        return jsonResponse({ error: '请提供封面图' }, 400);
      }

      // 3. 创建草稿
      const mediaId = await wechat.createDraft({
        title,
        content: processedContent,
        thumbMediaId,
        author: author || '',
        digest: digest || '',
      }, token);

      return jsonResponse({
        success: true,
        mediaId,
        message: '已推送到公众号草稿箱',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '推送失败';
      return jsonResponse({ error: message }, error instanceof UnsupportedCoverImageError ? 400 : 500);
    }
  };
}
