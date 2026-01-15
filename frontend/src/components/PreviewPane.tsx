import React, { useEffect, useRef } from 'react';
import './PreviewPane.css';

interface Props {
  html: string;
  device: 'desktop' | 'mobile';
}

const PreviewPane: React.FC<Props> = ({ html, device }) => {
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 滚动到顶部
    if (previewRef.current) {
      previewRef.current.scrollTop = 0;
    }
  }, [html]);

  return (
    <div className="preview-pane">
      <div className="preview-header">
        <h2>预览效果</h2>
        <div className="device-badge">
          {device === 'mobile' ? '📱 手机预览' : '💻 电脑预览'}
        </div>
      </div>
      <div
        ref={previewRef}
        className={`preview-content device-${device}`}
        dangerouslySetInnerHTML={{ __html: html || '<p class="empty-preview">预览内容将显示在这里...</p>' }}
      />
    </div>
  );
};

export default PreviewPane;
