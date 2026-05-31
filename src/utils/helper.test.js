import { convertWebpToPng } from './helper';

function mockCanvasRasterizer() {
  const originalImage = global.Image;
  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  const originalToDataUrl = HTMLCanvasElement.prototype.toDataURL;

  global.Image = class {
    set src(_value) {
      setTimeout(() => this.onload && this.onload());
    }
  };
  HTMLCanvasElement.prototype.getContext = jest.fn(() => ({ drawImage: jest.fn() }));
  HTMLCanvasElement.prototype.toDataURL = jest.fn(() => 'data:image/png;base64,mock-png');

  return () => {
    global.Image = originalImage;
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    HTMLCanvasElement.prototype.toDataURL = originalToDataUrl;
  };
}

function bytes(...values) {
  return new Uint8Array(values).buffer;
}

test('converts webp content even when the image url ends with png', async () => {
  const restore = mockCanvasRasterizer();
  global.fetch = jest.fn(async () => ({
    ok: true,
    arrayBuffer: async () => bytes(82, 73, 70, 70, 1, 0, 0, 0, 87, 69, 66, 80),
  }));

  try {
    const html = await convertWebpToPng('<p><img src="https://example.com/image.png" alt=""></p>');

    expect(html).toContain('src="data:image/png;base64,mock-png"');
  } finally {
    restore();
    delete global.fetch;
  }
});

test('keeps real png urls unchanged', async () => {
  const restore = mockCanvasRasterizer();
  global.fetch = jest.fn(async () => ({
    ok: true,
    arrayBuffer: async () => bytes(137, 80, 78, 71, 13, 10, 26, 10),
  }));

  try {
    const html = await convertWebpToPng('<p><img src="https://example.com/image.png" alt=""></p>');

    expect(html).toContain('src="https://example.com/image.png"');
    expect(HTMLCanvasElement.prototype.toDataURL).not.toHaveBeenCalled();
  } finally {
    restore();
    delete global.fetch;
  }
});
