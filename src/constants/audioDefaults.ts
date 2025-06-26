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
    reverse: false
  },
  limiter: {
    threshold: -6,
    mix: 100
  },
  output: {}
} as const;

export type AudioNodeType = keyof typeof AUDIO_PARAM_DEFAULTS;
export type AudioParamKey<T extends AudioNodeType> = keyof typeof AUDIO_PARAM_DEFAULTS[T];