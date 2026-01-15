import React from 'react';
import './Toolbar.css';

interface Props {
  markdown: string;
  setMarkdown: (md: string) => void;
  onCopyToWeChat: () => void;
  isCopying: boolean;
}

const Toolbar: React.FC<Props> = ({ markdown, setMarkdown, onCopyToWeChat, isCopying }) => {
  const handleClear = () => {
    if (window.confirm('确定要清空所有内容吗？')) {
      setMarkdown('');
    }
  };

  const handleLoadExample = () => {
    const example = `# 欢迎使用飞书文档转微信公众号排版器

这是一篇示例文章，展示了常见的 Markdown 语法。

## 标题示例

### 三级标题

**粗体文本** 和 *斜体文本*

## 列表示例

### 无序列表
- 项目 1
- 项目 2
  - 子项目 2.1
  - 子项目 2.2
- 项目 3

### 有序列表
1. 第一项
2. 第二项
3. 第三项

## 引用示例

> 这是一段引用文字
> 可以包含多行内容

## 代码示例

行内代码：\`console.log('Hello World')\`

代码块：

\`\`\`javascript
function greet(name) {
  return \`Hello, \${name}!\`;
}
\`\`\`

## 链接和图片

[这是一个链接](https://example.com)

![示例图片](https://via.placeholder.com/400x200)

## 表格示例

| 列1 | 列2 | 列3 |
|-----|-----|-----|
| 数据1 | 数据2 | 数据3 |
| 数据4 | 数据5 | 数据6 |

---

感谢使用！`;
    setMarkdown(example);
  };

  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <button className="toolbar-btn" onClick={handleLoadExample}>
          📄 加载示例
        </button>
        <button className="toolbar-btn" onClick={handleClear}>
          🗑️ 清空
        </button>
      </div>
      <div className="toolbar-right">
        <button
          className="toolbar-btn toolbar-btn-primary"
          onClick={onCopyToWeChat}
          disabled={isCopying || !markdown.trim()}
        >
          {isCopying ? '⏳ 复制中...' : '📋 一键复制到微信公众号'}
        </button>
      </div>
    </div>
  );
};

export default Toolbar;
