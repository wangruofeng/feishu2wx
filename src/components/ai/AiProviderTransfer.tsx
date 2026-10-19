import { confirmAction } from '../ui/ConfirmDialog';
import React, { useEffect, useId, useRef, useState } from 'react';
import type { AiProviderSettings } from '../../utils/aiChat';
import { AI_PROVIDER_CONFIG_MAX_BYTES, applyAiProviderImport, exportAiProviderConfig, importAiProviderConfig } from '../../utils/aiProviderConfig';
import type { AiProviderImportMode } from '../../utils/aiProviderConfig';
import Button from '../ui/Button';
import './AiProviderTools.css';

interface Props {
  settings: AiProviderSettings;
  cloud: boolean;
  disabled: boolean;
  onChange: (settings: AiProviderSettings) => void;
}

const AiProviderTransfer: React.FC<Props> = (props) => {
  const [mode, setMode] = useState<AiProviderImportMode>('append');
  const [reading, setReading] = useState(false);
  const [feedback, setFeedback] = useState<{ error: boolean; text: string } | null>(null);
  const inputId = useId();
  const latest = useRef(props);
  latest.current = props;
  const readerRef = useRef<FileReader | null>(null);
  useEffect(() => () => { readerRef.current?.abort(); }, []);

  const importFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || props.disabled || reading) return;
    setFeedback(null);
    if (file.size > AI_PROVIDER_CONFIG_MAX_BYTES) {
      setFeedback({ error: true, text: '配置文件不能超过 1 MiB。' });
      return;
    }
    const reader = new FileReader();
    readerRef.current = reader;
    setReading(true);
    reader.onerror = () => {
      setReading(false);
      setFeedback({ error: true, text: '文件读取失败，请重新选择文件。' });
    };
    reader.onload = async () => {
      setReading(false);
      try {
        const imported = importAiProviderConfig(String(reader.result ?? ''));
        if (latest.current.disabled) return;
        if (mode === 'replace' && !await confirmAction('完全覆盖将替换当前全部供应商和模型配置，确定继续吗？')) return;
        latest.current.onChange(applyAiProviderImport(latest.current.settings, imported, mode));
        setFeedback({ error: false, text: `已${mode === 'append' ? '新增' : '导入并覆盖'} ${imported.providers.length} 个供应商。` });
      } catch (error) {
        setFeedback({ error: true, text: error instanceof Error ? error.message : '导入失败，请检查配置文件。' });
      }
    };
    reader.readAsText(file);
  };

  const exportFile = () => {
    try {
      const url = URL.createObjectURL(new Blob([exportAiProviderConfig(props.settings)], { type: 'application/json;charset=utf-8' }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'feishu2wx-model-settings.json';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setFeedback({ error: false, text: '配置已导出，请妥善保管包含 API Key 的文件。' });
    } catch {
      setFeedback({ error: true, text: '导出失败，请重试。' });
    }
  };

  return (
    <div className="ai-ps-transfer">
      <div className="ai-ps-transfer-controls">
        <div className="ai-ps-transfer-heading">
          <span className="ai-ps-transfer-title">配置迁移</span>
          <span className="ai-ps-transfer-hint" title="支持本项目及 A2Make v1 聊天模型配置，文件上限 1 MiB。导出包含浏览器中已有的 API Key，云端密钥不会导出。">
            兼容 A2Make v1 · ≤1 MiB · 导出含本地 Key{props.cloud && '，不含云端 Key'}
          </span>
        </div>
        <select aria-label="配置导入方式" value={mode} onChange={(event) => setMode(event.target.value as AiProviderImportMode)} disabled={props.disabled || reading}>
          <option value="append">新增供应商</option>
          <option value="replace">完全覆盖</option>
        </select>
        <input id={inputId} className="ai-ps-file-input" type="file" accept=".json,application/json" onChange={importFile} disabled={props.disabled || reading} />
        <label htmlFor={inputId} className={`ai-ps-tool-button ai-ps-import-label${props.disabled || reading ? ' is-disabled' : ''}`}>{reading ? '正在导入…' : '导入配置'}</label>
        <Button variant="editorToolbar" className="ai-ps-tool-button" type="button" onClick={exportFile} disabled={props.disabled || !props.settings.providers.length}>导出配置</Button>
      </div>
      {feedback && <p className={`ai-ps-tool-feedback${feedback.error ? ' is-error' : ''}`} role={feedback.error ? 'alert' : 'status'}>{feedback.text}</p>}
    </div>
  );
};

export default AiProviderTransfer;
