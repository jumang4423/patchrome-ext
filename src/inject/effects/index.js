export { createReverbNode, updateReverbParams } from './reverb.js';
export { createDelayNode, updateDelayParams } from './delay.js';
export { createUtilityNode, updateUtilityParams } from './utility.js';
export { createLimiterNode, updateLimiterParams } from './limiter.js';
export { createDistortionNode, updateDistortionParams } from './distortion.js';
export { createToneGeneratorNode, updateToneGeneratorParams } from './toneGenerator.js';
export { createEqualizerNode, updateEqualizerParams } from './equalizer.js';
export { createPhaserNode, updatePhaserParams } from './phaser.js';
export { createFlangerNode, updateFlangerParams } from './flanger.js';
export { createBitcrusherNode, updateBitcrusherParams } from './bitcrusher.js';
export { createSpectralGateNode, updateSpectralGateParams } from './spectralGate.js';
export { createSpectralCompressorNode, updateSpectralCompressorParams } from './spectralCompressor.js';
export { createSpectralPitchNode, updateSpectralPitchParams } from './spectralPitch.js';
export const effectCreators = {
  reverb: createReverbNode,
  delay: createDelayNode,
  utility: createUtilityNode,
  limiter: createLimiterNode,
  distortion: createDistortionNode,
  tonegenerator: createToneGeneratorNode,
  equalizer: createEqualizerNode,
  phaser: createPhaserNode,
  flanger: createFlangerNode,
  bitcrusher: createBitcrusherNode,
  spectralgate: createSpectralGateNode,
  spectralcompressor: createSpectralCompressorNode,
  spectralpitch: createSpectralPitchNode
};
export const effectUpdaters = {
  reverb: updateReverbParams,
  delay: updateDelayParams,
  utility: updateUtilityParams,
  limiter: updateLimiterParams,
  distortion: updateDistortionParams,
  tonegenerator: updateToneGeneratorParams,
  equalizer: updateEqualizerParams,
  phaser: updatePhaserParams,
  flanger: updateFlangerParams,
  bitcrusher: updateBitcrusherParams,
  spectralgate: updateSpectralGateParams,
  spectralcompressor: updateSpectralCompressorParams,
  spectralpitch: updateSpectralPitchParams
};