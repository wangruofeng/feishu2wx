import { getImageFileMimeType, isImageAttachmentFile, readImageFileAsMarkdown } from './imageAttachment';

describe('getImageFileMimeType', () => {
  test('识别无 MIME 或 MIME 错标的 .svg 文件（后缀白名单优先）', () => {
    expect(getImageFileMimeType(new File(['<svg/>'], 'a.svg', { type: '' }))).toBe('image/svg+xml');
    expect(getImageFileMimeType(new File(['<svg/>'], 'b.SVG', { type: 'image/png' }))).toBe('image/svg+xml');
  });

  test('后缀不在白名单时回退 file.type', () => {
    expect(getImageFileMimeType(new File(['x'], 'photo.heic', { type: 'image/heic' }))).toBe('image/heic');
  });

  test('非图片文件返回 null', () => {
    expect(getImageFileMimeType(new File(['# hi'], 'doc.md', { type: 'text/markdown' }))).toBeNull();
    expect(getImageFileMimeType(new File(['x'], 'unknown', { type: '' }))).toBeNull();
    expect(isImageAttachmentFile(new File(['x'], 'unknown', { type: '' }))).toBe(false);
  });
});

describe('readImageFileAsMarkdown', () => {
  test('读取 SVG 文件为空 alt 的 data URI 图片语法', async () => {
    const file = new File(['<svg xmlns="http://www.w3.org/2000/svg"></svg>'], 'favicon-edited.svg', { type: 'image/png' });
    const markdown = await readImageFileAsMarkdown(file);

    expect(markdown).toMatch(/^!\[\]\(data:image\/svg\+xml;base64,[A-Za-z0-9+/=]+\)$/);
  });

  test('超过 2MB 的图片跳过', async () => {
    const oversized = { name: 'big.png', size: 3 * 1024 * 1024, type: 'image/png' };

    expect(await readImageFileAsMarkdown(oversized)).toBeNull();
  });
});
