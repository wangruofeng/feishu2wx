import React, { useEffect, useRef } from 'react';
import { fonts } from './FontSelector';
import './PreviewPane.css';

interface Props {
  html: string;
  device: 'desktop' | 'mobile';
  isFullscreen?: boolean;
  font?: string;
}

const PreviewPane: React.FC<Props> = ({ html, device, isFullscreen = false, font = 'default' }) => {
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 滚动到顶部
    if (previewRef.current) {
      previewRef.current.scrollTop = 0;
    }
  }, [html]);

  // 获取当前字体样式
  const currentFont = fonts.find(f => f.key === font) || fonts[0];
  const fontStyle = { fontFamily: currentFont.value };

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
          ref={previewRef}
          className={`preview-content device-${device} ${isFullscreen ? 'fullscreen-content' : ''}`}
          style={fontStyle}
          dangerouslySetInnerHTML={{ __html: html || '<p class="empty-preview">预览内容将显示在这里...</p>' }}
        />
      </div>
    </div>
  );
};

export default PreviewPane;
