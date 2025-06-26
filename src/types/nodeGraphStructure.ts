export type NodeType = 'input' | 'effect' | 'output';
export type EffectNodeType = 'reverb';

export interface BaseNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
}

export interface InputNode extends BaseNode {
  type: 'input';
  data: {
    speed: number;
  };
}

export interface EffectNode extends BaseNode {
  type: 'effect';
  data: {
    effectType:  EffectNodeType;
    params: ReverbParams;
  };
}

export interface ReverbParams {
  type: 'reverb';
  mix: number;
}

export interface OutputNode extends BaseNode {
  type: 'output';
  data: Record<string, never>;
}

export type AudioNode = InputNode | EffectNode | OutputNode;

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
