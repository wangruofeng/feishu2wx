import type { ConfigStore } from './config-store';

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

export function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function getAccessToken(store: ConfigStore): Promise<string> {
  const config = await store.get();
  if (!config) {
    throw new Error('请先配置公众号 AppID 和 AppSecret');
  }

  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${config.appId}&secret=${config.appSecret}`;
  const res = await fetch(url);
  const data = (await res.json()) as WechatTokenResponse;

  if (data.errcode) {
    throw new Error(`获取 access_token 失败: ${data.errmsg} (${data.errcode})`);
  }

  return data.access_token!;
}

export async function getAccessTokenFromCredentials(appId: string, appSecret: string): Promise<string> {
  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`;
  const res = await fetch(url);
  const data = (await res.json()) as WechatTokenResponse;

  if (data.errcode) {
    throw new Error(`获取 access_token 失败: ${data.errmsg} (${data.errcode})`);
  }

  return data.access_token!;
}

async function uploadContentImage(data: Uint8Array, filename: string, token: string): Promise<string> {
  const url = `https://api.weixin.qq.com/cgi-bin/media/uploadimg?access_token=${token}`;

  const formData = new FormData();
  const blob = new Blob([data]);
  formData.append('media', blob, filename);

  const res = await fetch(url, { method: 'POST', body: formData });
  const result = (await res.json()) as WechatUploadResponse;

  if (result.errcode) {
    throw new Error(`上传图片失败: ${result.errmsg} (${result.errcode})`);
  }

  return result.url!;
}

export async function uploadCoverImage(data: Uint8Array, filename: string, token: string): Promise<string> {
  const url = `https://api.weixin.qq.com/cgi-bin/material/add_material?access_token=${token}&type=image`;

  const formData = new FormData();
  const blob = new Blob([data]);
  formData.append('media', blob, filename);

  const res = await fetch(url, { method: 'POST', body: formData });
  const result = (await res.json()) as WechatUploadResponse;

  if (result.errcode) {
    throw new Error(`上传封面失败: ${result.errmsg} (${result.errcode})`);
  }

  return result.media_id!;
}

export async function createDraft(params: {
  title: string;
  content: string;
  thumbMediaId: string;
  author?: string;
}, token: string): Promise<string> {
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

export async function processContentImages(html: string, token: string): Promise<{
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
          const imgData = base64ToUint8Array(dataMatch[2]);
          const wechatUrl = await uploadContentImage(imgData, `image.${ext}`, token);
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
      const imgData = new Uint8Array(await imgRes.arrayBuffer());
      const urlObj = new URL(originalUrl);
      const ext = urlObj.pathname.split('.').pop()?.split('?')[0] || 'jpg';
      const wechatUrl = await uploadContentImage(imgData, `image.${ext}`, token);
      if (!firstImageUrl) firstImageUrl = wechatUrl;
      processedHtml = processedHtml.split(originalUrl).join(wechatUrl);
    } catch (e) {
      console.error(`上传图片失败 (${originalUrl}):`, e);
    }
  }

  return { html: processedHtml, firstImageUrl };
}
