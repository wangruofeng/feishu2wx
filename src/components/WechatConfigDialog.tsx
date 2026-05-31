import React, { useState } from 'react';
import { Button } from './ui';
import './WechatConfigDialog.css';

interface Props {
  open: boolean;
  configured: boolean;
  onClose: () => void;
  onSave: (appId: string, appSecret: string) => Promise<{ success: boolean; error?: string }>;
  onDelete: () => Promise<void>;
}

const WechatConfigDialog: React.FC<Props> = ({ open, configured, onClose, onSave, onDelete }) => {
  const [appId, setAppId] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  if (!open) return null;

  const handleSave = async () => {
    setSaving(true);
    setMsg(null);
    const result = await onSave(appId, appSecret);
    setSaving(false);
    if (result.success) {
      setMsg({ type: 'ok', text: '保存成功' });
      setTimeout(() => {
        setAppId('');
        setAppSecret('');
        setMsg(null);
        onClose();
      }, 800);
    } else {
      setMsg({ type: 'err', text: result.error || '保存失败' });
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('确定要清除公众号配置吗？')) return;
    setDeleting(true);
    await onDelete();
    setDeleting(false);
    setAppId('');
    setAppSecret('');
    setMsg(null);
    onClose();
  };

  const handleClose = () => {
    setAppId('');
    setAppSecret('');
    setMsg(null);
    onClose();
  };

  return (
    <div className="wc-dialog-overlay" onClick={handleClose}>
      <div className="wc-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="wc-dialog-header">
          <span className="wc-dialog-title">公众号配置</span>
          <Button variant="wcDialogClose" onClick={handleClose}>✕</Button>
        </div>

        <div className="wc-dialog-body">
          <div className="wc-dialog-warning">
            配置信息保存在浏览器本地，仅你自己可见。请前往
            <a href="https://mp.weixin.qq.com" target="_blank" rel="noopener noreferrer"> 微信公众平台 </a>
            获取 AppID 和 AppSecret。
          </div>

          <div className="wc-dialog-field">
            <label className="wc-dialog-label">AppID</label>
            <input
              className="wc-dialog-input"
              type="text"
              placeholder="请输入 AppID"
              value={appId}
              onChange={(e) => setAppId(e.target.value)}
            />
          </div>

          <div className="wc-dialog-field">
            <label className="wc-dialog-label">AppSecret</label>
            <input
              className="wc-dialog-input"
              type="password"
              placeholder="请输入 AppSecret"
              value={appSecret}
              onChange={(e) => setAppSecret(e.target.value)}
            />
          </div>

          {msg && (
            <div className={`wc-dialog-msg wc-dialog-msg--${msg.type}`}>
              {msg.text}
            </div>
          )}
        </div>

        <div className="wc-dialog-footer">
          {configured && (
            <Button
              variant="wcDialogBtnDanger"
              disabled={deleting}
              onClick={handleDelete}
            >
              {deleting ? '清除中...' : '清除配置'}
            </Button>
          )}
          <div className="wc-dialog-footer-right">
            <Button variant="wcDialogBtnCancel" onClick={handleClose}>
              取消
            </Button>
            <Button
              variant="wcDialogBtnSave"
              disabled={saving || !appId || !appSecret}
              onClick={handleSave}
            >
              {saving ? '保存中...' : '保存'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WechatConfigDialog;
