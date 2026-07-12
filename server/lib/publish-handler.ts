import { jsonResponse } from './config-handlers';

interface PublishBody {
  title?: string;
  content?: string;
  author?: string;
  coverDataUrl?: string;
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
  }, token: string): Promise<string>;
}

const MAX_TITLE_LENGTH = 200;
const MAX_AUTHOR_LENGTH = 200;
const MAX_CONTENT_LENGTH = 5_000_000;
const MAX_COVER_DATA_URL_LENGTH = 12_000_000;
const MAX_CREDENTIAL_LENGTH = 256;

export function createPublishDraftHandler(wechat: PublishWechatService) {
  return async function handlePublishDraft(body: PublishBody): Promise<Response> {
    try {
      const { title, content, author, coverDataUrl, appId, appSecret } = body;

      if (
        typeof title !== 'string'
        || typeof content !== 'string'
        || !title.trim()
        || !content.trim()
        || title.length > MAX_TITLE_LENGTH
        || content.length > MAX_CONTENT_LENGTH
        || (author !== undefined && (typeof author !== 'string' || author.length > MAX_AUTHOR_LENGTH))
        || (coverDataUrl !== undefined && (typeof coverDataUrl !== 'string' || coverDataUrl.length > MAX_COVER_DATA_URL_LENGTH))
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
        const matches = coverDataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
        if (matches) {
          const ext = matches[1] === 'png' ? 'png' : 'jpg';
          const data = wechat.base64ToUint8Array(matches[2]);
          thumbMediaId = await wechat.uploadCoverImage(data, `cover.${ext}`, token, ext === 'png' ? 'image/png' : 'image/jpeg');
        } else {
          return jsonResponse({ error: '封面图格式无效' }, 400);
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
      }, token);

      return jsonResponse({
        success: true,
        mediaId,
        message: '已推送到公众号草稿箱',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '推送失败';
      return jsonResponse({ error: message }, 500);
    }
  };
}
