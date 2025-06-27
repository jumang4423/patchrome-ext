import React, { memo, useEffect, useRef } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { AudioNode, InputParamDOM, ReverbParamDOM, DelayParamDOM, UtilityParamDOM, LimiterParamDOM, DistortionParamDOM, ToneGeneratorParamDOM, EqualizerParamDOM, PhaserParamDOM, FlangerParamDOM, OutputParamDOM, ValueType, ParamConfig } from '../../../types/nodeGraphStructure';
import { Switch } from '../../../components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
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
  distortion: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L2 12L12 22L22 12L12 2Z" stroke="#f39c12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8 12L16 12" stroke="#f39c12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 8L12 16" stroke="#f39c12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  tonegenerator: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 12C3 12 5 6 7 12C9 18 11 6 13 12C15 18 17 6 19 12C21 18 21 12 21 12" stroke="#00d2d3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="12" r="10" stroke="#00d2d3" strokeWidth="2" fill="none"/>
    </svg>
  ),
  equalizer: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 18V14M4 10V6M12 18V11M12 7V2M20 18V13M20 9V4" stroke="#3498db" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="4" cy="12" r="2" stroke="#3498db" strokeWidth="2" fill="none"/>
      <circle cx="12" cy="9" r="2" stroke="#3498db" strokeWidth="2" fill="none"/>
      <circle cx="20" cy="11" r="2" stroke="#3498db" strokeWidth="2" fill="none"/>
    </svg>
  ),
  phaser: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 12C3 12 5 9 7 12C9 15 11 9 13 12C15 15 17 9 19 12C21 15 21 12 21 12" stroke="#a29bfe" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3 12C3 12 5 15 7 12C9 9 11 15 13 12C15 9 17 15 19 12C21 9 21 12 21 12" stroke="#a29bfe" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.4"/>
    </svg>
  ),
  flanger: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 12C4 12 6 8 8 12C10 16 12 8 14 12C16 16 18 8 20 12" stroke="#74b9ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5 12C5 12 7 9 9 12C11 15 13 9 15 12C17 15 19 12 19 12" stroke="#74b9ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" strokeDasharray="3 3"/>
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
  distortion: 'Distortion',
  tonegenerator: 'Tone Generator',
  equalizer: 'Equalizer',
  phaser: 'Phaser',
  flanger: 'Flanger',
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
    case 'distortion':
      return DistortionParamDOM;
    case 'tonegenerator':
      return ToneGeneratorParamDOM;
    case 'equalizer':
      return EqualizerParamDOM;
    case 'phaser':
      return PhaserParamDOM;
    case 'flanger':
      return FlangerParamDOM;
    case 'output':
      return OutputParamDOM;
    default:
      return [];
  }
};

const formatValue = (value: number, valueType: ValueType, paramKey?: string) => {
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
  } else if (valueType === 'speed') {
    return `${value.toFixed(2)}x`;
  } else if (valueType === 'number' && paramKey === 'frequency') {
    return `${value}Hz`;
  }
  return value.toFixed(2);
};

const UnifiedAudioNode = memo(({ data, isConnectable, selected }: UnifiedAudioNodeProps) => {
  const { type, onChange, deletable } = data;
  const paramDOM = getParamDOM(type);
  const hasLeftHandle = type !== 'input' && type !== 'tonegenerator';
  const hasRightHandle = type !== 'output';
  const [editingParam, setEditingParam] = React.useState<string | null>(null);
  const [tempValue, setTempValue] = React.useState<string>('');

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

  const handleSliderDoubleClick = (key: string, currentValue: number) => {
    setEditingParam(key);
    setTempValue(currentValue.toString());
  };

  const handleInputSubmit = (key: string, param: ParamConfig) => {
    const numValue = parseFloat(tempValue);
    if (!isNaN(numValue) && 'min' in param && 'max' in param) {
      const clampedValue = Math.max(param.min, Math.min(param.max, numValue));
      if (onChange) {
        onChange(key, clampedValue);
      }
    }
    setEditingParam(null);
    setTempValue('');
  };

  const handleInputKeyDown = (e: React.KeyboardEvent, key: string, param: ParamConfig) => {
    if (e.key === 'Enter') {
      handleInputSubmit(key, param);
    } else if (e.key === 'Escape') {
      setEditingParam(null);
      setTempValue('');
    }
  };

  // Filter visualization for equalizer
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (type !== 'equalizer' || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 0.5;
    
    // Horizontal grid lines
    for (let i = 0; i <= 4; i++) {
      const y = (height / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Vertical grid lines
    for (let i = 0; i <= 4; i++) {
      const x = (width / 4) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Calculate filter response
    const filterType = data.filterType || 'lowpass';
    const frequency = data.frequency || 1000;
    const q = data.q || 1;

    // Draw frequency response curve
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.beginPath();

    for (let x = 0; x < width; x++) {
      // Map x to frequency (20Hz to 20kHz logarithmic)
      const freq = 20 * Math.pow(1000, x / width);
      
      // Calculate normalized frequency (0 to 1, where 1 is Nyquist)
      const normalizedFreq = freq / 22050;
      
      // Simple visualization based on filter type
      let y = height / 2; // Default center line
      const centerFreq = frequency / 22050;
      const bandwidth = 1 / q;
      
      if (filterType === 'lowpass') {
        if (normalizedFreq < centerFreq) {
          y = height / 2;
        } else {
          const rolloff = Math.min(1, (normalizedFreq - centerFreq) / (bandwidth * centerFreq));
          y = height / 2 + rolloff * (height / 2) * 0.8;
        }
      } else if (filterType === 'highpass') {
        if (normalizedFreq > centerFreq) {
          y = height / 2;
        } else {
          const rolloff = Math.min(1, (centerFreq - normalizedFreq) / (bandwidth * centerFreq));
          y = height / 2 + rolloff * (height / 2) * 0.8;
        }
      } else if (filterType === 'bandpass') {
        const distance = Math.abs(normalizedFreq - centerFreq) / (bandwidth * centerFreq);
        if (distance < 1) {
          y = height / 2 - (1 - distance) * (height / 2) * 0.6;
        } else {
          y = height / 2 + Math.min(distance - 1, 1) * (height / 2) * 0.4;
        }
      } else if (filterType === 'notch') {
        const distance = Math.abs(normalizedFreq - centerFreq) / (bandwidth * centerFreq);
        if (distance < 1) {
          y = height / 2 + (1 - distance) * (height / 2) * 0.6;
        } else {
          y = height / 2;
        }
      }
      
      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    
    ctx.stroke();

    // Draw center frequency marker
    const centerX = Math.log(frequency / 20) / Math.log(1000) * width;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, height);
    ctx.stroke();
    ctx.setLineDash([]);
  }, [type, data.filterType, data.frequency, data.q]);

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
      
      {type === 'equalizer' && (
        <div className="equalizer-visualization rounded-xl mx-3 mt-2">
          <canvas 
            ref={canvasRef} 
            width={240} 
            height={100}
            className="equalizer-canvas rounded-xl mt-4"
          />
        </div>
      )}
      
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
            } else if ((param.valueType === 'waveform' || param.valueType === 'filtertype') && 'options' in param) {
              // Render dropdown for waveform or filter type selection
              const value = data[param.key] as string || (param.valueType === 'waveform' ? 'sine' : 'lowpass');
              
              return (
                <div key={param.key} style={{ marginBottom: '16px' }}>
                  <label className="node-label">
                    <span>{param.label}</span>
                  </label>
                  <div className="node-select-container nodrag">
                    <Select
                      value={value}
                      onValueChange={(newValue) => {
                        if (onChange) {
                          onChange(param.key, newValue as any);
                        }
                      }}
                    >
                      <SelectTrigger className="node-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {param.options.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option.charAt(0).toUpperCase() + option.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            } else {
              // Render slider for numeric parameters
              const value = data[param.key] as number;
              const displayValue = formatValue(value, param.valueType as ValueType, param.key);
              const isEditing = editingParam === param.key;
              
              return (
                <div key={param.key} style={{ marginBottom: '16px' }}>
                  <label className="node-label">
                    <span style={{ marginRight: '8px' }}>{param.label}</span>
                    <span style={{ color: '#868e96', fontWeight: 'normal' }}>({displayValue})</span>
                  </label>
                  <div className="node-slider-container nodrag">
                    {isEditing ? (
                      <input
                        type="number"
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                        onKeyDown={(e) => handleInputKeyDown(e, param.key, param)}
                        onBlur={() => handleInputSubmit(param.key, param)}
                        autoFocus
                        className="node-input"
                        min={'min' in param ? param.min : 0}
                        max={'max' in param ? param.max : 100}
                        step={'step' in param ? param.step : 1}
                      />
                    ) : (
                      <input
                        type="range"
                        min={'min' in param ? param.min : 0}
                        max={'max' in param ? param.max : 100}
                        step={'step' in param ? param.step : 1}
                        value={value}
                        onChange={handleChange(param.key, param.valueType as ValueType)}
                        onDoubleClick={() => handleSliderDoubleClick(param.key, value)}
                        className="node-slider"
                      />
                    )}
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