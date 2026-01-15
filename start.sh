#!/bin/bash

# 飞书文档转微信公众号排版器 - 启动脚本

echo "🚀 启动飞书文档转微信公众号排版器..."
echo ""

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未检测到 Node.js，请先安装 Node.js (>= 14.0.0)"
    exit 1
fi

# 检查 npm 是否安装
if ! command -v npm &> /dev/null; then
    echo "❌ 错误: 未检测到 npm，请先安装 npm"
    exit 1
fi

echo "✅ Node.js 版本: $(node -v)"
echo "✅ npm 版本: $(npm -v)"
echo ""

# 安装后端依赖
if [ ! -d "backend/node_modules" ]; then
    echo "📦 正在安装后端依赖..."
    cd backend
    npm install
    cd ..
    echo "✅ 后端依赖安装完成"
else
    echo "✅ 后端依赖已存在"
fi

# 安装前端依赖
if [ ! -d "frontend/node_modules" ]; then
    echo "📦 正在安装前端依赖..."
    cd frontend
    npm install
    cd ..
    echo "✅ 前端依赖安装完成"
else
    echo "✅ 前端依赖已存在"
fi

echo ""
echo "🎉 准备就绪！"
echo ""
echo "请分别在两个终端窗口中运行："
echo ""
echo "终端 1 - 启动后端服务:"
echo "  cd backend && npm start"
echo ""
echo "终端 2 - 启动前端应用:"
echo "  cd frontend && npm start"
echo ""
echo "或者使用以下命令同时启动（需要安装 concurrently）:"
echo "  npm install -g concurrently"
echo "  concurrently \"cd backend && npm start\" \"cd frontend && npm start\""
echo ""
