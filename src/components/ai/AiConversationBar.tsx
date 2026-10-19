import { confirmAction } from '../ui/ConfirmDialog';
import React, { useEffect, useState } from 'react';
import Button from '../ui/Button';
import type { AiConversationStore } from '../../utils/aiConversations';

interface Props {
  store: AiConversationStore;
  generatingIds: string[];
  onSelect: (id: string) => void;
  onCreate: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}

const AiConversationBar: React.FC<Props> = ({ store, generatingIds, onSelect, onCreate, onRename, onDelete }) => {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const active = store.conversations.find(c => c.id === store.activeId)!;
  useEffect(() => { setEditing(false); }, [store.activeId]);
  const saveTitle = () => {
    if (title.trim()) onRename(active.id, title.trim().slice(0, 100));
    setEditing(false);
  };
  return (
    <div className="ai-conversation-bar">
      {editing ? (
        <input aria-label="会话名称" className="ai-conversation-title-input" value={title} maxLength={100} autoFocus
          onChange={e => setTitle(e.target.value)} onBlur={saveTitle}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); saveTitle(); }
            if (e.key === 'Escape') { e.stopPropagation(); setEditing(false); }
          }} />
      ) : (
        <select aria-label="切换会话" value={store.activeId} onChange={e => onSelect(e.target.value)}
          onKeyDown={e => { if (e.key === 'Escape') e.stopPropagation(); }}>
          {[...store.conversations].sort((a, b) => b.updatedAt - a.updatedAt).map(c => (
            <option key={c.id} value={c.id}>{c.title}{generatingIds.includes(c.id) ? ' · 生成中' : ''}</option>
          ))}
        </select>
      )}
      <Button variant="aiIconBtn" onClick={onCreate} aria-label="新建会话" title="新建会话">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
      </Button>
      <Button variant="aiIconBtn" onClick={() => { setTitle(active.title); setEditing(true); }} aria-label="重命名会话" title="重命名会话">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"><path d="m4 16 12-12 4 4L8 20H4v-4Z" /></svg>
      </Button>
      <Button variant="aiIconBtn" onClick={async () => {
        if (await confirmAction(`确定删除「${active.title}」会话及其记录吗？${generatingIds.includes(active.id) ? '正在生成的回复也会停止。' : ''}`)) onDelete(active.id);
      }} aria-label="删除会话" title="删除会话">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M9 6V4h6v2M5 6l1 15h12l1-15M10 10v7M14 10v7" /></svg>
      </Button>
    </div>
  );
};
export default AiConversationBar;
