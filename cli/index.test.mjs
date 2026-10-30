import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { version } = require('../package.json');
const cliPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'index.js');

function runCli(args) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    encoding: 'utf8',
  });
}

test('feishu2wx -v prints package.json version', () => {
  const result = runCli(['-v']);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), version);
});

test('feishu2wx --version prints package.json version', () => {
  const result = runCli(['--version']);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), version);
});


// 独立配置与发布替身，测试不读取真实凭证、不请求微信，也不修改用户配置。
function isolatedCli(t, saved = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'feishu2wx-cli-footnotes-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const configDir = path.join(directory, '.feishu2wx');
  fs.mkdirSync(configDir);
  const configFile = path.join(configDir, 'config.json');
  fs.writeFileSync(configFile, JSON.stringify(saved));
  const capture = path.join(directory, 'publish.html');
  const preload = path.join(directory, 'preload.cjs');
  const publishModule = path.join(path.dirname(cliPath), 'lib/publish.cjs');
  fs.writeFileSync(preload, `
    require('node:os').homedir = () => ${JSON.stringify(directory)};
    require(${JSON.stringify(publishModule)}).publishMarkdown = async (options) => {
      require('node:fs').writeFileSync(${JSON.stringify(capture)}, options.content);
      return { mediaId: 'offline-draft', message: 'offline' };
    };
  `);
  return {
    configFile,
    capture,
    run: (args) => spawnSync(process.execPath, ['--require', preload, cliPath, ...args], {
      encoding: 'utf8',
      input: '[资料](https://example.com/report)',
    }),
  };
}

test('CLI link footnotes configuration can be saved, inspected and rejected without corrupting config', (t) => {
  const cli = isolatedCli(t, { author: '作者', wechatLinkAutoAdapt: false });
  assert.equal(cli.run(['wechat-link', 'footnotes', 'on']).status, 0);
  const status = cli.run(['wechat-link', 'status']);
  assert.equal(status.status, 0, status.stderr);
  assert.equal(JSON.parse(status.stdout).wechatLinkFootnotes, true);
  assert.equal(JSON.parse(status.stdout).wechatLinkAutoAdapt, false);
  assert.equal(JSON.parse(fs.readFileSync(cli.configFile)).author, '作者');
  const before = fs.readFileSync(cli.configFile, 'utf8');
  assert.notEqual(cli.run(['wechat-link', 'footnotes', 'invalid']).status, 0);
  assert.equal(fs.readFileSync(cli.configFile, 'utf8'), before);
  assert.equal(cli.run(['wechat-link', 'footnotes', 'off']).status, 0);
  assert.equal(JSON.parse(fs.readFileSync(cli.configFile)).wechatLinkFootnotes, false);
});

test('CLI render link footnotes flags override saved defaults in both directions', (t) => {
  const cli = isolatedCli(t, { wechatLinkFootnotes: true });
  const enabled = cli.run(['render']);
  assert.equal(enabled.status, 0, enabled.stderr);
  assert.match(enabled.stdout, /class="footnotes"/);
  const disabled = cli.run(['render', '--no-link-footnotes']);
  assert.equal(disabled.status, 0, disabled.stderr);
  assert.doesNotMatch(disabled.stdout, /class="footnotes"/);
  assert.match(disabled.stdout, /资料: https:\/\/example.com\/report/);
  fs.writeFileSync(cli.configFile, JSON.stringify({ wechatLinkFootnotes: false }));
  const explicit = cli.run(['render', '--link-footnotes']);
  assert.equal(explicit.status, 0, explicit.stderr);
  assert.match(explicit.stdout, /class="footnotes"/);
  assert.equal(JSON.parse(fs.readFileSync(cli.configFile)).wechatLinkFootnotes, false);
});

test('CLI publish uses the same link footnotes pipeline without contacting WeChat', (t) => {
  const cli = isolatedCli(t, { wechat: { appId: 'test-id', appSecret: 'test-secret' } });
  const enabled = cli.run(['publish', '--title', '测试文章', '--link-footnotes']);
  assert.equal(enabled.status, 0, enabled.stderr);
  assert.equal(JSON.parse(enabled.stdout).mediaId, 'offline-draft');
  assert.match(fs.readFileSync(cli.capture, 'utf8'), /class="footnotes"/);
  const disabled = cli.run(['publish', '--title', '测试文章', '--no-link-footnotes']);
  assert.equal(disabled.status, 0, disabled.stderr);
  assert.doesNotMatch(fs.readFileSync(cli.capture, 'utf8'), /class="footnotes"/);
});
