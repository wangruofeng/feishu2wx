# 飞书文档 → 微信公众号排版器

一个现代化的工具，帮助您快速将飞书文档转换为微信公众号文章格式。

## ✨ 功能特性

- 📋 **飞书文档直接粘贴** - 支持从飞书文档复制内容，自动转换为 Markdown 格式
- ✏️ **实时编辑预览** - 左侧编辑 Markdown 源码，右侧实时预览渲染效果
- 🎨 **多种主题切换** - 内置4种精美主题（绿意、明亮、暗黑、经典）
- 📱 **设备预览切换** - 支持电脑和手机两种预览模式
- 🖼️ **图片上传** - 支持拖拽或点击上传图片
- 📝 **Markdown 工具栏** - 快速插入标题、列表、链接等常见元素
- 📋 **一键复制** - 一键复制格式化后的内容到微信公众号编辑器
- 🎯 **响应式设计** - 完美适配桌面和移动设备

## 🚀 快速开始

### 环境要求

- Node.js >= 14.0.0
- npm >= 6.0.0

### 安装步骤

1. **克隆或下载项目**

```bash
cd feishu2wx
```

2. **安装后端依赖**

```bash
cd backend
npm install
```

3. **安装前端依赖**

```bash
cd ../frontend
npm install
```

4. **启动后端服务**

在 `backend` 目录下运行：

```bash
npm start
```

后端服务将在 `http://localhost:5000` 启动

5. **启动前端应用**

在 `frontend` 目录下运行：

```bash
npm start
```

前端应用将在 `http://localhost:3000` 启动，并自动在浏览器中打开

## 📖 使用说明

### 基本使用

1. **粘贴飞书文档内容**
   - 在飞书文档中选择并复制内容（Ctrl+C / Cmd+C）
   - 在左侧编辑区域粘贴（Ctrl+V / Cmd+V）
   - 系统会自动将 HTML 格式转换为 Markdown

2. **编辑 Markdown**
   - 直接在左侧编辑区域修改 Markdown 源码
   - 右侧会实时显示渲染后的效果

3. **插入图片**
   - 点击"上传图片"按钮选择图片
   - 或直接拖拽图片到编辑区域
   - 图片会自动上传并插入到 Markdown 中

4. **切换主题**
   - 点击顶部主题选择器
   - 选择您喜欢的主题风格

5. **切换预览模式**
   - 点击"电脑"或"手机"按钮
   - 查看不同设备下的显示效果

6. **复制到微信公众号**
   - 编辑完成后，点击"一键复制到微信公众号"按钮
   - 打开微信公众号编辑器
   - 按 Ctrl+V (Windows) 或 Cmd+V (Mac) 粘贴

### Markdown 工具栏

编辑器底部提供了快速插入 Markdown 语法的工具栏：

- **H1, H2, H3** - 插入标题
- **B, I** - 粗体、斜体
- **Code** - 行内代码
- **• List, 1. List** - 无序列表、有序列表
- **Quote** - 引用块
- **Link, Image** - 链接、图片

## 🎨 主题说明

### 绿意主题（默认）
清新绿色风格，适合科技类、自然类文章

### 明亮主题
简洁明亮的蓝色风格，适合通用文章

### 暗黑主题
护眼暗色风格，适合夜间阅读

### 经典主题
经典黑白风格，适合正式文章

## 📁 项目结构

```
feishu2wx/
├── backend/                 # 后端服务
│   ├── server.js           # Express 服务器
│   ├── package.json        # 后端依赖
│   └── public/
│       └── uploads/         # 图片上传目录
├── frontend/               # 前端应用
│   ├── public/             # 静态资源
│   ├── src/
│   │   ├── components/     # React 组件
│   │   ├── utils/          # 工具函数
│   │   ├── styles/         # 样式文件
│   │   ├── App.tsx         # 主应用组件
│   │   └── index.tsx       # 入口文件
│   └── package.json        # 前端依赖
└── README.md               # 项目说明
```

## 🛠️ 技术栈

### 后端
- Node.js
- Express
- Multer (文件上传)

### 前端
- React 18
- TypeScript
- Markdown-it (Markdown 渲染)
- Turndown (HTML 转 Markdown)
- Highlight.js (代码高亮)
- Axios (HTTP 请求)

## 📝 开发说明

### 开发模式

后端开发模式（自动重启）：

```bash
cd backend
npm run dev
```

前端开发模式（热重载）：

```bash
cd frontend
npm start
```

### 构建生产版本

前端构建：

```bash
cd frontend
npm run build
```

构建后的文件在 `frontend/build` 目录中。

## ⚙️ 配置说明

### 后端配置

后端服务默认运行在 `5000` 端口，可通过环境变量修改：

```bash
PORT=5000 node server.js
```

### 前端配置

前端默认运行在 `3000` 端口，代理后端 API 请求到 `http://localhost:5000`。

如需修改，编辑 `frontend/package.json` 中的 `proxy` 字段。

## 🐛 常见问题

### 1. 图片上传失败

- 检查后端服务是否正常运行
- 确认 `backend/public/uploads` 目录存在且有写入权限
- 检查图片大小是否超过 10MB

### 2. 复制到微信公众号失败

- 确保浏览器允许剪贴板访问权限
- 尝试手动选择右侧预览内容并复制
- 某些浏览器可能需要 HTTPS 环境才能使用剪贴板 API

### 3. 飞书内容粘贴后格式不正确

- 确保从飞书文档中完整复制内容
- 某些复杂格式可能需要手动调整
- 可以尝试先粘贴到纯文本编辑器，再复制到本工具

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📮 反馈

如有问题或建议，欢迎反馈。

---

**享受写作的乐趣！** ✨
