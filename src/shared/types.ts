// Shared types between background, content, and sidepanel

export interface NodeData {
  id: string;
  type: 'input' | 'reverb' | 'output';
  params: Record<string, number>;
}

export interface EdgeData {
  id: string;
  source: string;
  target: string;
}

export interface AudioGraphData {
  nodes: NodeData[];
  edges: EdgeData[];
}

export interface Settings {
  enabled: boolean;
  speed: number;    // Legacy, will be moved to graph
  reverb: number;   // Legacy, will be moved to graph
  audioGraph: AudioGraphData;
}