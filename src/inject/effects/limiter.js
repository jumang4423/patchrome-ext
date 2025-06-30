export function createLimiterNode(audioContext, node, connections) {
  const inputGain = audioContext.createGain();
  const compressor = audioContext.createDynamicsCompressor();
  const thresholdDb = node.params.threshold !== undefined ? node.params.threshold : -6;
  compressor.threshold.value = thresholdDb;
  compressor.knee.value = 0; 
  compressor.ratio.value = 20; 
  compressor.attack.value = 0.003; 
  compressor.release.value = 0.1; 
  inputGain.connect(compressor);
  return {
    type: 'limiter',
    input: inputGain,
    output: compressor,
    inputGain,
    compressor,
    params: node.params,
    audioContext
  };
}
export function updateLimiterParams(nodeData, params) {
  if (params.threshold !== undefined && params.threshold !== nodeData.params.threshold) {
    nodeData.compressor.threshold.value = params.threshold;
    nodeData.params.threshold = params.threshold;
  }
}