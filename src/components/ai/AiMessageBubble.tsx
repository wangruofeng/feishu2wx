import React, { useMemo, useState } from 'react';
import { Button } from '../ui';
import { renderAiMarkdown } from '../../utils/aiMarkdown';
import { changedArticleHunks } from '../../utils/aiDiff';
import { formatAiMessageTime } from '../../utils/aiChat';
import type { AiChatMessage } from '../../utils/aiChat';

export interface AiLiveState {
  reply: string;
  reasoning: string;
  articleStarted: boolean;
}

interface Props {
  message: AiChatMessage;
  /** 仅流式中的末条 assistant 消息传入 */
  live?: AiLiveState;
  /** 仅最后一条用户消息传入：常显复制/编辑入口 */
  isLastUser?: boolean;
  onApply: (message: AiChatMessage) => void;
  /** 编辑并重新发送（截断该消息之后的历史），面板仅在非流式时传入 */
  onEdit?: (id: string, content: string) => void;
}

/* 两个完整圆角方块叠放（前块填面板背景色遮挡交叠线），消息操作栏拷贝按钮使用 */
const IcoCopy = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <rect x="8.5" y="8.5" width="12" height="12" rx="3" />
    <rect className="ai-ico-copy-front" x="3.5" y="3.5" width="12" height="12" rx="3" />
  </svg>
);

const IcoCopied = () => (
  <svg className="ai-msg-copied-icon" width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

/* 铅笔（笔杆 + 笔尖分隔线），最后一条用户消息的编辑入口使用 */
const IcoEdit = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 20h4L18.5 9.5a2.828 2.828 0 1 0-4-4L4 16v4" />
    <path d="m13.5 6.5 4 4" />
  </svg>
);

/* 文档图标，用户消息附件文件名 chip 使用 */
const IcoFile = () => (
  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
  </svg>
);

const AiMessageBubble: React.FC<Props> = ({ message, live, isLastUser, onApply, onEdit }) => {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState('');

  const isUser = message.role === 'user';
  const isError = message.error === true;
  const isLive = !!live;

  const diffHunks = useMemo(
    () => (message.article && message.requestSource !== undefined
      ? changedArticleHunks(message.requestSource, message.article)
      : null),
    [message.article, message.requestSource]
  );

  const handleCopy = async () => {
    const text = message.article ?? message.content;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      // 剪贴板不可用时静默
    }
  };

  const handleStartEdit = () => {
    setEditDraft(message.content);
    setEditing(true);
  };

  const handleConfirmEdit = () => {
    const text = editDraft.trim();
    if (!text || !onEdit) return;
    setEditing(false);
    onEdit(message.id, text);
  };

  // Esc 需阻止冒泡，避免触发面板全局 Esc（关闭抽屉）
  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleConfirmEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setEditing(false);
    }
  };

  const copyButton = (
    <Button variant="aiIconBtn" className="ai-msg-copy-btn" onClick={handleCopy} title="复制内容" aria-label="复制内容">
      {copied ? <IcoCopied /> : <IcoCopy />}
    </Button>
  );

  const showApply = !isLive && !!message.article;
  const showActions = showApply || (!isUser && !isLive && !!message.content);

  return (
    <div className={`ai-msg ai-msg--${isUser ? 'user' : 'assistant'}${isError ? ' ai-msg--error' : ''}${isUser && isLastUser ? ' ai-msg--last-user' : ''}`}>
      {/* 用户图片 */}
      {!!message.images?.length && (
        <div className="ai-msg-images">
          {message.images.map((image, index) => (
            <img key={index} src={image.previewUrl} alt={`附件 ${index + 1}`} />
          ))}
        </div>
      )}

      {/* 用户文本附件（文件名 chip；内容仅随请求发送，不进气泡正文） */}
      {!!message.attachments?.length && (
        <div className="ai-msg-files">
          {message.attachments.map((file, index) => (
            <span key={index} className="ai-msg-file-chip" title={file.name}>
              <IcoFile />
              {file.name}
            </span>
          ))}
        </div>
      )}

      {isUser && editing ? (
        /* 编辑态：气泡替换为编辑框，确认后重发 */
        <div className="ai-msg-edit">
          <textarea
            className="ai-msg-edit-input"
            value={editDraft}
            onChange={(e) => setEditDraft(e.target.value)}
            onKeyDown={handleEditKeyDown}
            rows={3}
            autoFocus
          />
          <div className="ai-msg-edit-actions">
            <button type="button" className="ai-msg-edit-cancel" onClick={() => setEditing(false)}>取消</button>
            <Button variant="aiApplyBtn" onClick={handleConfirmEdit} disabled={!editDraft.trim()}>发送</Button>
          </div>
        </div>
      ) : (
      <div className="ai-msg-bubble">
        {/* 思考过程：流式时展开，完成后折叠 */}
        {(live?.reasoning || message.reasoning) && (
          <details className={`ai-reasoning${isLive ? ' ai-reasoning--live' : ''}`} open={isLive || undefined}>
            <summary>
              思考过程
              {isLive && (
                <span className="ai-typing"><span /><span /><span /></span>
              )}
            </summary>
            <div className="ai-reasoning-body">{live?.reasoning ?? message.reasoning}</div>
          </details>
        )}

        {/* 正文 */}
        {isUser || isError ? (
          <span>{live?.reply ?? message.content}</span>
        ) : (
          <div
            className="ai-md"
            dangerouslySetInnerHTML={{ __html: renderAiMarkdown(live?.reply ?? message.content) }}
          />
        )}

        {/* 修改稿生成状态 */}
        {isLive && live.articleStarted && (
          <div className="ai-article-status">
            正在生成修改稿…
            <span className="ai-typing"><span /><span /><span /></span>
          </div>
        )}
      </div>
      )}

      {/* 助手操作行 */}
      {showActions && (
        <div className="ai-msg-actions">
          {showApply && (
            <Button variant="aiApplyBtn" onClick={() => onApply(message)}>
              应用修改
            </Button>
          )}
          {message.truncated && (
            <span className="ai-truncated-tip">生成被中断，修改稿可能不完整</span>
          )}
          {copyButton}
          {!isLive && message.createdAt > 0 && (
            <span className="ai-msg-time">{formatAiMessageTime(message.createdAt)}</span>
          )}
        </div>
      )}

      {/* 用户操作行：时间 + 复制，最后一条追加编辑 */}
      {isUser && !editing && !isLive && (
        <div className="ai-msg-actions ai-msg-actions--user">
          {message.createdAt > 0 && (
            <span className="ai-msg-time">{formatAiMessageTime(message.createdAt)}</span>
          )}
          {copyButton}
          {isLastUser && onEdit && (
            <Button variant="aiIconBtn" className="ai-msg-edit-btn" onClick={handleStartEdit} title="编辑消息" aria-label="编辑消息">
              <IcoEdit />
            </Button>
          )}
        </div>
      )}

      {/* 查看变更 */}
      {showApply && (
        <details className="ai-diff">
          <summary>查看变更</summary>
          <div className="ai-diff-body">
            {message.requestSource === undefined ? (
              <span className="ai-diff-empty">缺少原文，无法对比变更</span>
            ) : !diffHunks?.length ? (
              <span className="ai-diff-empty">没有文字变更</span>
            ) : (
              diffHunks.map((hunk, hunkIndex) => (
                <pre key={hunkIndex} className="ai-diff-hunk">
                  {hunk.map((line, lineIndex) => (
                    <span key={lineIndex} className={`ai-diff-line ai-diff-line--${line.type}`}>
                      {line.type === 'eq' ? '  ' : line.type === 'del' ? '- ' : '+ '}
                      {line.text}
                    </span>
                  ))}
                </pre>
              ))
            )}
          </div>
        </details>
      )}
    </div>
  );
};

export default AiMessageBubble;
