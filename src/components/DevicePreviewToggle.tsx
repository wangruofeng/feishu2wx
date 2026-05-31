import React from 'react';
import { Button } from './ui';
import './DevicePreviewToggle.css';

interface Props {
  device: 'desktop' | 'mobile';
  setDevice: (device: 'desktop' | 'mobile') => void;
}

const DevicePreviewToggle: React.FC<Props> = ({ device, setDevice }) => {
  return (
    <div className="device-toggle">
      <Button
        variant="deviceBtn"
        active={device === 'desktop'}
        onClick={() => setDevice('desktop')}
        title="电脑预览"
      >
        💻
      </Button>
      <Button
        variant="deviceBtn"
        active={device === 'mobile'}
        onClick={() => setDevice('mobile')}
        title="手机预览"
      >
        📱
      </Button>
    </div>
  );
};

export default DevicePreviewToggle;
