import React, { useCallback, useEffect, useRef } from 'react';
import { fonts } from './FontSelector';
import { getModernCodeBlockCssVars } from '../utils/codeBlockStyles';
import './PreviewPane.css';

interface Props {
  html: string;
  device: 'desktop' | 'mobile';
  isFullscreen?: boolean;
  font?: string;
  showH1?: boolean;
  invertH1?: boolean;
  alignH1Left?: boolean;
  imageBorderStyle?: 'border' | 'shadow' | 'default';
  tableShadow?: boolean;
  scrollRef?: React.Ref<HTMLDivElement>;
  onDeviceChange?: (device: 'desktop' | 'mobile') => void;
  onToggleFullscreen?: () => void;
}

const PreviewPane: React.FC<Props> = ({
  html,
  device,
  isFullscreen = false,
  font = 'default',
  showH1 = true,
  invertH1 = false,
  alignH1Left = false,
  imageBorderStyle = 'border',
  tableShadow = true,
  scrollRef,
  onDeviceChange,
  onToggleFullscreen,
}) => {
  const previewRef = useRef<HTMLDivElement>(null);

  const setPreviewRef = useCallback((node: HTMLDivElement | null) => {
    (previewRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    if (typeof scrollRef === 'function') {
      scrollRef(node);
    } else if (scrollRef && 'current' in scrollRef) {
      (scrollRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    }
  }, [scrollRef]);

  useEffect(() => {
    if (previewRef.current) {
      previewRef.current.scrollTop = 0;
    }
  }, [html]);

  const currentFont = fonts.find(f => f.key === font) || fonts[0];
  const fontStyle = {
    fontFamily: currentFont.value,
    ...getModernCodeBlockCssVars(),
  } as React.CSSProperties;

  return (
    <div className={`preview-pane ${isFullscreen ? 'fullscreen' : ''}`}>
      <div className="preview-header">
        {onDeviceChange && (
          <>
            <button
              className={`preview-header-btn ${device === 'desktop' ? 'active' : ''}`}
              onClick={() => onDeviceChange('desktop')}
              title="电脑预览"
            >
              💻
            </button>
            <button
              className={`preview-header-btn ${device === 'mobile' ? 'active' : ''}`}
              onClick={() => onDeviceChange('mobile')}
              title="手机预览"
            >
              📱
            </button>
          </>
        )}
        {onToggleFullscreen && (
          <button
            className="preview-header-btn"
            onClick={onToggleFullscreen}
            title={isFullscreen ? '退出全屏' : '全屏预览'}
          >
            {isFullscreen ? '✕' : '⛶'}
          </button>
        )}
      </div>
      <div className="preview-content-wrapper">
        <div
          ref={setPreviewRef}
          className={`preview-content device-${device} ${isFullscreen ? 'fullscreen-content' : ''} ${!showH1 ? 'hide-h1' : ''} ${invertH1 ? 'invert-h1' : ''} ${alignH1Left ? 'align-h1-left' : ''} ${!tableShadow ? 'hide-table-shadow' : ''} image-${imageBorderStyle}`}
          style={fontStyle}
          dangerouslySetInnerHTML={{ __html: html || '<p class="empty-preview">预览内容将显示在这里...</p>' }}
        />
      </div>
    </div>
  );
};

export default PreviewPane;
