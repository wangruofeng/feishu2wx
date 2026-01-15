# 快速启动指南

## 方式一：使用启动脚本（推荐）

```bash
# 运行启动脚本
./start.sh
```

然后按照脚本提示，在两个终端中分别启动后端和前端。

## 方式二：手动启动

### 1. 安装依赖

```bash
# 安装后端依赖
cd backend
npm install

# 安装前端依赖
cd ../frontend
npm install
```

### 2. 启动服务

**终端 1 - 启动后端：**
```bash
cd backend
npm start
```
后端将在 `http://localhost:5000` 运行

**终端 2 - 启动前端：**
```bash
cd frontend
npm start
```
前端将在 `http://localhost:3000` 运行，浏览器会自动打开

## 方式三：使用 concurrently（同时启动）

```bash
# 安装 concurrently（如果还没有）
npm install -g concurrently

# 在项目根目录运行
npm run dev
```

或者：

```bash
# 安装项目根目录的依赖
npm install

# 运行开发模式
npm run dev
```

## 验证安装

1. 打开浏览器访问 `http://localhost:3000`
2. 应该能看到应用界面
3. 尝试粘贴一些内容到左侧编辑器
4. 右侧应该实时显示预览效果

## 常见问题

### 端口被占用

如果 3000 或 5000 端口被占用，可以：

**修改后端端口：**
```bash
PORT=5001 cd backend && npm start
```

**修改前端端口：**
编辑 `frontend/package.json`，在 `scripts.start` 中添加：
```json
"start": "PORT=3001 react-scripts start"
```

### 依赖安装失败

尝试清除缓存后重新安装：
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### 图片上传失败

确保 `backend/public/uploads` 目录存在且有写入权限：
```bash
mkdir -p backend/public/uploads
chmod 755 backend/public/uploads
```
