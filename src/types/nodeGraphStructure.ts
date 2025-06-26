export type NodeType = 'input' | 'reverb' | 'delay' | 'utility' | 'limiter' | 'distortion' | 'output';
export type EffectNodeType = 'reverb' | 'delay' | 'utility' | 'limiter' | 'distortion';
export type ValueType = 'percentage' | 'number' | 'milliseconds' | 'decibels' | 'pan' | 'boolean';

export interface BaseNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: Record<string, any>;
  deletable: boolean;
}

export interface BaseParamConfig {
  label: string;
  key: string;
  valueType: ValueType;
}

export interface SliderParamConfig extends BaseParamConfig {
  valueType: 'percentage' | 'number' | 'milliseconds' | 'decibels' | 'pan';
  min: number;
  max: number;
  step: number;
}

export interface BooleanParamConfig extends BaseParamConfig {
  valueType: 'boolean';
}

export type ParamConfig = SliderParamConfig | BooleanParamConfig;

// input
export interface InputNode extends BaseNode {
  type: 'input';
  data: {
    speed: number;
  };
  deletable: false;
}

export const InputParamDOM: ParamConfig[] = [
  {
     label: 'Speed', 
     key: 'speed',
     min: 0.5,
     max: 1.5,
     step: 0.01,
     valueType: 'number'
  },
];

// reverb
export interface ReverbNode extends BaseNode {
  type: 'reverb';
  data: {
    mix: number;
    decay: number;
    size: number;
  };
  deletable: true;
}

export const ReverbParamDOM: ParamConfig[] = [
  {
     label: 'Mix',
     key: 'mix', 
     min: 0,
     max: 100,
     step: 1,
     valueType: 'percentage'
  },
  {
     label: 'Decay',
     key: 'decay', 
     min: 100,
     max: 2000,
     step: 10,
     valueType: 'milliseconds'
  },
  {
     label: 'Size',
     key: 'size', 
     min: 0,
     max: 100,
     step: 1,
     valueType: 'percentage'
  },
];

// delay
export interface DelayNode extends BaseNode {
  type: 'delay';
  data: {
    mix: number;
    delayTime: number;
    feedback: number;
  };
  deletable: true;
}

export const DelayParamDOM: ParamConfig[] = [
  {
     label: 'Mix',
     key: 'mix', 
     min: 0,
     max: 100,
     step: 1,
     valueType: 'percentage'
  },
  {
     label: 'Delay Time',
     key: 'delayTime', 
     min: 0,
     max: 1000,
     step: 10,
     valueType: 'milliseconds'
  },
  {
     label: 'Feedback',
     key: 'feedback', 
     min: 0,
     max: 100,
     step: 1,
     valueType: 'percentage'
  },
];

// utility
export interface UtilityNode extends BaseNode {
  type: 'utility';
  data: {
    volume: number;
    pan: number;
    reverse: boolean;
  };
  deletable: true;
}

export const UtilityParamDOM: ParamConfig[] = [
  {
     label: 'Volume',
     key: 'volume', 
     min: -60,
     max: 12,
     step: 0.1,
     valueType: 'decibels' as ValueType
  },
  {
     label: 'Pan',
     key: 'pan', 
     min: -100,
     max: 100,
     step: 1,
     valueType: 'pan' as ValueType
  },
  {
     label: 'Phase Reversal',
     key: 'reverse',
     valueType: 'boolean' as ValueType
  }
];

// limiter
export interface LimiterNode extends BaseNode {
  type: 'limiter';
  data: {
    threshold: number;
  };
  deletable: true;
}

export const LimiterParamDOM: ParamConfig[] = [
  {
     label: 'Threshold',
     key: 'threshold', 
     min: -60,
     max: 0,
     step: 0.1,
     valueType: 'decibels'
  }
];

// distortion
export interface DistortionNode extends BaseNode {
  type: 'distortion';
  data: {
    drive: number;
    mix: number;
  };
  deletable: true;
}

export const DistortionParamDOM: ParamConfig[] = [
  {
     label: 'Drive',
     key: 'drive', 
     min: 0,
     max: 100,
     step: 1,
     valueType: 'percentage'
  },
  {
     label: 'Mix',
     key: 'mix', 
     min: 0,
     max: 100,
     step: 1,
     valueType: 'percentage'
  }
];

// output

export interface OutputNode extends BaseNode {
  type: 'output';
  data: {};
  deletable: false;
}

export const OutputParamDOM: ParamConfig[] = [];

export type AudioNode = InputNode | ReverbNode | DelayNode | UtilityNode | LimiterNode | DistortionNode | OutputNode;

export interface Connection {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface NodeGraph {
  nodes: AudioNode[];
  connections: Connection[];
}

export interface NodeGraphSettings {
  nodeGraph: NodeGraph;
}
