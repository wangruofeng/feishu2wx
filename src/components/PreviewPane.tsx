import React, { useCallback, useEffect, useRef, useState } from 'react';
import { fonts } from './FontSelector';
import { getModernCodeBlockCssVars } from '../utils/codeBlockStyles';
import { Button } from './ui';
import ImageViewer from './ImageViewer';
import './PreviewPane.css';

interface Props {
  html: string;
  device: 'desktop' | 'mobile';
  isFullscreen?: boolean;
  font?: string;
  showH1?: boolean;
  invertH1?: boolean;
  alignH1Left?: boolean;
  invertH2?: boolean;
  alignH2Left?: boolean;
  imageBorderStyle?: 'border' | 'shadow' | 'default';
  imageBorderRadius?: boolean;
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
  invertH2 = false,
  alignH2Left = false,
  imageBorderStyle = 'border',
  imageBorderRadius = false,
  tableShadow = true,
  scrollRef,
  onDeviceChange,
  onToggleFullscreen,
}) => {
  const previewRef = useRef<HTMLDivElement>(null);
  const [imageViewerSrc, setImageViewerSrc] = useState<string | null>(null);
  const [imageViewerImages, setImageViewerImages] = useState<string[]>([]);
  const [imageViewerIndex, setImageViewerIndex] = useState(0);

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

  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const img = target.closest('img') as HTMLImageElement | null;
      if (img && img.src && !img.classList.contains('img-error')) {
        e.preventDefault();
        const allImgs = Array.from(el.querySelectorAll('img:not(.img-error)'))
          .map((i) => (i as HTMLImageElement).src)
          .filter(Boolean);
        const idx = allImgs.indexOf(img.src);
        setImageViewerImages(allImgs);
        setImageViewerIndex(idx >= 0 ? idx : 0);
        setImageViewerSrc(img.src);
      }
    };

    const handleError = (e: Event) => {
      const img = e.target as HTMLImageElement;
      if (img.tagName !== 'IMG' || img.classList.contains('img-error')) return;
      img.classList.add('img-error');
      img.removeAttribute('src');
    };

    el.addEventListener('click', handleClick);
    el.addEventListener('error', handleError, true);
    return () => {
      el.removeEventListener('click', handleClick);
      el.removeEventListener('error', handleError, true);
    };
  }, []);

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
            <Button
              variant="ghost"
              active={device === 'desktop'}
              onClick={() => onDeviceChange('desktop')}
              title="电脑预览"
            >
              💻
            </Button>
            <Button
              variant="ghost"
              active={device === 'mobile'}
              onClick={() => onDeviceChange('mobile')}
              title="手机预览"
            >
              📱
            </Button>
          </>
        )}
        {onToggleFullscreen && (
          <Button
            variant="ghost"
            onClick={onToggleFullscreen}
            title={isFullscreen ? '退出全屏' : '全屏预览'}
          >
            {isFullscreen ? '✕' : '⛶'}
          </Button>
        )}
      </div>
      <div className="preview-content-wrapper">
        <div
          ref={setPreviewRef}
          className={`preview-content device-${device} ${isFullscreen ? 'fullscreen-content' : ''} ${!showH1 ? 'hide-h1' : ''} ${invertH1 ? 'invert-h1' : ''} ${alignH1Left ? 'align-h1-left' : ''} ${invertH2 ? 'invert-h2' : ''} ${alignH2Left ? 'align-h2-left' : ''} ${!tableShadow ? 'hide-table-shadow' : ''} image-${imageBorderStyle}${imageBorderRadius ? ' image-radius' : ''}`}
          style={fontStyle}
          dangerouslySetInnerHTML={{ __html: html || '<p class="empty-preview">预览内容将显示在这里...</p>' }}
        />
      </div>
      {imageViewerSrc && (
        <ImageViewer
          images={imageViewerImages}
          initialIndex={imageViewerIndex}
          onClose={() => setImageViewerSrc(null)}
        />
      )}
    </div>
  );
};

export default PreviewPane;
