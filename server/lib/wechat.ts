import { getConfig } from './config';

// Token 缓存
let cachedToken: { token: string; expiresAt: number } | null = null;

interface WechatTokenResponse {
  access_token?: string;
  expires_in?: number;
  errcode?: number;
  errmsg?: string;
}

interface WechatUploadResponse {
  url?: string;
  media_id?: string;
  errcode?: number;
  errmsg?: string;
}

interface WechatDraftResponse {
  media_id?: string;
  errcode?: number;
  errmsg?: string;
}

export async function getAccessToken(): Promise<string> {
  // 缓存有效（预留 5 分钟缓冲）
  if (cachedToken && cachedToken.expiresAt > Date.now() + 300000) {
    return cachedToken.token;
  }

  const config = await getConfig();
  if (!config) {
    throw new Error('请先配置公众号 AppID 和 AppSecret');
  }

  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${config.appId}&secret=${config.appSecret}`;
  const res = await fetch(url);
  const data = (await res.json()) as WechatTokenResponse;

  if (data.errcode) {
    throw new Error(`获取 access_token 失败: ${data.errmsg} (${data.errcode})`);
  }

  cachedToken = {
    token: data.access_token!,
    expiresAt: Date.now() + (data.expires_in || 7200) * 1000,
  };

  return data.access_token!;
}

// 上传文中图片到微信图床（返回微信 URL）
async function uploadContentImageBuffer(buffer: Buffer, filename: string): Promise<string> {
  const token = await getAccessToken();
  const url = `https://api.weixin.qq.com/cgi-bin/media/uploadimg?access_token=${token}`;

  const formData = new FormData();
  const blob = new Blob([new Uint8Array(buffer)]);
  formData.append('media', blob, filename);

  const res = await fetch(url, { method: 'POST', body: formData });
  const data = (await res.json()) as WechatUploadResponse;

  if (data.errcode) {
    throw new Error(`上传图片失败: ${data.errmsg} (${data.errcode})`);
  }

  return data.url!;
}

// 上传封面永久素材（返回 media_id）
export async function uploadCoverImage(imageBuffer: Buffer, filename: string = 'cover.jpg'): Promise<string> {
  const token = await getAccessToken();
  const url = `https://api.weixin.qq.com/cgi-bin/material/add_material?access_token=${token}&type=image`;

  const formData = new FormData();
  const blob = new Blob([new Uint8Array(imageBuffer)]);
  formData.append('media', blob, filename);

  const res = await fetch(url, { method: 'POST', body: formData });
  const data = (await res.json()) as WechatUploadResponse;

  if (data.errcode) {
    throw new Error(`上传封面失败: ${data.errmsg} (${data.errcode})`);
  }

  return data.media_id!;
}

// 创建草稿
export async function createDraft(params: {
  title: string;
  content: string;
  thumbMediaId: string;
  author?: string;
}): Promise<string> {
  const token = await getAccessToken();
  const url = `https://api.weixin.qq.com/cgi-bin/draft/add?access_token=${token}`;

  const body = {
    articles: [{
      title: params.title,
      author: params.author || '',
      content: params.content,
      thumb_media_id: params.thumbMediaId,
      content_source_url: '',
      need_open_comment: 0,
      only_fans_can_comment: 0,
    }],
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as WechatDraftResponse;

  if (data.errcode) {
    throw new Error(`创建草稿失败: ${data.errmsg} (${data.errcode})`);
  }

  return data.media_id!;
}

// 处理 HTML 中的图片：上传到微信图床并替换 URL
export async function processContentImages(html: string): Promise<{
  html: string;
  firstImageUrl: string | null;
}> {
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
  const matches = [...html.matchAll(imgRegex)];

  if (matches.length === 0) {
    return { html, firstImageUrl: null };
  }

  let processedHtml = html;
  let firstImageUrl: string | null = null;

  for (const match of matches) {
    const originalUrl = match[1];

    // 跳过微信图床图片
    if (originalUrl.includes('mmbiz.qpic.cn')) {
      if (!firstImageUrl) firstImageUrl = originalUrl;
      continue;
    }

    // 处理 data URI (base64)
    if (originalUrl.startsWith('data:image/')) {
      try {
        const dataMatch = originalUrl.match(/^data:image\/(\w+);base64,(.+)$/);
        if (dataMatch) {
          const ext = dataMatch[1] === 'png' ? 'png' : 'jpg';
          const buffer = Buffer.from(dataMatch[2], 'base64');
          const wechatUrl = await uploadContentImageBuffer(buffer, `image.${ext}`);
          if (!firstImageUrl) firstImageUrl = wechatUrl;
          processedHtml = processedHtml.split(originalUrl).join(wechatUrl);
        }
      } catch (e) {
        console.error('上传 data URI 图片失败:', e);
      }
      continue;
    }

    // 处理外部 URL
    try {
      const imgRes = await fetch(originalUrl);
      if (!imgRes.ok) continue;
      const buffer = Buffer.from(await imgRes.arrayBuffer());
      const urlObj = new URL(originalUrl);
      const ext = urlObj.pathname.split('.').pop()?.split('?')[0] || 'jpg';
      const wechatUrl = await uploadContentImageBuffer(buffer, `image.${ext}`);
      if (!firstImageUrl) firstImageUrl = wechatUrl;
      processedHtml = processedHtml.split(originalUrl).join(wechatUrl);
    } catch (e) {
      console.error(`上传图片失败 (${originalUrl}):`, e);
    }
  }

  return { html: processedHtml, firstImageUrl };
}
