export type NodeType = 'input' | 'reverb' | 'delay' | 'utility' | 'limiter' | 'distortion' | 'tonegenerator' | 'equalizer' | 'phaser' | 'flanger' | 'spectralgate' | 'spectralcompressor' | 'spectralpitch' | 'bitcrusher' | 'output';
export type EffectNodeType = 'reverb' | 'delay' | 'utility' | 'limiter' | 'distortion' | 'tonegenerator' | 'equalizer' | 'phaser' | 'flanger' | 'spectralgate' | 'spectralcompressor' | 'spectralpitch' | 'bitcrusher';
export type ValueType = 'percentage' | 'number' | 'milliseconds' | 'decibels' | 'pan' | 'boolean' | 'speed' | 'waveform' | 'filtertype';

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
  valueType: 'percentage' | 'number' | 'milliseconds' | 'decibels' | 'pan' | 'speed';
  min: number;
  max: number;
  step: number;
}

export interface BooleanParamConfig extends BaseParamConfig {
  valueType: 'boolean';
}

export interface SelectParamConfig extends BaseParamConfig {
  valueType: 'waveform' | 'filtertype';
  options: string[];
}

export type ParamConfig = SliderParamConfig | BooleanParamConfig | SelectParamConfig;

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
     min: 0.25,
     max: 4,
     step: 0.01,
     valueType: 'speed'
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
     min: 10,
     max: 2000,
     step: 1,
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
     min: 1,
     max: 1000,
     step: 1,
     valueType: 'milliseconds'
  },
  {
     label: 'Feedback',
     key: 'feedback', 
     min: 1,
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
    reverseL: boolean;
    reverseR: boolean;
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
     label: 'Invert L Phase',
     key: 'reverseL',
     valueType: 'boolean' as ValueType
  },
  {
     label: 'Invert R Phase',
     key: 'reverseR',
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

// tonegenerator
export interface ToneGeneratorNode extends BaseNode {
  type: 'tonegenerator';
  data: {
    waveform: string;
    frequency: number;
    volume: number;
  };
  deletable: true;
}

export const ToneGeneratorParamDOM: ParamConfig[] = [
  {
    label: 'Waveform',
    key: 'waveform',
    valueType: 'waveform',
    options: ['sine', 'triangle', 'sawtooth', 'square']
  },
  {
    label: 'Frequency',
    key: 'frequency',
    min: 20,
    max: 20000,
    step: 1,
    valueType: 'number'
  },
  {
    label: 'Volume',
    key: 'volume',
    min: -60,
    max: 0,
    step: 0.1,
    valueType: 'decibels'
  }
];

// equalizer
export interface EqualizerNode extends BaseNode {
  type: 'equalizer';
  data: {
    filterType: string;
    frequency: number;
    q: number;
  };
  deletable: true;
}

export const EqualizerParamDOM: ParamConfig[] = [
  {
    label: 'Filter Type',
    key: 'filterType',
    valueType: 'filtertype',
    options: ['lowpass', 'highpass', 'bandpass', 'notch']
  },
  {
    label: 'Frequency',
    key: 'frequency',
    min: 20,
    max: 7777,
    step: 1,
    valueType: 'number'
  },
  {
    label: 'Q Factor',
    key: 'q',
    min: 0.1,
    max: 30,
    step: 0.1,
    valueType: 'number'
  }
];

// phaser
export interface PhaserNode extends BaseNode {
  type: 'phaser';
  data: {
    rate: number;
    depth: number;
    feedback: number;
    mix: number;
  };
  deletable: true;
}

export const PhaserParamDOM: ParamConfig[] = [
  {
    label: 'Rate',
    key: 'rate',
    min: 0.1,
    max: 10,
    step: 0.1,
    valueType: 'number'
  },
  {
    label: 'Depth',
    key: 'depth',
    min: 0,
    max: 100,
    step: 1,
    valueType: 'percentage'
  },
  {
    label: 'Feedback',
    key: 'feedback',
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

// flanger
export interface FlangerNode extends BaseNode {
  type: 'flanger';
  data: {
    rate: number;
    depth: number;
    feedback: number;
    delay: number;
    mix: number;
  };
  deletable: true;
}

export const FlangerParamDOM: ParamConfig[] = [
  {
    label: 'Rate',
    key: 'rate',
    min: 0.1,
    max: 10,
    step: 0.1,
    valueType: 'number'
  },
  {
    label: 'Depth',
    key: 'depth',
    min: 0,
    max: 100,
    step: 1,
    valueType: 'percentage'
  },
  {
    label: 'Feedback',
    key: 'feedback',
    min: -100,
    max: 100,
    step: 1,
    valueType: 'percentage'
  },
  {
    label: 'Delay',
    key: 'delay',
    min: 1,
    max: 20,
    step: 0.1,
    valueType: 'milliseconds'
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

// spectralgate
export interface SpectralGateNode extends BaseNode {
  type: 'spectralgate';
  data: {
    cutoff: number;
  };
  deletable: true;
}

export const SpectralGateParamDOM: ParamConfig[] = [
  {
    label: 'Cutoff',
    key: 'cutoff',
    min: -60,
    max: 24,
    step: 0.1,
    valueType: 'decibels'
  }
];

// spectralcompressor
export interface SpectralCompressorNode extends BaseNode {
  type: 'spectralcompressor';
  data: {
    attack: number;
    release: number;
    inputGain: number;
    threshold: number;
    ratio: number;
  };
  deletable: true;
}

export const SpectralCompressorParamDOM: ParamConfig[] = [
  {
    label: 'Threshold',
    key: 'threshold',
    min: -60,
    max: 0,
    step: 0.1,
    valueType: 'decibels'
  },
  {
    label: 'Ratio',
    key: 'ratio',
    min: 0.5,
    max: 1.5,
    step: 0.01,
    valueType: 'number'
  },
  {
    label: 'Attack',
    key: 'attack',
    min: 0.1,
    max: 100,
    step: 0.1,
    valueType: 'milliseconds'
  },
  {
    label: 'Release',
    key: 'release',
    min: 1,
    max: 500,
    step: 0.1,
    valueType: 'milliseconds'
  },
  {
    label: 'Input Gain',
    key: 'inputGain',
    min: -24,
    max: 24,
    step: 0.1,
    valueType: 'decibels'
  }
];

// spectralpitch
export interface SpectralPitchNode extends BaseNode {
  type: 'spectralpitch';
  data: {
    pitch: number;
    mix: number;
  };
  deletable: true;
}

export const SpectralPitchParamDOM: ParamConfig[] = [
  {
    label: 'Pitch',
    key: 'pitch',
    min: -1200,
    max: 1200,
    step: 10,
    valueType: 'number'
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

// bitcrusher
export interface BitcrusherNode extends BaseNode {
  type: 'bitcrusher';
  data: {
    mix: number;
    rate: number;
    bits: number;
  };
  deletable: true;
}

export const BitcrusherParamDOM: ParamConfig[] = [
  {
    label: 'Mix',
    key: 'mix',
    min: 0,
    max: 100,
    step: 1,
    valueType: 'percentage'
  },
  {
    label: 'Sample Rate',
    key: 'rate',
    min: 2000,
    max: 40000,
    step: 100,
    valueType: 'number'
  },
  {
    label: 'Bit Depth',
    key: 'bits',
    min: 1,
    max: 16,
    step: 1,
    valueType: 'number'
  }
];


// output

export interface OutputNode extends BaseNode {
  type: 'output';
  data: {};
  deletable: false;
}

export const OutputParamDOM: ParamConfig[] = [];

export type AudioNode = InputNode | ReverbNode | DelayNode | UtilityNode | LimiterNode | DistortionNode | ToneGeneratorNode | EqualizerNode | PhaserNode | FlangerNode | SpectralGateNode | SpectralCompressorNode | SpectralPitchNode | BitcrusherNode | OutputNode;

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
