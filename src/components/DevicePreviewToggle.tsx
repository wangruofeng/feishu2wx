import React from 'react';
import './DevicePreviewToggle.css';

interface Props {
  device: 'desktop' | 'mobile';
  setDevice: (device: 'desktop' | 'mobile') => void;
}

const DevicePreviewToggle: React.FC<Props> = ({ device, setDevice }) => {
  return (
    <div className="device-toggle">
      <button
        className={`device-btn ${device === 'desktop' ? 'active' : ''}`}
        onClick={() => setDevice('desktop')}
        title="电脑预览"
      >
        💻 电脑
      </button>
      <button
        className={`device-btn ${device === 'mobile' ? 'active' : ''}`}
        onClick={() => setDevice('mobile')}
        title="手机预览"
      >
        📱 手机
      </button>
    </div>
  );
};

export default DevicePreviewToggle;
