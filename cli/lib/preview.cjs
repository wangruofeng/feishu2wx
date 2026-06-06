const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const open = require('open');

function buildPreviewPage(html) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>feishu2wx preview</title>
  </head>
  <body style="margin: 0; background: #f5f5f5;">
    <main style="max-width: 677px; margin: 32px auto; padding: 32px 24px; background: #fff;">
${html}
    </main>
  </body>
</html>
`;
}

async function openPreview(html) {
  const file = path.join(os.tmpdir(), `feishu2wx-preview-${Date.now()}.html`);
  fs.writeFileSync(file, buildPreviewPage(html), 'utf8');
  await open(file);
  return file;
}

module.exports = {
  buildPreviewPage,
  openPreview,
};
