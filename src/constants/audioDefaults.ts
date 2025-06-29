export const AUDIO_PARAM_DEFAULTS = {
  input: {
    speed: 1.0
  },
  reverb: {
    mix: 0,
    decay: 1000,
    size: 50
  },
  delay: {
    mix: 0,
    delayTime: 500,
    feedback: 50
  },
  utility: {
    volume: 0,
    pan: 0,
    reverseL: false,
    reverseR: false
  },
  limiter: {
    threshold: -6
  },
  distortion: {
    drive: 50,
    mix: 50
  },
  tonegenerator: {
    waveform: 'sine',
    frequency: 440,
    volume: -12
  },
  equalizer: {
    filterType: 'lowpass',
    frequency: 1000,
    q: 1
  },
  phaser: {
    rate: 1,
    depth: 50,
    feedback: 50,
    mix: 50
  },
  flanger: {
    rate: 0.5,
    depth: 50,
    feedback: 50,
    delay: 5,
    mix: 50
  },
  spectralgate: {
    cutoff: -40
  },
  spectralcompressor: {
    threshold: -45.1,
    ratio: 1.2,
    attack: 30,
    release: 200,
    inputGain: 10
  },
  output: {}
} as const;

export type AudioNodeType = keyof typeof AUDIO_PARAM_DEFAULTS;
export type AudioParamKey<T extends AudioNodeType> = keyof typeof AUDIO_PARAM_DEFAULTS[T];