import React, { useEffect, useState } from 'react';
import './ImageViewer.css';

interface Props {
  images: string[];
  initialIndex: number;
  onClose: () => void;
}

const ImageViewer: React.FC<Props> = ({ images, initialIndex, onClose }) => {
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') setIndex((i) => (i - 1 + images.length) % images.length);
      else if (e.key === 'ArrowRight') setIndex((i) => (i + 1) % images.length);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [images.length, onClose]);

  return (
    <div className="image-viewer-overlay" onClick={onClose}>
      <button className="image-viewer-close" onClick={onClose} title="关闭">
        &times;
      </button>
      {images.length > 1 && (
        <div className="image-viewer-nav">
          <button
            className="image-viewer-arrow image-viewer-prev"
            onClick={(e) => { e.stopPropagation(); setIndex((i) => (i - 1 + images.length) % images.length); }}
            title="上一张"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="13,3 7,10 13,17" /></svg>
          </button>
          <button
            className="image-viewer-arrow image-viewer-next"
            onClick={(e) => { e.stopPropagation(); setIndex((i) => (i + 1) % images.length); }}
            title="下一张"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="7,3 13,10 7,17" /></svg>
          </button>
        </div>
      )}
      <img
        className="image-viewer-img"
        src={images[index]}
        alt=""
        onClick={(e) => e.stopPropagation()}
      />
      {images.length > 1 && (
        <span className="image-viewer-counter" onClick={(e) => e.stopPropagation()}>
          {index + 1} / {images.length}
        </span>
      )}
    </div>
  );
};

export default ImageViewer;
