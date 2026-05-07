#!/usr/bin/env node

/**
 * 提交前检查脚本
 *
 * 功能：
 * 1. 检查版本号是否需要更新
 * 2. 检查相关的 Markdown 文件是否需要更新
 *
 * 使用方法：
 * node scripts/pre-commit-check.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// 获取 git 根目录
function getGitRoot() {
  try {
    return execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim();
  } catch (error) {
    logError('无法获取 git 根目录');
    process.exit(1);
  }
}

// 获取上次提交的文件内容
function getLastCommittedFile(filePath) {
  try {
    return execSync(`git show HEAD:${filePath}`, { encoding: 'utf-8' });
  } catch (error) {
    // 文件可能是在上次提交之后创建的
    return null;
  }
}

// 比较版本号
function compareVersions(version1, version2) {
  const v1 = version1.split('.').map(Number);
  const v2 = version2.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    if (v1[i] > v2[i]) return 1;
    if (v1[i] < v2[i]) return -1;
  }
  return 0;
}

// 检查版本号是否更新
function checkVersionUpdate() {
  logInfo('\n检查 1: 版本号更新检查');

  const packagePath = path.join(getGitRoot(), 'package.json');
  const currentPackage = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
  const currentVersion = currentPackage.version;

  const lastCommittedPackage = getLastCommittedFile('package.json');
  let lastVersion = '0.0.0';

  if (lastCommittedPackage) {
    lastVersion = JSON.parse(lastCommittedPackage).version;
  }

  log(`  当前版本: ${currentVersion}`);
  log(`  上次提交版本: ${lastVersion}`);

  const comparison = compareVersions(currentVersion, lastVersion);

  if (comparison > 0) {
    logSuccess('版本号已更新');
    return { updated: true, currentVersion, lastVersion };
  } else if (comparison < 0) {
    logWarning('版本号回退了！这可能是错误的。');
    return { updated: false, currentVersion, lastVersion, downgraded: true };
  } else {
    logWarning('版本号未更新');
    return { updated: false, currentVersion, lastVersion };
  }
}

// 获取已修改的文件列表
function getModifiedFiles() {
  try {
    const output = execSync('git diff --name-only HEAD', { encoding: 'utf-8' });
    return output.trim().split('\n').filter(Boolean);
  } catch (error) {
    return [];
  }
}

// 获取已暂存的文件列表
function getStagedFiles() {
  try {
    const output = execSync('git diff --cached --name-only', { encoding: 'utf-8' });
    return output.trim().split('\n').filter(Boolean);
  } catch (error) {
    return [];
  }
}

// 检查是否有代码变更但没有更新文档
function checkDocumentationUpdates() {
  logInfo('\n检查 2: 文档更新检查');

  const modifiedFiles = [...getModifiedFiles(), ...getStagedFiles()];
  const uniqueFiles = [...new Set(modifiedFiles)];

  // 检查是否有源代码变更
  const sourceCodeChanged = uniqueFiles.some(file =>
    file.startsWith('src/') &&
    (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.css'))
  );

  // 检查文档是否已更新
  const docsUpdated = uniqueFiles.some(file =>
    file === 'README.md' ||
    file === 'CLAUDE.md' ||
    file === 'QUICKSTART.md' ||
    file === 'DEPLOY.md'
  );

  if (sourceCodeChanged && !docsUpdated) {
    logWarning('检测到源代码变更，但相关文档未更新');
    log('  请考虑更新以下文档之一：', 'yellow');
    log('    - README.md (项目说明)', 'yellow');
    log('    - CLAUDE.md (Claude Code 项目指南)', 'yellow');
    log('    - QUICKSTART.md (快速开始)', 'yellow');
    log('    - DEPLOY.md (部署文档)', 'yellow');
    return { needsUpdate: true, modifiedFiles: uniqueFiles };
  } else if (sourceCodeChanged && docsUpdated) {
    logSuccess('源代码和文档都已更新');
    return { needsUpdate: false, modifiedFiles: uniqueFiles };
  } else {
    logInfo('没有检测到需要文档更新的源代码变更');
    return { needsUpdate: false, modifiedFiles: uniqueFiles };
  }
}

// 主函数
function main() {
  log('\n🔍 提交前检查', 'blue');
  log('='.repeat(50), 'blue');

  const versionCheck = checkVersionUpdate();
  const docsCheck = checkDocumentationUpdates();

  log('\n' + '='.repeat(50), 'blue');
  log('\n📊 检查结果汇总：\n', 'blue');

  let issues = [];

  if (versionCheck.downgraded) {
    issues.push('版本号回退');
  }

  if (!versionCheck.updated) {
    issues.push('版本号未更新');
  }

  if (docsCheck.needsUpdate) {
    issues.push('文档需要更新');
  }

  if (issues.length === 0) {
    logSuccess('所有检查通过！可以提交了。');
    process.exit(0);
  } else {
    logError('发现以下问题：');
    issues.forEach(issue => log(`  • ${issue}`, 'red'));

    log('\n💡 建议：', 'yellow');
    if (!versionCheck.updated) {
      log('  1. 更新版本号：package.json', 'yellow');
    }
    if (docsCheck.needsUpdate) {
      log('  2. 更新相关文档以反映代码变更', 'yellow');
    }

    log('\n❌ 提交检查失败，请修复上述问题后再提交', 'red');
    process.exit(1);
  }
}

// 运行检查
main();
