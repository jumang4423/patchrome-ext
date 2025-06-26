import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { AudioNode, InputParamDOM, ReverbParamDOM, DelayParamDOM, UtilityParamDOM, LimiterParamDOM, OutputParamDOM, ValueType, ParamConfig } from '../../../types/nodeGraphStructure';
import { Switch } from '../../../components/ui/switch';
import { cn } from '../../../lib/utils';
import { AUDIO_PARAM_DEFAULTS } from '../../../constants/audioDefaults';

interface UnifiedAudioNodeData {
  type: AudioNode['type'];
  deletable: boolean;
  onChange?: (key: string, value: number) => void;
  onRemove?: () => void;
  [key: string]: any; // Allow indexing for dynamic properties
}

interface UnifiedAudioNodeProps extends NodeProps<UnifiedAudioNodeData> {
}

const nodeIcons = {
  input: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3z" fill="#ff6b6b"/>
      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" fill="#ff6b6b"/>
    </svg>
  ),
  reverb: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 17h20v2H2zm1.15-4.05L4 11.47l.85 1.48 1.3-.75-.85-1.48H7v-1.5H5.3l.85-1.48L4.85 7 4 8.47 3.15 7l-1.3.75.85 1.48H1v1.5h1.7l-.85 1.48 1.3.75zm6.7-.75l1.48.85 1.48-.85-.85-1.48H14v-1.5h-2.05l.85-1.48L11.5 7 10 8.5 8.5 7l-1.3.75.85 1.48H6v1.5h2.05l-.85 1.48zm8 0l1.48.85 1.48-.85-.85-1.48H22v-1.5h-2.05l.85-1.48L19.5 7 18 8.5 16.5 7l-1.3.75.85 1.48H14v1.5h2.05l-.85 1.48z" fill="#4ecdc4"/>
    </svg>
  ),
  delay: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2v20M2 12h20" stroke="#ffa502" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="7" cy="12" r="1.5" fill="#ffa502"/>
      <circle cx="12" cy="12" r="1.5" fill="#ffa502"/>
      <circle cx="17" cy="12" r="1.5" fill="#ffa502"/>
    </svg>
  ),
  utility: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 17V7M3 12h6M15 17V7M15 12h6" stroke="#9b59b6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  limiter: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 12H20M4 8H20M4 16H20" stroke="#e74c3c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="9" y="9" width="6" height="6" stroke="#e74c3c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  output: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" fill="#4caf50"/>
    </svg>
  )
};

const nodeHeaders = {
  input: 'Audio Input',
  reverb: 'Reverb',
  delay: 'Delay',
  utility: 'Utility',
  limiter: 'Limiter',
  output: 'Audio Output'
};

const getParamDOM = (type: AudioNode['type']): ParamConfig[] => {
  switch (type) {
    case 'input':
      return InputParamDOM;
    case 'reverb':
      return ReverbParamDOM;
    case 'delay':
      return DelayParamDOM;
    case 'utility':
      return UtilityParamDOM;
    case 'limiter':
      return LimiterParamDOM;
    case 'output':
      return OutputParamDOM;
    default:
      return [];
  }
};

const formatValue = (value: number, valueType: ValueType) => {
  if (valueType === 'percentage') {
    return `${value}%`;
  } else if (valueType === 'milliseconds') {
    return `${value}ms`;
  } else if (valueType === 'decibels') {
    if (value <= -60) {
      return '-∞ dB';
    }
    return `${value.toFixed(1)} dB`;
  } else if (valueType === 'pan') {
    if (value === 0) {
      return 'C';
    } else if (value < 0) {
      return `${Math.abs(value)}L`;
    } else {
      return `${value}R`;
    }
  }
  return value.toFixed(2);
};

const UnifiedAudioNode = memo(({ data, isConnectable, selected }: UnifiedAudioNodeProps) => {
  const { type, onChange, deletable } = data;
  const paramDOM = getParamDOM(type);
  const hasLeftHandle = type !== 'input';
  const hasRightHandle = type !== 'output';

  const handleChange = (key: string, valueType: ValueType) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const newValue = (valueType === 'percentage' || valueType === 'milliseconds')
      ? parseInt(rawValue, 10) 
      : parseFloat(rawValue);
    
    console.log(`[UnifiedAudioNode] Parameter changed - Type: ${type}, Key: ${key}, Value: ${newValue}, ValueType: ${valueType}`);
    
    if (onChange) {
      onChange(key, newValue);
    }
  };

  const handleCheckboxChange = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked;
    console.log(`[UnifiedAudioNode] Boolean parameter changed - Type: ${type}, Key: ${key}, Value: ${newValue}`);
    
    if (onChange) {
      onChange(key, newValue ? 1 : 0);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.onRemove) {
      data.onRemove();
    }
  };

  return (
    <div className={`custom-node ${selected ? 'selected' : ''}`}>
      {hasLeftHandle && (
        <Handle
          type="target"
          position={Position.Left}
          isConnectable={isConnectable}
          className="custom-handle"
        />
      )}
      
      <div className="node-header">
        <div className="node-icon">
          {nodeIcons[type]}
        </div>
        <h3>{nodeHeaders[type]}</h3>
        {deletable && (
          <button 
            className="node-remove-button" 
            onClick={handleRemove}
            aria-label="Remove node"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        )}
      </div>
      
      {paramDOM.length > 0 && (
        <div className="node-content">
          {paramDOM.map((param) => {
            if (param.valueType === 'boolean') {
              // Render switch for boolean parameters
              const isChecked = data[param.key] || false;
              
              return (
                <div key={param.key} style={{ marginBottom: '16px' }}>
                  <label className="node-label">
                    <span>{param.label}</span>
                  </label>
                  <div className="node-switch-container nodrag">
                    <Switch
                      checked={isChecked}
                      onCheckedChange={(checked) => {
                        if (onChange) {
                          onChange(param.key, checked ? 1 : 0);
                        }
                      }}
                      className="node-switch"
                    />
                  </div>
                </div>
              );
            } else {
              // Render slider for numeric parameters
              const value = data[param.key] as number;
              const displayValue = param.valueType === 'number' 
                ? `${formatValue(value, param.valueType as ValueType)}`
                : formatValue(value, param.valueType as ValueType);
              
              return (
                <div key={param.key} style={{ marginBottom: '16px' }}>
                  <label className="node-label">
                    <span style={{ marginRight: '8px' }}>{param.label}</span>
                    <span style={{ color: '#868e96', fontWeight: 'normal' }}>({displayValue})</span>
                  </label>
                  <div className="node-slider-container nodrag">
                    <input
                      type="range"
                      min={'min' in param ? param.min : 0}
                      max={'max' in param ? param.max : 100}
                      step={'step' in param ? param.step : 1}
                      value={value}
                      onChange={handleChange(param.key, param.valueType as ValueType)}
                      onDoubleClick={() => {
                        const defaultValue = AUDIO_PARAM_DEFAULTS[type]?.[param.key as keyof typeof AUDIO_PARAM_DEFAULTS[typeof type]];
                        if (defaultValue !== undefined && onChange) {
                          onChange(param.key, defaultValue as number);
                        }
                      }}
                      className="node-slider"
                    />
                  </div>
                </div>
              );
            }
          })}
        </div>
      )}
      
      {hasRightHandle && (
        <Handle
          type="source"
          position={Position.Right}
          isConnectable={isConnectable}
          className="custom-handle"
        />
      )}
    </div>
  );
});

UnifiedAudioNode.displayName = 'UnifiedAudioNode';

export default UnifiedAudioNode;