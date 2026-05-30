import React, { useState } from 'react';
import { publishToDraft } from '../utils/publishApi';
import { generateCover } from '../utils/coverCanvas';
import './PublishDialog.css';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  htmlContent: string;
}

const PublishDialog: React.FC<Props> = ({ open, onClose, title, htmlContent }) => {
  const [articleTitle, setArticleTitle] = useState(title);
  const [author, setAuthor] = useState(() => localStorage.getItem('feishu2wx_author') || '');
  const [coverUrl, setCoverUrl] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; element: React.ReactNode } | null>(null);

  if (!open) return null;

  const handlePublish = async () => {
    setPublishing(true);
    setMsg(null);

    try {
      // 生成封面
      const coverDataUrl = await generateCover(coverUrl || undefined, htmlContent, articleTitle);

      const result = await publishToDraft({
        title: articleTitle,
        content: htmlContent,
        author: author || undefined,
        coverDataUrl,
      });

      if (result.success) {
        setMsg({
          type: 'ok',
          element: (
            <>
              已推送到草稿箱，<a href="https://mp.weixin.qq.com/" target="_blank" rel="noopener noreferrer">立即查看</a>
            </>
          ),
        });
      } else {
        setMsg({ type: 'err', element: result.error || '推送失败' });
      }
    } catch (e) {
      setMsg({ type: 'err', element: e instanceof Error ? e.message : '推送失败' });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="publish-overlay" onClick={onClose}>
      <div className="publish-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="publish-header">
          <h3>推送到草稿箱</h3>
          <button className="publish-close" onClick={onClose}>&times;</button>
        </div>

        <div className="publish-body">
          <div className="publish-field">
            <label>文章标题</label>
            <input
              className="publish-input"
              type="text"
              placeholder="请输入文章标题，最多 64 个字符"
              maxLength={64}
              value={articleTitle}
              onChange={(e) => setArticleTitle(e.target.value.slice(0, 64))}
            />
          </div>

          <div className="publish-field">
            <label>作者（可选）</label>
            <input
              className="publish-input"
              type="text"
              placeholder="留空则不显示作者"
              value={author}
              onChange={(e) => {
                const val = e.target.value;
                setAuthor(val);
                localStorage.setItem('feishu2wx_author', val);
              }}
            />
          </div>

          <div className="publish-field">
            <label>封面图片 URL（可选）</label>
            <input
              className="publish-input"
              type="text"
              placeholder="留空则自动使用文章首图或生成封面"
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
            />
          </div>

          {msg && (
            <div className={`publish-msg publish-msg--${msg.type}`}>
              {msg.element}
            </div>
          )}
        </div>

        <div className="publish-footer">
          <button className="publish-btn publish-btn--cancel" onClick={onClose}>
            取消
          </button>
          <button
            className="publish-btn publish-btn--primary"
            disabled={publishing}
            onClick={handlePublish}
          >
            {publishing ? '推送中...' : '推送到草稿箱'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PublishDialog;
