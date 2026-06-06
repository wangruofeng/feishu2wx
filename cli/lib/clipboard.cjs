const { spawnSync } = require('node:child_process');

function writeClipboard(text) {
  const platform = process.platform;
  const command = platform === 'darwin'
    ? ['pbcopy']
    : platform === 'win32'
      ? ['clip']
      : ['xclip', '-selection', 'clipboard'];

  const result = spawnSync(command[0], command.slice(1), {
    input: text,
    encoding: 'utf8',
  });

  if (result.error || result.status !== 0) {
    throw new Error('写入剪贴板失败，请改用 --out 导出 HTML 文件');
  }
}

module.exports = {
  writeClipboard,
};
