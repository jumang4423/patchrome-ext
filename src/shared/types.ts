export interface NodeData {
  id: string;
  type: 'input' | 'reverb' | 'delay' | 'utility' | 'limiter' | 'distortion' | 'tonegenerator' | 'equalizer' | 'phaser' | 'flanger' | 'spectralgate' | 'spectralcompressor' | 'spectralpitch' | 'bitcrusher' | 'output';
  params: Record<string, number | string>;
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
  audioGraph: AudioGraphData;
}