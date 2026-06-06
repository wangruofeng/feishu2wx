const fs = require('node:fs');
const path = require('node:path');

function readStdin() {
  if (process.stdin.isTTY) {
    return '';
  }

  return fs.readFileSync(0, 'utf8');
}

function stripFrontmatter(text) {
  if (!text.startsWith('---')) return text;
  const end = text.indexOf('---', 3);
  if (end === -1) return text;
  return text.slice(end + 3).replace(/^\n+/, '');
}

function readMarkdownInput(file) {
  let raw;
  if (file) {
    raw = fs.readFileSync(path.resolve(file), 'utf8');
  } else {
    raw = readStdin();
    if (!raw.trim()) {
      throw new Error('请提供 Markdown 文件路径，或通过 stdin 传入 Markdown 内容');
    }
  }

  return stripFrontmatter(raw);
}

function writeOutputFile(file, html) {
  const target = path.resolve(file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, html, 'utf8');
  return target;
}

function imageFileToDataUrl(file) {
  if (!file) return undefined;
  const target = path.resolve(file);
  const ext = path.extname(target).toLowerCase();
  const mime = ext === '.png'
    ? 'image/png'
    : ext === '.gif'
      ? 'image/gif'
      : ext === '.webp'
        ? 'image/webp'
        : 'image/jpeg';
  const base64 = fs.readFileSync(target).toString('base64');
  return `data:${mime};base64,${base64}`;
}

module.exports = {
  imageFileToDataUrl,
  readMarkdownInput,
  writeOutputFile,
};
