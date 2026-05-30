import type { ConfigStore } from './config-store';
import { getAccessToken, base64ToUint8Array, processContentImages, uploadCoverImage, createDraft } from './wechat-worker';
import { jsonResponse } from './config-handlers';

interface PublishBody {
  title?: string;
  content?: string;
  author?: string;
  coverDataUrl?: string;
}

export async function handlePublishDraft(store: ConfigStore, body: PublishBody): Promise<Response> {
  try {
    const { title, content, author, coverDataUrl } = body;

    if (!title || !content) {
      return jsonResponse({ error: '标题和内容不能为空' }, 400);
    }

    const config = await store.get();
    if (!config) {
      return jsonResponse({ error: '请先配置公众号 AppID 和 AppSecret' }, 400);
    }

    // 获取一次 token，复用整次请求
    const token = await getAccessToken(store);

    // 1. 处理文中图片
    const { html: processedContent, firstImageUrl } = await processContentImages(content, token);

    // 2. 上传封面图
    let thumbMediaId: string;

    if (coverDataUrl) {
      const matches = coverDataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
      if (matches) {
        const ext = matches[1] === 'png' ? 'png' : 'jpg';
        const data = base64ToUint8Array(matches[2]);
        thumbMediaId = await uploadCoverImage(data, `cover.${ext}`, token);
      } else {
        return jsonResponse({ error: '封面图格式无效' }, 400);
      }
    } else if (firstImageUrl) {
      try {
        const imgRes = await fetch(firstImageUrl);
        const data = new Uint8Array(await imgRes.arrayBuffer());
        thumbMediaId = await uploadCoverImage(data, 'cover.jpg', token);
      } catch {
        return jsonResponse({ error: '封面图加载失败，请手动指定封面' }, 400);
      }
    } else {
      return jsonResponse({ error: '请提供封面图' }, 400);
    }

    // 3. 创建草稿
    const mediaId = await createDraft({
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
}
