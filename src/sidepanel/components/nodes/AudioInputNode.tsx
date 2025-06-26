import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

interface AudioInputNodeData {
  speedValue: number;
  onSpeedChange: (value: number) => void;
}

const AudioInputNode = memo(({ data, isConnectable, selected }: NodeProps<AudioInputNodeData>) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    data.onSpeedChange(newValue);
  };

  return (
    <div className={`custom-node audio-input-node ${selected ? 'selected' : ''}`}>
      <div className="node-header">
        <div className="node-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3z" fill="#ff6b6b"/>
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" fill="#ff6b6b"/>
          </svg>
        </div>
        <h3>Audio Input</h3>
      </div>
      
      <div className="node-content">
          <label className="node-label">Speed ({data.speedValue.toFixed(2)}x)</label>
          <div className="node-slider-container nodrag">
            <input
              type="range"
              min="0.5"
              max="1.5"
              step="0.01"
              value={data.speedValue}
              onChange={handleChange}
              className="node-slider"
            />
          </div>
      </div>
      
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
        className="custom-handle"
      />
    </div>
  );
});

AudioInputNode.displayName = 'AudioInputNode';

export default AudioInputNode;