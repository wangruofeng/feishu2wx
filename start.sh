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
echo "启动前端应用:"
echo "  cd frontend && npm start"
echo ""
echo "前端应用将在 http://localhost:3000 启动，浏览器会自动打开"
echo ""
