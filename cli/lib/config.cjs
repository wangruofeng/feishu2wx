const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const DEFAULT_CONFIG_PATH = path.join(os.homedir(), '.feishu2wx', 'config.json');
const PROJECT_CONFIG_RELATIVE_PATH = path.join('.feishu2wx', 'config.json');

const THEME_OPTIONS = [
  { key: 'classic', name: '经典' },
  { key: 'orange', name: '橙色' },
  { key: 'blue', name: '蓝色' },
  { key: 'teal', name: '青绿' },
];

const DEFAULT_THEME_CONFIG = {
  theme: 'classic',
  font: 'default',
  codeBlockStyle: 'modern',
  imageBorderStyle: 'border',
  imageBorderRadius: false,
  showBlockquoteBg: true,
  showH1Underline: false,
  invertH1: false,
  alignH1Left: false,
  invertH2: false,
  alignH2Left: false,
  showHorizontalRule: true,
  tableShadow: true,
};

function normalizeThemeKey(theme) {
  if (!theme) return DEFAULT_THEME_CONFIG.theme;
  const normalized = theme === 'green' ? 'teal' : theme;
  return THEME_OPTIONS.some((item) => item.key === normalized)
    ? normalized
    : DEFAULT_THEME_CONFIG.theme;
}

function readConfigFile(configPath = DEFAULT_CONFIG_PATH) {
  if (!fs.existsSync(configPath)) {
    return {};
  }

  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch {
    return {};
  }
}

function writeConfigFile(configPath, config) {
  fs.mkdirSync(path.dirname(configPath), { recursive: true, mode: 0o700 });
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, {
    mode: 0o600,
  });
}

function getProjectConfigPath(cwd = process.cwd()) {
  return path.join(cwd, PROJECT_CONFIG_RELATIVE_PATH);
}

function resolveConfigPath(options = {}) {
  const cwd = options.cwd || process.cwd();
  if (options.configPath) {
    return path.resolve(cwd, options.configPath);
  }
  if (options.project && options.user) {
    throw new Error('--project 和 --user 不能同时使用');
  }
  if (options.project) {
    return getProjectConfigPath(cwd);
  }
  if (options.user) {
    return DEFAULT_CONFIG_PATH;
  }

  const projectConfigPath = getProjectConfigPath(cwd);
  return fs.existsSync(projectConfigPath) ? projectConfigPath : DEFAULT_CONFIG_PATH;
}

function normalizeThemeConfig(theme = {}) {
  return {
    theme: normalizeThemeKey(theme.theme),
    font: theme.font || DEFAULT_THEME_CONFIG.font,
    codeBlockStyle: theme.codeBlockStyle === 'classic' ? 'classic' : (theme.codeBlockStyle || DEFAULT_THEME_CONFIG.codeBlockStyle),
    imageBorderStyle: ['border', 'shadow', 'default'].includes(theme.imageBorderStyle)
      ? theme.imageBorderStyle
      : DEFAULT_THEME_CONFIG.imageBorderStyle,
    imageBorderRadius: Boolean(theme.imageBorderRadius),
    showBlockquoteBg: theme.showBlockquoteBg !== false,
    showH1Underline: Boolean(theme.showH1Underline ?? theme.showH1),
    invertH1: Boolean(theme.invertH1),
    alignH1Left: Boolean(theme.alignH1Left),
    invertH2: Boolean(theme.invertH2),
    alignH2Left: Boolean(theme.alignH2Left),
    showHorizontalRule: theme.showHorizontalRule !== false,
    tableShadow: theme.tableShadow !== false,
  };
}

function loadConfig(options = {}) {
  const configPath = options.configPath || DEFAULT_CONFIG_PATH;
  const env = options.env || process.env;
  const saved = readConfigFile(configPath);
  const theme = normalizeThemeConfig({
    ...(saved.theme || {}),
    ...(env.FEISHU2WX_THEME ? { theme: env.FEISHU2WX_THEME } : {}),
  });

  const savedWechat = saved.wechat;
  const envWechat = env.FEISHU2WX_WECHAT_APP_ID && env.FEISHU2WX_WECHAT_APP_SECRET
    ? {
        appId: env.FEISHU2WX_WECHAT_APP_ID,
        appSecret: env.FEISHU2WX_WECHAT_APP_SECRET,
      }
    : undefined;

  return {
    theme,
    wechat: envWechat || savedWechat,
  };
}

function saveWechatConfig(configPath, appId, appSecret) {
  const saved = readConfigFile(configPath);
  writeConfigFile(configPath, {
    ...saved,
    wechat: { appId, appSecret },
  });
}

function clearWechatConfig(configPath = DEFAULT_CONFIG_PATH) {
  const saved = readConfigFile(configPath);
  delete saved.wechat;
  writeConfigFile(configPath, saved);
}

function saveThemeConfig(configPath, themePatch) {
  const saved = readConfigFile(configPath);
  const theme = normalizeThemeConfig({
    ...(saved.theme || {}),
    ...themePatch,
  });

  writeConfigFile(configPath, {
    ...saved,
    theme,
  });
  return theme;
}

function initConfigFile(configPath = DEFAULT_CONFIG_PATH, options = {}) {
  const exists = fs.existsSync(configPath);
  if (exists && !options.force) {
    return {
      created: false,
      configPath,
      config: loadConfig({ configPath, env: {} }),
    };
  }

  if ((options.appId && !options.appSecret) || (!options.appId && options.appSecret)) {
    throw new Error('同时提供 --app-id 和 --app-secret，或都不提供');
  }

  const config = {
    theme: normalizeThemeConfig({ theme: options.theme }),
  };

  if (options.appId && options.appSecret) {
    config.wechat = {
      appId: options.appId,
      appSecret: options.appSecret,
    };
  }

  writeConfigFile(configPath, config);

  return {
    created: true,
    configPath,
    config,
  };
}

function maskAppId(appId) {
  if (!appId) return '';
  if (appId.length <= 2) return '*'.repeat(appId.length);
  if (appId.length <= 8) return `${appId.slice(0, 1)}****${appId.slice(-1)}`;
  return `${appId.slice(0, 4)}****${appId.slice(-4)}`;
}

function mergeThemeOptions(config, options = {}) {
  const patch = {};
  if (options.theme) patch.theme = options.theme;
  if (options.font) patch.font = options.font;
  if (options.codeBlockStyle) patch.codeBlockStyle = options.codeBlockStyle;
  if (options.imageBorderStyle) patch.imageBorderStyle = options.imageBorderStyle;
  if (typeof options.imageBorderRadius === 'boolean') patch.imageBorderRadius = options.imageBorderRadius;
  if (typeof options.showBlockquoteBg === 'boolean') patch.showBlockquoteBg = options.showBlockquoteBg;
  if (typeof options.showH1Underline === 'boolean') patch.showH1Underline = options.showH1Underline;
  if (typeof options.invertH1 === 'boolean') patch.invertH1 = options.invertH1;
  if (typeof options.alignH1Left === 'boolean') patch.alignH1Left = options.alignH1Left;
  if (typeof options.invertH2 === 'boolean') patch.invertH2 = options.invertH2;
  if (typeof options.alignH2Left === 'boolean') patch.alignH2Left = options.alignH2Left;
  if (typeof options.showHorizontalRule === 'boolean') patch.showHorizontalRule = options.showHorizontalRule;
  if (typeof options.tableShadow === 'boolean') patch.tableShadow = options.tableShadow;
  return normalizeThemeConfig({ ...config.theme, ...patch });
}

module.exports = {
  DEFAULT_CONFIG_PATH,
  PROJECT_CONFIG_RELATIVE_PATH,
  DEFAULT_THEME_CONFIG,
  THEME_OPTIONS,
  clearWechatConfig,
  getProjectConfigPath,
  initConfigFile,
  loadConfig,
  maskAppId,
  mergeThemeOptions,
  normalizeThemeConfig,
  normalizeThemeKey,
  resolveConfigPath,
  saveThemeConfig,
  saveWechatConfig,
};
