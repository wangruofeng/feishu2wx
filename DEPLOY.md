# GitHub Pages 部署指南

本指南将帮助您将项目部署到 GitHub Pages。

## 📋 前置条件

1. 项目已推送到 GitHub 仓库
2. 拥有仓库的管理员权限
3. Node.js 和 npm 已安装

## 🚀 部署方式

### 方式一：使用 GitHub Actions 自动部署（推荐）

这是最简单且推荐的方式，每次推送到 `main` 分支时会自动部署。

#### 步骤 1：启用 GitHub Pages

1. 打开您的 GitHub 仓库页面
2. 点击 **Settings**（设置）
3. 在左侧菜单中找到并点击 **Pages**
4. 在 **Source** 部分，选择 **GitHub Actions**
5. 保存设置

#### 步骤 2：推送代码

```bash
# 确保所有更改已提交
git add .
git commit -m "配置 GitHub Pages 部署"
git push origin main
```

#### 步骤 3：查看部署状态

1. 在 GitHub 仓库页面，点击 **Actions** 标签页
2. 查看 "Deploy to GitHub Pages" 工作流的执行状态
3. 等待部署完成（通常需要 2-5 分钟）

#### 步骤 4：访问网站

部署成功后，您的网站将可以通过以下地址访问：

```
https://wangruofeng.github.io/feishu2wx_gzh
```

> **注意**：如果您的 GitHub 用户名或仓库名不同，请修改 `frontend/package.json` 中的 `homepage` 字段。

### 方式二：使用 gh-pages 手动部署

如果需要手动控制部署时机，可以使用这种方式。

#### 步骤 1：安装依赖（如果尚未安装）

```bash
cd frontend
npm install
```

#### 步骤 2：执行部署

```bash
npm run deploy
```

这个命令会：

1. 自动构建项目（`npm run build`）
2. 将构建产物部署到 `gh-pages` 分支
3. 推送到 GitHub

#### 步骤 3：启用 GitHub Pages

1. 打开 GitHub 仓库的 **Settings** > **Pages**
2. 在 **Source** 中选择 **Deploy from a branch**
3. 选择 **gh-pages** 分支和 **/ (root)** 目录
4. 点击 **Save**

#### 步骤 4：访问网站

等待几分钟后，访问：

```
https://wangruofeng.github.io/feishu2wx_gzh
```

## ⚙️ 自定义配置

### 修改部署地址

如果您的 GitHub 用户名或仓库名不同，需要修改 `frontend/package.json`：

```json
{
  "homepage": "https://你的用户名.github.io/你的仓库名"
}
```

例如：

```json
{
  "homepage": "https://johndoe.github.io/my-project"
}
```

### 使用自定义域名

1. 在仓库根目录创建 `CNAME` 文件，内容为您的域名：

   ```
   example.com
   ```

2. 在您的域名 DNS 设置中添加 CNAME 记录，指向 `你的用户名.github.io`

3. 修改 `frontend/package.json` 中的 `homepage` 字段为您的域名

## 🔍 故障排查

### 部署失败

1. **检查 GitHub Actions 日志**

   - 进入 **Actions** 标签页
   - 查看失败的工作流日志
   - 根据错误信息进行修复

2. **检查构建是否成功**

   ```bash
   cd frontend
   npm run build
   ```

   如果本地构建失败，需要先修复构建错误

3. **检查权限设置**
   - 确保仓库的 Pages 设置中已启用 GitHub Actions
   - 确保工作流文件 `.github/workflows/deploy.yml` 已提交到仓库

### 网站无法访问

1. **检查部署状态**

   - 在 **Actions** 标签页查看部署是否成功
   - 在 **Settings** > **Pages** 查看部署状态

2. **等待缓存更新**

   - GitHub Pages 可能需要几分钟才能更新
   - 尝试清除浏览器缓存或使用无痕模式访问

3. **检查 URL**
   - 确保 URL 格式正确：`https://用户名.github.io/仓库名`
   - 注意仓库名的大小写必须完全匹配

### 样式或资源加载失败

1. **检查 homepage 配置**

   - 确保 `package.json` 中的 `homepage` 字段正确
   - 重新构建并部署

2. **检查路径问题**
   - 如果使用子路径（如 `/feishu2wx_gzh`），确保所有资源路径都是相对路径

## 📝 更新部署

### 自动更新（GitHub Actions）

每次推送到 `main` 分支时，GitHub Actions 会自动：

1. 检测代码更改
2. 构建项目
3. 部署到 GitHub Pages

只需正常提交和推送代码即可：

```bash
git add .
git commit -m "更新内容"
git push origin main
```

### 手动更新（gh-pages）

如果需要手动触发部署：

```bash
cd frontend
npm run deploy
```

## 🎉 完成

部署成功后，您就可以通过 GitHub Pages 访问您的应用了！

---

**提示**：建议使用 GitHub Actions 方式，因为它更自动化，每次代码更新都会自动部署。
