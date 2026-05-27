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
  imageBorderStyle?: 'border' | 'shadow';
  scrollRef?: React.Ref<HTMLDivElement>;
}

const PreviewPane: React.FC<Props> = ({ html, device, isFullscreen = false, font = 'default', showH1 = true, invertH1 = false, imageBorderStyle = 'border', scrollRef }) => {
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
    // 滚动到顶部
    if (previewRef.current) {
      previewRef.current.scrollTop = 0;
    }
  }, [html]);

  // 获取当前字体样式
  const currentFont = fonts.find(f => f.key === font) || fonts[0];
  const fontStyle = {
    fontFamily: currentFont.value,
    ...getModernCodeBlockCssVars(),
  } as React.CSSProperties;

  return (
    <div className={`preview-pane ${isFullscreen ? 'fullscreen' : ''}`}>
      <div className="preview-header">
        <h2>预览效果</h2>
        <div className="device-badge">
          {device === 'mobile' ? '📱 手机预览' : '💻 电脑预览'}
        </div>
      </div>
      <div className="preview-content-wrapper">
        <div
          ref={setPreviewRef}
          className={`preview-content device-${device} ${isFullscreen ? 'fullscreen-content' : ''} ${!showH1 ? 'hide-h1' : ''} ${invertH1 ? 'invert-h1' : ''} image-${imageBorderStyle}`}
          style={fontStyle}
          dangerouslySetInnerHTML={{ __html: html || '<p class="empty-preview">预览内容将显示在这里...</p>' }}
        />
      </div>
    </div>
  );
};

export default PreviewPane;
