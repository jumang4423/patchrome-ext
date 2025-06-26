import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

interface ReverbEffectNodeData {
  value: number;
  onChange: (value: number) => void;
}

const ReverbEffectNode = memo(({ data, isConnectable }: NodeProps<ReverbEffectNodeData>) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value, 10);
    data.onChange(newValue);
  };

  return (
    <div className="custom-node reverb-effect-node">
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        className="custom-handle"
      />
      
      <div className="node-header">

        <div className="node-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 17h20v2H2zm1.15-4.05L4 11.47l.85 1.48 1.3-.75-.85-1.48H7v-1.5H5.3l.85-1.48L4.85 7 4 8.47 3.15 7l-1.3.75.85 1.48H1v1.5h1.7l-.85 1.48 1.3.75zm6.7-.75l1.48.85 1.48-.85-.85-1.48H14v-1.5h-2.05l.85-1.48L11.5 7 10 8.5 8.5 7l-1.3.75.85 1.48H6v1.5h2.05l-.85 1.48zm8 0l1.48.85 1.48-.85-.85-1.48H22v-1.5h-2.05l.85-1.48L19.5 7 18 8.5 16.5 7l-1.3.75.85 1.48H14v1.5h2.05l-.85 1.48z" fill="#4ecdc4"/>
          </svg>
        </div>
        <h3>Reverb</h3>
      </div>
      
      <div className="node-content">
        <label className="node-label">Mix ({data.value}%)</label>
        <div className="node-slider-container nodrag">
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={data.value}
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

ReverbEffectNode.displayName = 'ReverbEffectNode';

export default ReverbEffectNode;