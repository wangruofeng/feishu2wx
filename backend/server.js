const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// 确保上传目录存在
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// 上传设置：图片存储在 public/uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const name = 'img-' + Date.now() + '-' + Math.round(Math.random() * 1E9) + ext;
    cb(null, name);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('只支持图片格式：jpeg, jpg, png, gif, webp'));
    }
  }
});

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadsDir));

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '服务运行正常' });
});

// 图片上传接口
app.post('/api/upload-image', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '没有上传文件' });
  }
  
  const url = `/uploads/${req.file.filename}`;
  res.json({ 
    url,
    filename: req.file.filename,
    size: req.file.size
  });
}, (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: '文件大小超过限制（最大10MB）' });
    }
  }
  res.status(400).json({ error: error.message });
});

// 主题列表接口
app.get('/api/themes', (req, res) => {
  res.json({
    themes: [
      { name: '绿意主题', key: 'green', description: '清新绿色，适合科技类文章' },
      { name: '明亮主题', key: 'light', description: '简洁明亮，适合通用文章' },
      { name: '暗黑主题', key: 'dark', description: '护眼暗色，适合夜间阅读' },
      { name: '经典主题', key: 'classic', description: '经典黑白，适合正式文章' }
    ]
  });
});

app.listen(PORT, () => {
  console.log(`🚀 服务器运行在端口 ${PORT}`);
  console.log(`📁 上传目录: ${uploadsDir}`);
});
