const fs = require('node:fs');
const path = require('node:path');
const { imageFileToDataUrl } = require('./io.cjs');

let tsRegistered = false;

function registerTypeScript() {
  if (tsRegistered) return;
  require('ts-node').register({
    transpileOnly: true,
    skipProject: true,
    compilerOptions: {
      module: 'commonjs',
      moduleResolution: 'node',
      esModuleInterop: true,
      target: 'ES2020',
      strict: true,
      skipLibCheck: true,
    },
  });
  tsRegistered = true;
}

function localPathToDataUrl(filePath) {
  const target = path.resolve(filePath);
  if (!fs.existsSync(target)) return null;
  const ext = path.extname(target).toLowerCase();
  const mime = ext === '.png'
    ? 'image/png'
    : ext === '.gif'
      ? 'image/gif'
      : ext === '.webp'
        ? 'image/webp'
        : ext === '.svg'
          ? 'image/svg+xml'
          : 'image/jpeg';
  const base64 = fs.readFileSync(target).toString('base64');
  return `data:${mime};base64,${base64}`;
}

function inlineLocalImages(html, baseDir) {
  const imgRegex = /(<img[^>]+src=["'])([^"']+)(["'])/gi;
  return html.replace(imgRegex, (match, prefix, src, suffix) => {
    if (src.startsWith('data:') || src.startsWith('http://') || src.startsWith('https://')) {
      return match;
    }

    let filePath;
    if (src.startsWith('file://')) {
      filePath = new URL(src).pathname;
    } else {
      filePath = path.resolve(baseDir, src);
    }

    const dataUrl = localPathToDataUrl(filePath);
    if (dataUrl) {
      return `${prefix}${dataUrl}${suffix}`;
    }
    return match;
  });
}

async function publishDraftWithCredentials(params) {
  registerTypeScript();
  const { handlePublishDraft } = require('../../server/lib/publish-node.ts');
  const response = await handlePublishDraft(params);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || '推送失败');
  }

  return data;
}

// CLI 直连服务端函数发布：不走 HTTP handler 的 5M 字符内容校验，
// 多图文章 base64 内联后体积轻松超限（报「标题和内容不能为空」），而 CLI 本无传输瓶颈
async function publishMarkdown(options) {
  registerTypeScript();
  const wechat = require('../../server/lib/wechat-worker.ts');

  const coverDataUrl = imageFileToDataUrl(options.cover);
  const content = inlineLocalImages(options.content, options.baseDir || process.cwd());

  if (!options.title || !options.title.trim() || !content.trim()) {
    throw new Error('标题和内容不能为空');
  }

  const token = await wechat.getAccessTokenFromCredentials(options.appId, options.appSecret);
  const { html: processedContent, firstImageUrl } = await wechat.processContentImages(content, token);

  const coverMatch = coverDataUrl ? coverDataUrl.match(/^data:image\/(\w+);base64,(.+)$/) : null;
  let thumbMediaId;
  if (coverMatch) {
    const ext = coverMatch[1] === 'png' ? 'png' : 'jpg';
    thumbMediaId = await wechat.uploadCoverImage(
      wechat.base64ToUint8Array(coverMatch[2]),
      `cover.${ext}`,
      token,
      ext === 'png' ? 'image/png' : 'image/jpeg'
    );
  } else if (firstImageUrl) {
    const imgRes = await fetch(firstImageUrl);
    if (!imgRes.ok) throw new Error('封面图加载失败，请手动指定封面');
    thumbMediaId = await wechat.uploadCoverImage(new Uint8Array(await imgRes.arrayBuffer()), 'cover.jpg', token);
  } else {
    throw new Error('请提供封面图');
  }

  const mediaId = await wechat.createDraft({
    title: options.title,
    content: processedContent,
    thumbMediaId,
    author: options.author || '',
  }, token);

  return { success: true, mediaId, message: '已推送到公众号草稿箱' };
}

module.exports = {
  inlineLocalImages,
  publishDraftWithCredentials,
  publishMarkdown,
};
