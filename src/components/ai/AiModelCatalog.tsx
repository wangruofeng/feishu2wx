import React, { useEffect, useRef, useState } from 'react';
import { fetchAiModels } from '../../utils/aiChat';
import type { AiProvider } from '../../utils/aiChat';
import { AI_PROVIDER_MODEL_LIMIT } from '../../utils/aiProviderConfig';
import Button from '../ui/Button';
import './AiProviderTools.css';

interface Props {
  provider: AiProvider;
  cloud: boolean;
  onModels: (models: string[]) => number;
  onClear: () => void;
  onBeforeModelFetch?: () => Promise<void>;
}

const AiModelCatalog: React.FC<Props> = ({ provider, cloud, onModels, onClear, onBeforeModelFetch }) => {
  const [catalogCount, setCatalogCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ error: boolean; text: string } | null>(null);
  const request = useRef<AbortController | null>(null);
  const latest = useRef({ provider, cloud, onModels, onBeforeModelFetch });
  latest.current = { provider, cloud, onModels, onBeforeModelFetch };
  // 模型编辑不取消请求；切换连接或供应商时取消，旧结果不能写入新配置。
  useEffect(() => {
    setLoading(false);
    setFeedback(null);
    setCatalogCount(null);
    return () => { request.current?.abort(); };
  }, [provider.id, provider.baseUrl, provider.apiFormat, provider.apiKey, provider.hasApiKey, cloud]);

  const fetchModels = async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const connection = { id: provider.id, baseUrl: provider.baseUrl, apiFormat: provider.apiFormat, apiKey: provider.apiKey, cloud };
    setLoading(true);
    setFeedback(null);
    try {
      await latest.current.onBeforeModelFetch?.();
      if (controller.signal.aborted) return;
      const models = await fetchAiModels(provider, cloud, controller.signal);
      const current = latest.current;
      if (controller.signal.aborted || current.provider.id !== connection.id || current.provider.baseUrl !== connection.baseUrl
        || current.provider.apiFormat !== connection.apiFormat || current.provider.apiKey !== connection.apiKey || current.cloud !== connection.cloud) return;
      setCatalogCount(models.length);
      const added = current.onModels(models);
      const existing = new Set(current.provider.models.map((model) => model.id.trim()));
      const available = new Set(models.map((id) => id.trim()).filter((id) => id && !existing.has(id))).size;
      const limitHint = available > added ? `模型数量已达 ${AI_PROVIDER_MODEL_LIMIT} 个上限，剩余模型未添加。` : '';
      setFeedback({ error: false, text: models.length ? `已获取 ${models.length} 个模型，新增 ${added} 个；已有模型已保留。${limitHint}` : '未找到可用的聊天模型，可手动添加或重试。' });
    } catch (error) {
      if (!controller.signal.aborted) setFeedback({ error: true, text: error instanceof Error ? error.message : '获取模型失败，请重试。' });
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };

  return (
    <div className="ai-ps-catalog">
      <div className="ai-ps-catalog-actions">
        <Button type="button" variant="editorToolbar" className="ai-ps-tool-button" onClick={fetchModels} disabled={loading || !provider.baseUrl.trim() || (!cloud && !provider.apiKey.trim())} aria-busy={loading}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 7a8 8 0 0 0-14-2L3 8m0-5v5h5M4 17a8 8 0 0 0 14 2l3-3m0 5v-5h-5" /></svg>
          {loading ? '正在获取…' : feedback?.error ? '重试获取' : '获取模型列表'}
        </Button>
        <Button type="button" variant="editorToolbar" className="ai-ps-tool-button" disabled={provider.models.length === 0 && !loading} onClick={() => {
          request.current?.abort();
          setLoading(false);
          onClear();
          setFeedback({ error: false, text: '已清空当前供应商的模型列表。' });
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18M9 6V4h6v2M5 6l1 15h12l1-15M10 10v7M14 10v7" /></svg>
          清空列表
        </Button>
      </div>
      <p className="ai-ps-tool-hint">{catalogCount !== null && `目录总数：${catalogCount} · `}已添加：{provider.models.length}</p>
      {feedback && <p className={`ai-ps-tool-feedback${feedback.error ? ' is-error' : ''}`} role={feedback.error ? 'alert' : 'status'}>{feedback.text}</p>}
    </div>
  );
};

export default AiModelCatalog;
