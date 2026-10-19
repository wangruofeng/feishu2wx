import React, { useRef, useState } from 'react';
import './PanelResizeHandle.css';

interface Props {
  label: string;
  width: number;
  onChange: (width: number) => void;
  reservedWidth: () => number;
  onResizing?: (active: boolean) => void;
}

export default function PanelResizeHandle({ label, width, onChange, reservedWidth, onResizing }: Props) {
  const start = useRef<{ x: number; width: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const bounds = (element: HTMLElement) => {
    const right = element.parentElement!.getBoundingClientRect().right;
    const max = Math.max(240, Math.min(800, right - reservedWidth()));
    return { min: Math.min(280, max), max };
  };
  const finish = () => { start.current = null; setDragging(false); onResizing?.(false); };
  return <div className={`panel-resize-handle${dragging ? ' is-dragging' : ''}`} role="separator"
    aria-label={label} aria-orientation="vertical" aria-valuemin={240} aria-valuemax={800} aria-valuenow={width}
    tabIndex={0}
    onPointerDown={event => {
      if (event.button !== 0) return;
      event.preventDefault();
      start.current = { x: event.clientX, width: event.currentTarget.parentElement!.getBoundingClientRect().width };
      event.currentTarget.setPointerCapture(event.pointerId);
      setDragging(true);
      onResizing?.(true);
    }}
    onPointerMove={event => {
      if (!start.current) return;
      const { min, max } = bounds(event.currentTarget);
      onChange(Math.round(Math.max(min, Math.min(max, start.current.width + start.current.x - event.clientX))));
    }}
    onPointerUp={event => { finish(); event.currentTarget.releasePointerCapture(event.pointerId); }}
    onLostPointerCapture={finish}
    onKeyDown={event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const { min, max } = bounds(event.currentTarget);
      const current = event.currentTarget.parentElement!.getBoundingClientRect().width;
      const next = event.key === 'Home' ? min : event.key === 'End' ? max : current + (event.key === 'ArrowLeft' ? 16 : -16);
      onChange(Math.round(Math.max(min, Math.min(max, next))));
    }} />;
}
