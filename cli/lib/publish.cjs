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
  const { handlePublishDraft } = require('../../server/lib/publish-handler.ts');
  const response = await handlePublishDraft(params);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || '推送失败');
  }

  return data;
}

async function publishMarkdown(options) {
  const coverDataUrl = imageFileToDataUrl(options.cover);
  const content = inlineLocalImages(options.content, options.baseDir || process.cwd());
  return publishDraftWithCredentials({
    title: options.title,
    author: options.author,
    content,
    coverDataUrl,
    appId: options.appId,
    appSecret: options.appSecret,
  });
}

module.exports = {
  inlineLocalImages,
  publishDraftWithCredentials,
  publishMarkdown,
};
