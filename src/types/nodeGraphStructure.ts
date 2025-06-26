export type NodeType = 'input' | 'reverb' | 'delay' | 'gain' | 'output';
export type EffectNodeType = 'reverb' | 'delay' | 'gain';
export type ValueType = 'percentage' | 'number' | 'milliseconds' | 'decibels' | 'pan';

export interface BaseNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: Record<string, any>;
  deletable: boolean;
}

// input
export interface InputNode extends BaseNode {
  type: 'input';
  data: {
    speed: number;
  };
  deletable: false;
}

export const InputParamDOM = [
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

export const ReverbParamDOM = [
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

export const DelayParamDOM = [
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

// gain
export interface GainNode extends BaseNode {
  type: 'gain';
  data: {
    volume: number;
    pan: number;
  };
  deletable: true;
}

export const GainParamDOM = [
  {
     label: 'Volume',
     key: 'volume', 
     min: -60,
     max: 12,
     step: 0.1,
     valueType: 'decibels'
  },
  {
     label: 'Pan',
     key: 'pan', 
     min: -100,
     max: 100,
     step: 1,
     valueType: 'pan'
  },
];

// output

export interface OutputNode extends BaseNode {
  type: 'output';
  data: {};
  deletable: false;
}

export const OutputParamDOM = [];

export type AudioNode = InputNode | ReverbNode | DelayNode | GainNode | OutputNode;

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
