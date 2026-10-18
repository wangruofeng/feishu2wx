import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';
import { createPublishDraftHandler } from './publish-handler';
import { normalizeCoverImage } from './cover-normalizer-node';

const body = { title: '测试文章', content: '<p>正文</p>', appId: 'test-id', appSecret: 'test-secret' };

function service() {
  const uploads: { data: Uint8Array; filename: string; contentType?: string }[] = [];
  return {
    uploads,
    getAccessTokenFromCredentials: async () => 'test-token',
    base64ToUint8Array: (value: string) => new Uint8Array(Buffer.from(value, 'base64')),
    processContentImages: async (html: string) => ({ html, firstImageUrl: null }),
    uploadCoverImage: async (data: Uint8Array, filename: string, _token: string, contentType?: string) => {
      uploads.push({ data, filename, contentType });
      return 'cover-id';
    },
    createDraft: async () => 'draft-id',
  };
}

for (const ext of ['png', 'jpeg', 'gif']) {
  test(`Pages 直接上传 ${ext} 封面并保留 MIME`, async () => {
    const wechat = service();
    const response = await createPublishDraftHandler(wechat)({
      ...body, coverDataUrl: `data:image/${ext};base64,AQID`,
    });
    assert.equal(response.status, 200);
    assert.equal(wechat.uploads[0].contentType, `image/${ext}`);
    assert.deepEqual([...wechat.uploads[0].data], [1, 2, 3]);
  });
}

test('Pages 拒绝 WebP 封面并提示先转换，不加载 Node 图像库', async () => {
  const data = await sharp({ create: { width: 2, height: 2, channels: 3, background: 'red' } }).webp().toBuffer();
  for (const mime of ['webp', 'png']) {
    const wechat = service();
    const response = await createPublishDraftHandler(wechat)({
      ...body, coverDataUrl: `data:image/${mime};base64,${data.toString('base64')}`,
    });
    assert.equal(response.status, 400);
    assert.match(((await response.json()) as { error: string }).error, /WebP.*PNG/);
    assert.equal(wechat.uploads.length, 0);
  }
});

test('Pages 拒绝 SVG 封面，包括 MIME 标错的 SVG', async () => {
  const svg = Buffer.from('\uFEFF  <svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"><rect width="2" height="2"/></svg>');
  for (const mime of ['svg+xml', 'png']) {
    const wechat = service();
    const response = await createPublishDraftHandler(wechat)({
      ...body, coverDataUrl: `data:image/${mime};base64,${svg.toString('base64')}`,
    });
    assert.equal(response.status, 400);
    assert.match(((await response.json()) as { error: string }).error, /SVG.*PNG/);
    assert.equal(wechat.uploads.length, 0);
  }
});

test('Pages 远程 WebP 封面使用相同校验并保留转换提示', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('webp', { headers: { 'content-type': 'image/webp' } }));
  const wechat = service();
  const response = await createPublishDraftHandler(wechat)({ ...body, coverUrl: 'https://example.com/cover.webp' });
  assert.equal(response.status, 400);
  assert.match(((await response.json()) as { error: string }).error, /WebP.*PNG/);
  assert.equal(wechat.uploads.length, 0);
});

test('Node 发布入口注入转换器后，WebP 封面仍转为相同尺寸的 PNG', async () => {
  const data = await sharp({ create: { width: 7, height: 5, channels: 3, background: 'red' } }).webp().toBuffer();
  const wechat = service();
  const response = await createPublishDraftHandler(wechat, normalizeCoverImage)({
    ...body, coverDataUrl: `data:image/webp;base64,${data.toString('base64')}`,
  });
  assert.equal(response.status, 200);
  assert.equal(wechat.uploads[0].filename, 'cover.png');
  assert.equal(wechat.uploads[0].contentType, 'image/png');
  const metadata = await sharp(wechat.uploads[0].data).metadata();
  assert.equal(metadata.format, 'png');
  assert.equal(metadata.width, 7);
  assert.equal(metadata.height, 5);
});

test('Node 远程 SVG 封面仍可去除 BOM 与空白并转换为 PNG', async (t) => {
  const svg = '\uFEFF  \n<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" width="7" height="5"><rect width="7" height="5"/></svg>';
  t.mock.method(globalThis, 'fetch', async () => new Response(svg, { headers: { 'content-type': 'image/svg+xml' } }));
  const wechat = service();
  const response = await createPublishDraftHandler(wechat, normalizeCoverImage)({
    ...body, coverUrl: 'https://example.com/cover.svg',
  });
  assert.equal(response.status, 200);
  assert.equal(wechat.uploads[0].contentType, 'image/png');
  const metadata = await sharp(wechat.uploads[0].data).metadata();
  assert.equal(metadata.format, 'png');
  assert.equal(metadata.width, 7);
});
