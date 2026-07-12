import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

function tempConfigPath() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'feishu2wx-cli-'));
  return path.join(dir, 'config.json');
}

test('loadConfig returns default theme when config file is missing', () => {
  const { loadConfig, DEFAULT_THEME_CONFIG } = require('./config.cjs');
  const config = loadConfig({ configPath: tempConfigPath(), env: {} });

  assert.deepEqual(config.theme, DEFAULT_THEME_CONFIG);
  assert.equal(config.wechat, undefined);
});

test('loadConfig lets environment credentials override saved credentials', () => {
  const { loadConfig, saveWechatConfig } = require('./config.cjs');
  const configPath = tempConfigPath();

  saveWechatConfig(configPath, 'saved-app-id', 'saved-secret');
  const config = loadConfig({
    configPath,
    env: {
      FEISHU2WX_WECHAT_APP_ID: 'env-app-id',
      FEISHU2WX_WECHAT_APP_SECRET: 'env-secret',
    },
  });

  assert.deepEqual(config.wechat, {
    appId: 'env-app-id',
    appSecret: 'env-secret',
  });
});

test('default theme config matches persisted web theme fields', () => {
  const { DEFAULT_THEME_CONFIG } = require('./config.cjs');

  assert.deepEqual(Object.keys(DEFAULT_THEME_CONFIG).sort(), [
    'alignH1Left',
    'alignH2Left',
    'blockquoteBackgroundMode',
    'blockquoteColorMode',
    'blockquoteHeightMode',
    'codeBlockStyle',
    'font',
    'imageBorderRadius',
    'imageBorderStyle',
    'invertH1',
    'invertH2',
    'showBlockquoteBg',
    'showH1Underline',
    'showHorizontalRule',
    'tableShadow',
    'textAlignMode',
    'theme',
  ]);
  assert.equal(DEFAULT_THEME_CONFIG.alignH1Left, false);
  assert.equal(DEFAULT_THEME_CONFIG.tableShadow, true);
  assert.equal(DEFAULT_THEME_CONFIG.blockquoteBackgroundMode, 'theme');
  assert.equal(DEFAULT_THEME_CONFIG.blockquoteColorMode, 'default');
  assert.equal(DEFAULT_THEME_CONFIG.blockquoteHeightMode, 'loose');
  assert.equal(DEFAULT_THEME_CONFIG.textAlignMode, 'left');
});

test('maskAppId hides the middle of a configured AppID', () => {
  const { maskAppId } = require('./config.cjs');

  assert.equal(maskAppId('wx1234567890abcd'), 'wx12****abcd');
  assert.equal(maskAppId('short'), 's****t');
});

test('initConfigFile creates a default config file', () => {
  const { DEFAULT_THEME_CONFIG, initConfigFile } = require('./config.cjs');
  const configPath = tempConfigPath();

  const result = initConfigFile(configPath);
  const saved = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  assert.equal(result.created, true);
  assert.deepEqual(saved.theme, DEFAULT_THEME_CONFIG);
  assert.equal(saved.wechat, undefined);
});

test('initConfigFile keeps an existing config unless force is set', () => {
  const { initConfigFile, saveWechatConfig } = require('./config.cjs');
  const configPath = tempConfigPath();

  saveWechatConfig(configPath, 'saved-app-id', 'saved-secret');
  const result = initConfigFile(configPath, { appId: 'new-app-id', appSecret: 'new-secret' });
  const saved = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  assert.equal(result.created, false);
  assert.deepEqual(saved.wechat, {
    appId: 'saved-app-id',
    appSecret: 'saved-secret',
  });
});

test('initConfigFile force rewrites config with optional credentials', () => {
  const { initConfigFile, saveWechatConfig } = require('./config.cjs');
  const configPath = tempConfigPath();

  saveWechatConfig(configPath, 'saved-app-id', 'saved-secret');
  const result = initConfigFile(configPath, {
    force: true,
    theme: 'green',
    appId: 'new-app-id',
    appSecret: 'new-secret',
  });
  const saved = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  assert.equal(result.created, true);
  assert.equal(saved.theme.theme, 'teal');
  assert.deepEqual(saved.wechat, {
    appId: 'new-app-id',
    appSecret: 'new-secret',
  });
});

test('getProjectConfigPath resolves config under the current project', () => {
  const { getProjectConfigPath } = require('./config.cjs');
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'feishu2wx-project-'));

  assert.equal(getProjectConfigPath(cwd), path.join(cwd, '.feishu2wx', 'config.json'));
});

test('resolveConfigPath prefers project config when it exists', () => {
  const { getProjectConfigPath, initConfigFile, resolveConfigPath } = require('./config.cjs');
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'feishu2wx-project-'));
  const projectConfigPath = getProjectConfigPath(cwd);

  initConfigFile(projectConfigPath);

  assert.equal(resolveConfigPath({ cwd }), projectConfigPath);
});

test('resolveConfigPath falls back to user config when project config is missing', () => {
  const { DEFAULT_CONFIG_PATH, resolveConfigPath } = require('./config.cjs');
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'feishu2wx-project-'));

  assert.equal(resolveConfigPath({ cwd }), DEFAULT_CONFIG_PATH);
});

test('resolveConfigPath supports explicit project and config path scopes', () => {
  const { getProjectConfigPath, resolveConfigPath } = require('./config.cjs');
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'feishu2wx-project-'));
  const explicitPath = path.join(cwd, 'custom-config.json');

  assert.equal(resolveConfigPath({ cwd, project: true }), getProjectConfigPath(cwd));
  assert.equal(resolveConfigPath({ cwd, configPath: explicitPath }), explicitPath);
});

test('mergeThemeOptions updates the full web-aligned theme config', () => {
  const { DEFAULT_THEME_CONFIG, mergeThemeOptions } = require('./config.cjs');

  const theme = mergeThemeOptions({ theme: DEFAULT_THEME_CONFIG }, {
    theme: 'blue',
    alignH1Left: true,
    tableShadow: false,
  });

  assert.equal(theme.theme, 'blue');
  assert.equal(theme.alignH1Left, true);
  assert.equal(theme.tableShadow, false);
});

test('normalizeThemeConfig drops web-only or unknown fields from old configs', () => {
  const { normalizeThemeConfig } = require('./config.cjs');

  const theme = normalizeThemeConfig({
    theme: 'blue',
    showH1: true,
    darkMode: 'dark',
    unknownField: 'value',
  });

  assert.equal(theme.theme, 'blue');
  assert.equal(theme.showH1Underline, true);
  assert.equal('darkMode' in theme, false);
  assert.equal('unknownField' in theme, false);
});

test('normalizeThemeConfig derives blockquoteBackgroundMode from legacy showBlockquoteBg', () => {
  const { normalizeThemeConfig } = require('./config.cjs');

  assert.equal(normalizeThemeConfig({ showBlockquoteBg: false }).blockquoteBackgroundMode, 'none');
  assert.equal(normalizeThemeConfig({ showBlockquoteBg: true }).blockquoteBackgroundMode, 'theme');
  assert.equal(normalizeThemeConfig({ showBlockquoteBg: false }).showBlockquoteBg, false);
});

test('normalizeThemeConfig lets blockquoteBackgroundMode override legacy showBlockquoteBg', () => {
  const { normalizeThemeConfig } = require('./config.cjs');

  const theme = normalizeThemeConfig({
    showBlockquoteBg: false,
    blockquoteBackgroundMode: 'theme',
  });

  assert.equal(theme.blockquoteBackgroundMode, 'theme');
  assert.equal(theme.showBlockquoteBg, true);
});

test('mergeThemeOptions applies new blockquote and text-align options', () => {
  const { DEFAULT_THEME_CONFIG, mergeThemeOptions } = require('./config.cjs');

  const theme = mergeThemeOptions({ theme: DEFAULT_THEME_CONFIG }, {
    blockquoteBackgroundMode: 'none',
    blockquoteColorMode: 'theme',
    blockquoteHeightMode: 'compact',
    textAlignMode: 'justify',
  });

  assert.equal(theme.blockquoteBackgroundMode, 'none');
  assert.equal(theme.blockquoteColorMode, 'theme');
  assert.equal(theme.blockquoteHeightMode, 'compact');
  assert.equal(theme.textAlignMode, 'justify');
  assert.equal(theme.showBlockquoteBg, false);
});

test('mergeThemeOptions lets legacy showBlockquoteBg control background when new mode is absent', () => {
  const { DEFAULT_THEME_CONFIG, mergeThemeOptions } = require('./config.cjs');

  const off = mergeThemeOptions({ theme: DEFAULT_THEME_CONFIG }, { showBlockquoteBg: false });
  assert.equal(off.blockquoteBackgroundMode, 'none');
  assert.equal(off.showBlockquoteBg, false);

  const on = mergeThemeOptions({ theme: DEFAULT_THEME_CONFIG }, { showBlockquoteBg: true });
  assert.equal(on.blockquoteBackgroundMode, 'theme');
  assert.equal(on.showBlockquoteBg, true);
});

test('mergeThemeOptions prefers blockquoteBackgroundMode over legacy showBlockquoteBg', () => {
  const { DEFAULT_THEME_CONFIG, mergeThemeOptions } = require('./config.cjs');

  const theme = mergeThemeOptions({ theme: DEFAULT_THEME_CONFIG }, {
    showBlockquoteBg: false,
    blockquoteBackgroundMode: 'theme',
  });

  assert.equal(theme.blockquoteBackgroundMode, 'theme');
  assert.equal(theme.showBlockquoteBg, true);
});
