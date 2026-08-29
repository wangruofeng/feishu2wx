import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { newAiId, normalizeProviderSettings } from '../../utils/aiChat';
import type { AiCloudUser, AiProvider, AiProviderSettings as AiProviderSettingsData } from '../../utils/aiChat';

interface Props {
  settings: AiProviderSettingsData;
  onChange: (next: AiProviderSettingsData) => void;
  onClose: () => void;
  cloudUser: AiCloudUser | null;
  onLogin: () => void;
  onLogout: () => void;
}

const API_FORMAT_OPTIONS = [
  { id: 'chat-completions', label: 'Chat Completions (/chat/completions)' },
  { id: 'anthropic', label: 'Anthropic Messages (/v1/messages)' },
  { id: 'responses', label: 'Responses (/responses)' },
] as const;

/* 线性描边图标（lucide 风格） */
const iconProps = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const IcoBox = () => (
  <svg {...iconProps} width={20} height={20}>
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
    <path d="m3.3 7 8.7 5 8.7-5" />
    <path d="M12 22V12" />
  </svg>
);

const IcoPencil = () => (
  <svg {...iconProps} width={16} height={16}>
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
  </svg>
);

const IcoTrash = ({ size = 18 }: { size?: number }) => (
  <svg {...iconProps} width={size} height={size}>
    <path d="M3 6h18" />
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
  </svg>
);

const IcoEye = () => (
  <svg {...iconProps}>
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const IcoEyeOff = () => (
  <svg {...iconProps}>
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
    <line x1="2" x2="22" y1="2" y2="22" />
  </svg>
);

const IcoGitHub = () => (
  <svg width={16} height={16} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
  </svg>
);

const IcoClose = () => (
  <svg {...iconProps} width={20} height={20}>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

const IcoChevronUp = () => (
  <svg {...iconProps} width={14} height={14}>
    <path d="m18 15-6-6-6 6" />
  </svg>
);

const IcoChevronDown = () => (
  <svg {...iconProps} width={14} height={14}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const AiProviderSettings: React.FC<Props> = ({ settings, onChange, onClose, cloudUser, onLogin, onLogout }) => {
  const [selectedId, setSelectedId] = useState<string | null>(
    settings.activeProviderId ?? settings.providers[0]?.id ?? null
  );
  const [editingName, setEditingName] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // 删除当前选中供应商后自动切换
  useEffect(() => {
    if (selectedId && !settings.providers.some((p) => p.id === selectedId)) {
      setSelectedId(settings.providers[0]?.id ?? null);
    }
  }, [settings.providers, selectedId]);

  // 仅在切换选中供应商时退出名称编辑态；不能依赖 providers 引用，否则每敲一个字符都会退出编辑
  useEffect(() => {
    setEditingName(false);
  }, [selectedId]);

  useEffect(() => {
    if (editingName) nameInputRef.current?.focus();
  }, [editingName]);

  const selected = settings.providers.find((p) => p.id === selectedId) ?? null;

  const commit = (updater: (draft: AiProviderSettingsData) => AiProviderSettingsData) => {
    onChange(normalizeProviderSettings(updater({
      activeProviderId: settings.activeProviderId,
      activeModelId: settings.activeModelId,
      providers: settings.providers,
    })));
  };

  const patchProvider = (id: string, patch: Partial<AiProvider>) => {
    commit((draft) => ({
      ...draft,
      providers: draft.providers.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));
  };

  const handleAddProvider = () => {
    const id = newAiId();
    commit((draft) => ({
      ...draft,
      providers: [...draft.providers, {
        id,
        name: '',
        enabled: true,
        baseUrl: '',
        apiFormat: 'chat-completions',
        apiKey: '',
        models: [],
      }],
    }));
    setSelectedId(id);
  };

  const handleDeleteProvider = (id: string) => {
    if (!window.confirm('确定删除该供应商及其模型配置吗？')) return;
    commit((draft) => {
      const providers = draft.providers.filter((p) => p.id !== id);
      let { activeProviderId, activeModelId } = draft;
      if (activeProviderId === id) {
        const fallback = providers.find((p) => p.enabled) ?? providers[0];
        activeProviderId = fallback?.id ?? null;
        activeModelId = fallback?.models.find((m) => m.id)?.id ?? null;
      }
      return { activeProviderId, activeModelId, providers };
    });
  };

  const handleMoveProvider = (id: string, offset: -1 | 1) => {
    commit((draft) => {
      const index = draft.providers.findIndex((p) => p.id === id);
      const target = index + offset;
      if (index < 0 || target < 0 || target >= draft.providers.length) return draft;
      const providers = [...draft.providers];
      [providers[index], providers[target]] = [providers[target], providers[index]];
      return { ...draft, providers };
    });
  };

  const handleMoveModel = (providerId: string, index: number, offset: -1 | 1) => {
    const provider = settings.providers.find((p) => p.id === providerId);
    if (!provider) return;
    const target = index + offset;
    if (target < 0 || target >= provider.models.length) return;
    const models = [...provider.models];
    [models[index], models[target]] = [models[target], models[index]];
    patchProvider(providerId, { models });
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') setEditingName(false);
    if (e.key === 'Escape') {
      e.stopPropagation();
      setEditingName(false);
    }
  };

  const formatHint = selected?.baseUrl.includes('/anthropic')
    ? 'Base URL 含 /anthropic，将按 Anthropic Messages 格式发送'
    : null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return createPortal(
    <div className="ai-ps-overlay" onClick={handleOverlayClick}>
      <div className="ai-ps-modal" role="dialog" aria-label="模型设置">
        {/* 顶部标题区 */}
        <div className="ai-ps-header">
          <div>
            <h3>模型设置</h3>
            <p>管理自定义模型供应商，配置后可在聊天时选择使用。</p>
          </div>
          <button type="button" className="ai-ps-close" onClick={onClose} aria-label="关闭">
            <IcoClose />
          </button>
        </div>

        <div className="ai-ps-body">
          {/* 左栏：GitHub 账号卡 + 供应商列表 */}
          <aside className="ai-ps-sidebar">
            <div className="ai-ps-account">
              <div className="ai-ps-account-row">
                {cloudUser?.avatarUrl
                  ? <img className="ai-ps-account-avatar" src={cloudUser.avatarUrl} alt="" />
                  : <span className="ai-ps-account-icon"><IcoGitHub /></span>}
                <span className="ai-ps-account-name">{cloudUser ? cloudUser.login : '未登录'}</span>
                {cloudUser && <button type="button" className="ai-ps-toggle-btn ai-ps-account-logout" onClick={onLogout}>退出登录</button>}
              </div>
              <p className="ai-ps-account-tip">{cloudUser ? '配置已加密保存到云端，其他设备登录同一账号可读取。' : '配置仅保存在本地浏览器，登录后加密同步到云端。'}</p>
              {!cloudUser && (
                <button type="button" className="ai-ps-login-btn" onClick={onLogin}>
                  <IcoGitHub /> 使用 GitHub 登录
                </button>
              )}
            </div>
            <div className="ai-ps-sidebar-label">自定义供应商</div>
            <div className="ai-ps-provider-list">
              {settings.providers.map((provider, index) => (
                <div
                  key={provider.id}
                  className={`ai-ps-provider-item${provider.id === selectedId ? ' is-active' : ''}`}
                >
                  <button
                    type="button"
                    className="ai-ps-provider-main"
                    onClick={() => setSelectedId(provider.id)}
                    title={provider.name || '未命名供应商'}
                  >
                    <span className="ai-ps-provider-icon"><IcoBox /></span>
                    <span className="ai-ps-provider-name">{provider.name || '未命名供应商'}</span>
                    <span className={`ai-ps-provider-dot${provider.enabled ? '' : ' is-disabled'}`} />
                  </button>
                  <span className="ai-ps-provider-move">
                    <button
                      type="button"
                      className="ai-ps-icon-btn ai-ps-icon-btn-sm"
                      onClick={() => handleMoveProvider(provider.id, -1)}
                      disabled={index === 0}
                      title="上移"
                      aria-label={`上移供应商 ${provider.name || '未命名供应商'}`}
                    >
                      <IcoChevronUp />
                    </button>
                    <button
                      type="button"
                      className="ai-ps-icon-btn ai-ps-icon-btn-sm"
                      onClick={() => handleMoveProvider(provider.id, 1)}
                      disabled={index === settings.providers.length - 1}
                      title="下移"
                      aria-label={`下移供应商 ${provider.name || '未命名供应商'}`}
                    >
                      <IcoChevronDown />
                    </button>
                  </span>
                </div>
              ))}
            </div>
            <button type="button" className="ai-ps-add-provider" onClick={handleAddProvider}>
              + 添加供应商
            </button>
          </aside>

          {/* 右栏：供应商表单 */}
          <div className="ai-ps-form">
            {!selected ? (
              <div className="ai-ps-empty">左侧选择或添加一个供应商</div>
            ) : (
              <>
                {/* 名称行：名称 + 编辑 + 状态徽章 + 启/禁用 + 删除 */}
                <div className="ai-ps-name-row">
                  {editingName ? (
                    <input
                      ref={nameInputRef}
                      type="text"
                      className="ai-ps-name-input"
                      value={selected.name}
                      placeholder="未命名供应商"
                      onChange={(e) => patchProvider(selected.id, { name: e.target.value })}
                      onBlur={() => setEditingName(false)}
                      onKeyDown={handleNameKeyDown}
                    />
                  ) : (
                    <button
                      type="button"
                      className="ai-ps-name"
                      onClick={() => setEditingName(true)}
                      title="编辑名称"
                    >
                      <span className="ai-ps-name-text">{selected.name || '未命名供应商'}</span>
                      <IcoPencil />
                    </button>
                  )}
                  <span className={`ai-ps-badge${selected.enabled ? '' : ' is-off'}`}>
                    {selected.enabled ? '已启用' : '已禁用'}
                  </span>
                  <button
                    type="button"
                    className="ai-ps-toggle-btn"
                    onClick={() => patchProvider(selected.id, { enabled: !selected.enabled })}
                  >
                    {selected.enabled ? '禁用' : '启用'}
                  </button>
                  <button
                    type="button"
                    className="ai-ps-icon-btn ai-ps-delete-provider"
                    onClick={() => handleDeleteProvider(selected.id)}
                    title="删除供应商"
                    aria-label="删除供应商"
                  >
                    <IcoTrash />
                  </button>
                </div>

                <label className="ai-ps-field">
                  <span className="ai-ps-field-label">Base URL</span>
                  <input
                    type="text"
                    value={selected.baseUrl}
                    onChange={(e) => patchProvider(selected.id, { baseUrl: e.target.value.trim() })}
                    placeholder="如：https://open.bigmodel.cn/api/anthropic"
                    spellCheck={false}
                  />
                </label>

                <label className="ai-ps-field">
                  <span className="ai-ps-field-label">API 格式</span>
                  <select
                    value={selected.apiFormat}
                    onChange={(e) => patchProvider(selected.id, { apiFormat: e.target.value as AiProvider['apiFormat'] })}
                  >
                    {API_FORMAT_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>{option.label}</option>
                    ))}
                  </select>
                  {formatHint && <span className="ai-ps-field-hint">{formatHint}</span>}
                </label>

                <label className="ai-ps-field">
                  <span className="ai-ps-field-label">API Key</span>
                  <span className="ai-ps-key-row">
                    <input
                      type={showKey ? 'text' : 'password'}
                      value={selected.apiKey}
                      onChange={(e) => patchProvider(selected.id, { apiKey: e.target.value })}
                      placeholder="仅保存在本地浏览器，不经过服务端存储"
                      spellCheck={false}
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      className="ai-ps-icon-btn"
                      onClick={() => setShowKey((v) => !v)}
                      title={showKey ? '隐藏' : '显示'}
                      aria-label={showKey ? '隐藏 API Key' : '显示 API Key'}
                    >
                      {showKey ? <IcoEyeOff /> : <IcoEye />}
                    </button>
                  </span>
                </label>

                {/* 模型列表：分组卡片 */}
                <div className="ai-ps-field">
                  <span className="ai-ps-field-label">模型列表</span>
                  {selected.models.length === 0 ? (
                    <div className="ai-ps-model-card">
                      <div className="ai-ps-model-row is-empty">暂无模型，点击下方按钮添加</div>
                    </div>
                  ) : (
                    <div className="ai-ps-model-card">
                      {selected.models.map((model, index) => (
                        <div key={`${selected.id}-${index}`} className="ai-ps-model-row">
                          <input
                            type="text"
                            value={model.id}
                            onChange={(e) => {
                              const models = selected.models.map((m, i) => (i === index ? { id: e.target.value } : m));
                              patchProvider(selected.id, { models });
                            }}
                            placeholder="如：glm-5.3"
                            spellCheck={false}
                          />
                          <button
                            type="button"
                            className="ai-ps-icon-btn ai-ps-icon-btn-sm"
                            title="上移"
                            aria-label={`上移模型 ${model.id || index + 1}`}
                            disabled={index === 0}
                            onClick={() => handleMoveModel(selected.id, index, -1)}
                          >
                            <IcoChevronUp />
                          </button>
                          <button
                            type="button"
                            className="ai-ps-icon-btn ai-ps-icon-btn-sm"
                            title="下移"
                            aria-label={`下移模型 ${model.id || index + 1}`}
                            disabled={index === selected.models.length - 1}
                            onClick={() => handleMoveModel(selected.id, index, 1)}
                          >
                            <IcoChevronDown />
                          </button>
                          <button
                            type="button"
                            className="ai-ps-icon-btn ai-ps-icon-btn-sm"
                            title="删除模型"
                            aria-label="删除模型"
                            onClick={() => patchProvider(selected.id, {
                              models: selected.models.filter((_, i) => i !== index),
                            })}
                          >
                            <IcoTrash size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    type="button"
                    className="ai-ps-add-model"
                    onClick={() => patchProvider(selected.id, { models: [...selected.models, { id: '' }] })}
                  >
                    + 添加模型
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AiProviderSettings;
