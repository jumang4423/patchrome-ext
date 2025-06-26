export type NodeType = 'input' | 'reverb' | 'output';
export type EffectNodeType = 'reverb';
export type ValueType = 'percentage' | 'number';

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
];

// output

export interface OutputNode extends BaseNode {
  type: 'output';
  data: {};
  deletable: false;
}

export const OutputParamDOM = [];

export type AudioNode = InputNode | ReverbNode | OutputNode;

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
