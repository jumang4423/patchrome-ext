import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

interface AudioInputNodeData {
  speedValue: number;
  onSpeedChange: (value: number) => void;
}

const AudioInputNode = memo(({ data, isConnectable }: NodeProps<AudioInputNodeData>) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    data.onSpeedChange(newValue);
  };

  return (
    <div className="custom-node audio-input-node">
      <div className="node-header">
        <div className="node-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" fill="#ff6b6b"/>
          </svg>
        </div>
        <h3>Audio Input</h3>
      </div>
      
      <div className="node-content">
        <div className="node-status">
          <span className="status-dot active"></span>
          <span>Active</span>
        </div>
        
        <div className="node-divider"></div>
        
        <div className="node-control-section">
          <label className="node-label">Speed ({data.speedValue.toFixed(2)}x)</label>
          <div className="node-slider-container nodrag">
            <input
              type="range"
              min="0.5"
              max="1.5"
              step="0.01"
              value={data.speedValue}
              onChange={handleChange}
              className="node-slider speed-slider"
            />
          </div>
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