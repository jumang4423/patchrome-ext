function createReverbImpulse(audioContext, size = 50, decay = 1000) {
  const duration = 0.1 + (size / 100) * 1.9;
  const decayRate = Math.max(1.0, 10.0 - (decay / 1000) * 4.0);
  const length = audioContext.sampleRate * duration;
  const impulse = audioContext.createBuffer(2, length, audioContext.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const channelData = impulse.getChannelData(channel);
    const sizeMultiplier = 0.5 + (size / 100) * 0.5;
    const earlyReflections = [
      { time: 0.015 * sizeMultiplier, gain: 0.25 },  
      { time: 0.025 * sizeMultiplier, gain: 0.15 },  
      { time: 0.035 * sizeMultiplier, gain: 0.1 },   
      { time: 0.045 * sizeMultiplier, gain: 0.075 }  
    ];
    for (let i = 0; i < length; i++) {
      const t = i / audioContext.sampleRate;
      let sample = 0;
      for (const reflection of earlyReflections) {
        const reflectionSample = Math.floor(reflection.time * audioContext.sampleRate);
        if (i === reflectionSample) {
          sample += (Math.random() * 2 - 1) * reflection.gain;
        }
      }
      sample += (Math.random() * 2 - 1) * Math.pow(1 - i / length, decayRate) * 0.25;
      if (channel === 1) {
        sample *= 0.9 + Math.random() * 0.2;
      }
      channelData[i] = sample;
    }
  }
  return impulse;
}
export function createReverbNode(audioContext, node, connections) {
  const inputGain = audioContext.createGain(); 
  const dryGain = audioContext.createGain();
  const wetGain = audioContext.createGain();
  const convolver = audioContext.createConvolver();
  const merger = audioContext.createGain();
  const size = node.params.size !== undefined ? node.params.size : 50;
  const decay = node.params.decay !== undefined ? node.params.decay : 1000;
  convolver.buffer = createReverbImpulse(audioContext, size, decay);
  const wetAmount = (node.params.mix || 0) / 100;
  const dryAmount = 1 - wetAmount;
  dryGain.gain.value = dryAmount;
  wetGain.gain.value = wetAmount;
  inputGain.connect(dryGain);
  inputGain.connect(convolver);
  connections.push({ from: convolver, to: wetGain });
  connections.push({ from: wetGain, to: merger });
  connections.push({ from: dryGain, to: merger });
  return {
    type: 'reverb',
    input: inputGain,
    output: merger,
    inputGain,
    dryGain,
    wetGain,
    convolver,
    merger,
    params: node.params,
    audioContext
  };
}
export function updateReverbParams(nodeData, params) {
  if (params.mix !== undefined && params.mix !== nodeData.params.mix) {
    const wetAmount = params.mix / 100;
    const dryAmount = 1 - wetAmount;
    nodeData.dryGain.gain.value = dryAmount;
    nodeData.wetGain.gain.value = wetAmount;
    nodeData.params.mix = params.mix;
  }
  if ((params.size !== undefined && params.size !== nodeData.params.size) ||
      (params.decay !== undefined && params.decay !== nodeData.params.decay)) {
    const size = params.size !== undefined ? params.size : nodeData.params.size;
    const decay = params.decay !== undefined ? params.decay : nodeData.params.decay;
    nodeData.convolver.buffer = createReverbImpulse(nodeData.audioContext, size, decay);
    if (params.size !== undefined) nodeData.params.size = params.size;
    if (params.decay !== undefined) nodeData.params.decay = params.decay;
  }
}