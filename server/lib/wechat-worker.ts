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

type SupportedImageExtension = 'jpg' | 'png' | 'gif' | 'webp';
type WechatUploadImage = {
  data: Uint8Array;
  ext: Exclude<SupportedImageExtension, 'webp'>;
};

const WECHAT_UPLOADIMG_MAX_BYTES = 1024 * 1024;

export function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function normalizeImageExtension(value: string | null | undefined): SupportedImageExtension | null {
  const normalized = value?.toLowerCase();
  if (!normalized) return null;
  if (normalized.includes('png')) return 'png';
  if (normalized.includes('jpg') || normalized.includes('jpeg')) return 'jpg';
  if (normalized.includes('gif')) return 'gif';
  if (normalized.includes('webp')) return 'webp';
  return null;
}

function getImageContentType(ext: SupportedImageExtension): string {
  if (ext === 'gif') return 'image/gif';
  if (ext === 'webp') return 'image/webp';
  return ext === 'png' ? 'image/png' : 'image/jpeg';
}

function hasWebpSignature(data: Uint8Array): boolean {
  return data.length >= 12
    && data[0] === 82
    && data[1] === 73
    && data[2] === 70
    && data[3] === 70
    && data[8] === 87
    && data[9] === 69
    && data[10] === 66
    && data[11] === 80;
}

async function normalizeWechatUploadImage(
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

function toBlobPart(data: Uint8Array): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(data.length);
  bytes.set(data);
  return bytes;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await worker(items[currentIndex], currentIndex);
    }
  });

  await Promise.all(workers);
  return results;
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

async function uploadContentImage(data: Uint8Array, filename: string, token: string, contentType: string): Promise<string> {
  const url = `https://api.weixin.qq.com/cgi-bin/media/uploadimg?access_token=${token}`;

  const formData = new FormData();
  const blob = new Blob([toBlobPart(data)], { type: contentType });
  formData.append('media', blob, filename);

  const res = await fetch(url, { method: 'POST', body: formData });
  const result = (await res.json()) as WechatUploadResponse;

  if (result.errcode) {
    throw new Error(`上传图片失败: ${result.errmsg} (${result.errcode})`);
  }

  return result.url!;
}

export async function uploadCoverImage(data: Uint8Array, filename: string, token: string, contentType?: string): Promise<string> {
  const url = `https://api.weixin.qq.com/cgi-bin/material/add_material?access_token=${token}&type=image`;

  const formData = new FormData();
  const blob = new Blob([toBlobPart(data)], contentType ? { type: contentType } : undefined);
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
  const matches = Array.from(html.matchAll(imgRegex));

  if (matches.length === 0) {
    return { html, firstImageUrl: null };
  }

  let processedHtml = html;
  const processedImages = await mapWithConcurrency(matches, 4, async (match) => {
    const originalUrl = match[1];

    // 跳过微信图床图片
    if (originalUrl.includes('mmbiz.qpic.cn')) {
      return { originalUrl, wechatUrl: originalUrl };
    }

    // 处理 data URI (base64)
    if (originalUrl.startsWith('data:image/')) {
      try {
        const dataMatch = originalUrl.match(/^data:image\/(\w+);base64,(.+)$/);
        if (dataMatch) {
          const ext = normalizeImageExtension(dataMatch[1]) || 'jpg';
          const imgData = base64ToUint8Array(dataMatch[2]);
          const uploadImage = await normalizeWechatUploadImage(imgData, ext);
          const wechatUrl = await uploadContentImage(
            uploadImage.data,
            `image.${uploadImage.ext}`,
            token,
            getImageContentType(uploadImage.ext)
          );
          return { originalUrl, wechatUrl };
        }
      } catch (e) {
        console.error('上传 data URI 图片失败:', e);
      }
      return { originalUrl, wechatUrl: null };
    }

    // 处理外部 URL
    try {
      const imgRes = await fetch(originalUrl);
      if (!imgRes.ok) return { originalUrl, wechatUrl: null };
      const imgData = new Uint8Array(await imgRes.arrayBuffer());
      const urlObj = new URL(originalUrl);
      const extFromUrl = urlObj.pathname.split('.').pop();
      const ext = normalizeImageExtension(imgRes.headers.get('content-type'))
        || normalizeImageExtension(extFromUrl)
        || 'jpg';
      const uploadImage = await normalizeWechatUploadImage(imgData, ext);
      const wechatUrl = await uploadContentImage(
        uploadImage.data,
        `image.${uploadImage.ext}`,
        token,
        getImageContentType(uploadImage.ext)
      );
      return { originalUrl, wechatUrl };
    } catch (e) {
      console.error(`上传图片失败 (${originalUrl}):`, e);
      return { originalUrl, wechatUrl: null };
    }
  });

  let firstImageUrl: string | null = null;
  processedImages.forEach(({ originalUrl, wechatUrl }) => {
    if (!wechatUrl) {
      return;
    }

    if (!firstImageUrl) {
      firstImageUrl = wechatUrl;
    }

    processedHtml = processedHtml.split(originalUrl).join(wechatUrl);
  });

  return { html: processedHtml, firstImageUrl };
}
