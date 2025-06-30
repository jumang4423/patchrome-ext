export function createDelayNode(audioContext, node, connections) {
  const inputGain = audioContext.createGain();
  const dryGain = audioContext.createGain();
  const wetGain = audioContext.createGain();
  const delayNode = audioContext.createDelay(2); 
  const feedbackGain = audioContext.createGain();
  const merger = audioContext.createGain();
  const delayTime = node.params.delayTime !== undefined ? node.params.delayTime / 1000 : 0.5;
  delayNode.delayTime.value = delayTime;
  const feedbackAmount = (node.params.feedback || 0) / 100;
  feedbackGain.gain.value = feedbackAmount;
  const wetAmount = (node.params.mix || 0) / 100;
  const dryAmount = 1 - wetAmount;
  dryGain.gain.value = dryAmount;
  wetGain.gain.value = wetAmount;
  inputGain.connect(dryGain);
  inputGain.connect(delayNode);
  connections.push({ from: delayNode, to: feedbackGain });
  connections.push({ from: feedbackGain, to: delayNode }); 
  connections.push({ from: delayNode, to: wetGain });
  connections.push({ from: wetGain, to: merger });
  connections.push({ from: dryGain, to: merger });
  return {
    type: 'delay',
    input: inputGain,
    output: merger,
    inputGain,
    dryGain,
    wetGain,
    delayNode,
    feedbackGain,
    merger,
    params: node.params,
    audioContext
  };
}
export function updateDelayParams(nodeData, params) {
  if (params.delayTime !== undefined && params.delayTime !== nodeData.params.delayTime) {
    nodeData.delayNode.delayTime.value = params.delayTime / 1000;
    nodeData.params.delayTime = params.delayTime;
  }
  if (params.feedback !== undefined && params.feedback !== nodeData.params.feedback) {
    nodeData.feedbackGain.gain.value = params.feedback / 100;
    nodeData.params.feedback = params.feedback;
  }
  if (params.mix !== undefined && params.mix !== nodeData.params.mix) {
    const wetAmount = params.mix / 100;
    const dryAmount = 1 - wetAmount;
    nodeData.dryGain.gain.value = dryAmount;
    nodeData.wetGain.gain.value = wetAmount;
    nodeData.params.mix = params.mix;
  }
}