#!/usr/bin/env node

const path = require('node:path');
const { Command } = require('commander');
const {
  THEME_OPTIONS,
  clearWechatConfig,
  initConfigFile,
  loadConfig,
  maskAppId,
  mergeThemeOptions,
  resolveConfigPath,
  saveThemeConfig,
  saveWechatConfig,
} = require('./lib/config.cjs');
const { writeClipboard } = require('./lib/clipboard.cjs');
const { readMarkdownInput, writeOutputFile } = require('./lib/io.cjs');
const { openPreview } = require('./lib/preview.cjs');
const { publishMarkdown } = require('./lib/publish.cjs');
const { renderWechatHtml } = require('./lib/render-pipeline.cjs');
const { inlineLocalImages } = require('./lib/publish.cjs');

process.stdout.on('error', (error) => {
  if (error.code === 'EPIPE') {
    process.exit(0);
  }
  throw error;
});

function addThemeOptions(command) {
  return command
    .option('--theme <theme>', '覆盖主题 classic/orange/blue/teal')
    .option('--font <font>', '覆盖字体 key')
    .option('--code-block-style <style>', '代码块样式 classic/modern')
    .option('--image-border-style <style>', '图片样式 border/shadow/default')
    .option('--image-border-radius', '启用图片圆角')
    .option('--no-image-border-radius', '禁用图片圆角')
    .option('--show-h1-underline', '显示 H1 底部横线')
    .option('--no-show-h1-underline', '隐藏 H1 底部横线')
    .option('--invert-h1', '启用 H1 反显')
    .option('--no-invert-h1', '禁用 H1 反显')
    .option('--align-h1-left', 'H1 左对齐')
    .option('--no-align-h1-left', 'H1 居中')
    .option('--invert-h2', '启用 H2 反显')
    .option('--no-invert-h2', '禁用 H2 反显')
    .option('--align-h2-left', 'H2 左对齐')
    .option('--no-align-h2-left', 'H2 居中')
    .option('--show-horizontal-rule', '显示分割线')
    .option('--no-show-horizontal-rule', '隐藏分割线')
    .option('--table-shadow', '显示表格阴影')
    .option('--no-table-shadow', '隐藏表格阴影');
}

function resolveActiveConfigPath(options) {
  return resolveConfigPath({
    configPath: options.config,
    project: options.project,
    user: options.user,
  });
}

function resolveThemeConfig(options) {
  const config = loadConfig({ configPath: resolveActiveConfigPath(options) });
  return mergeThemeOptions(config, options);
}

function printJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function printInitGuide(configPath) {
  process.stdout.write(`配置文件: ${configPath}\n`);
  process.stdout.write('下一步:\n');
  process.stdout.write('  1. feishu2wx auth set --app-id <appid> --app-secret <secret>\n');
  process.stdout.write('  2. feishu2wx theme set blue\n');
  process.stdout.write('  3. feishu2wx render article.md --out article.html\n');
}

async function main() {
  const program = new Command();
  program
    .name('feishu2wx')
    .description('飞书/Markdown 转微信公众号排版 CLI')
    .option('--config <path>', '显式配置文件路径')
    .option('--project', '使用当前项目 .feishu2wx/config.json')
    .option('--user', '使用用户级 ~/.feishu2wx/config.json');

  program.command('init')
    .description('初始化 CLI 配置文件并显示后续引导')
    .option('--force', '覆盖已有配置文件')
    .option('--project', '初始化当前项目级配置文件')
    .option('--user', '初始化用户级配置文件')
    .option('--theme <theme>', '初始主题 classic/orange/blue/teal')
    .option('--app-id <appId>', '初始化时写入微信公众号 AppID')
    .option('--app-secret <appSecret>', '初始化时写入微信公众号 AppSecret')
    .action((options) => {
      const configPath = resolveActiveConfigPath({ ...program.opts(), ...options });
      const result = initConfigFile(configPath, options);
      if (result.created) {
        process.stdout.write('CLI 配置文件已初始化\n');
      } else {
        process.stdout.write('CLI 配置文件已存在，未覆盖。如需重新生成，请加 --force。\n');
      }
      printInitGuide(configPath);
    });

  const auth = program.command('auth').description('管理公众号 AppID/AppSecret');

  auth.command('set')
    .requiredOption('--app-id <appId>', '微信公众号 AppID')
    .requiredOption('--app-secret <appSecret>', '微信公众号 AppSecret')
    .action((options) => {
      saveWechatConfig(resolveActiveConfigPath(program.opts()), options.appId, options.appSecret);
      process.stdout.write('公众号配置已保存\n');
    });

  auth.command('status')
    .action(() => {
      const config = loadConfig({ configPath: resolveActiveConfigPath(program.opts()) });
      if (!config.wechat) {
        process.stdout.write('公众号未配置\n');
        return;
      }
      printJson({
        configured: true,
        appId: maskAppId(config.wechat.appId),
      });
    });

  auth.command('test')
    .action(async () => {
      const config = loadConfig({ configPath: resolveActiveConfigPath(program.opts()) });
      if (!config.wechat) {
        throw new Error('请先配置公众号 AppID 和 AppSecret');
      }
      require('ts-node').register({
        transpileOnly: true,
        skipProject: true,
        compilerOptions: { module: 'commonjs', moduleResolution: 'node', target: 'ES2020', esModuleInterop: true, skipLibCheck: true },
      });
      const { getAccessTokenFromCredentials } = require('../server/lib/wechat-worker.ts');
      await getAccessTokenFromCredentials(config.wechat.appId, config.wechat.appSecret);
      process.stdout.write('公众号凭证校验通过\n');
    });

  auth.command('clear')
    .action(() => {
      clearWechatConfig(resolveActiveConfigPath(program.opts()));
      process.stdout.write('公众号配置已删除\n');
    });

  const theme = program.command('theme').description('管理默认 Markdown 主题');

  theme.command('list')
    .action(() => {
      THEME_OPTIONS.forEach((item) => {
        process.stdout.write(`${item.key}\t${item.name}\n`);
      });
    });

  addThemeOptions(theme.command('set <theme>'))
    .action((themeKey, options) => {
      const saved = saveThemeConfig(resolveActiveConfigPath(program.opts()), {
        ...options,
        theme: themeKey,
      });
      printJson(saved);
    });

  theme.command('status')
    .action(() => {
      const config = loadConfig({ configPath: resolveActiveConfigPath(program.opts()) });
      printJson(config.theme);
    });

  addThemeOptions(program.command('render [file]')
    .description('渲染微信公众号兼容 HTML')
    .option('--copy', '复制 HTML 到系统剪贴板')
    .option('--out <file>', '导出 HTML 文件')
    .option('--preview', '生成临时文件并打开预览'))
    .action(async (file, options) => {
      const markdown = readMarkdownInput(file);
      let html = renderWechatHtml(markdown, resolveThemeConfig({ ...program.opts(), ...options }));
      const baseDir = file ? path.resolve(path.dirname(file)) : process.cwd();
      html = inlineLocalImages(html, baseDir);

      let handled = false;
      if (options.out) {
        const target = writeOutputFile(options.out, html);
        process.stdout.write(`已导出 ${target}\n`);
        handled = true;
      }
      if (options.copy) {
        writeClipboard(html);
        process.stdout.write('已复制 HTML 到剪贴板\n');
        handled = true;
      }
      if (options.preview) {
        const filePath = await openPreview(html);
        process.stdout.write(`已打开预览 ${filePath}\n`);
        handled = true;
      }
      if (!handled) {
        process.stdout.write(`${html}\n`);
      }
    });

  addThemeOptions(program.command('publish [file]')
    .description('推送文章到微信公众号草稿箱')
    .requiredOption('--title <title>', '文章标题')
    .option('--author <author>', '作者')
    .option('--cover <file>', '封面图片文件'))
    .action(async (file, options) => {
      const config = loadConfig({ configPath: resolveActiveConfigPath(program.opts()) });
      if (!config.wechat) {
        throw new Error('请先运行 feishu2wx auth set 配置公众号 AppID 和 AppSecret');
      }

      const markdown = readMarkdownInput(file);
      const themeConfig = resolveThemeConfig({ ...program.opts(), ...options });
      const content = renderWechatHtml(markdown, themeConfig);
      const baseDir = file ? path.resolve(path.dirname(file)) : process.cwd();
      const result = await publishMarkdown({
        ...options,
        content,
        baseDir,
        appId: config.wechat.appId,
        appSecret: config.wechat.appSecret,
      });

      printJson({
        success: true,
        mediaId: result.mediaId,
        message: result.message,
      });
    });

  await program.parseAsync(process.argv);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
