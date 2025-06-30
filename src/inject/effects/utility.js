export function createUtilityNode(audioContext, node, connections) {
  const inputGain = audioContext.createGain();
  const gainNode = audioContext.createGain();
  const pannerNode = audioContext.createStereoPanner();
  const splitter = audioContext.createChannelSplitter(2);
  const merger = audioContext.createChannelMerger(2);
  const leftPhaseGain = audioContext.createGain();
  const rightPhaseGain = audioContext.createGain();
  const volumeDb = node.params.volume !== undefined ? node.params.volume : 0;
  let gainValue;
  if (volumeDb <= -60) {
    gainValue = 0; 
  } else {
    gainValue = Math.pow(10, volumeDb / 20);
  }
  gainNode.gain.value = gainValue;
  const panValue = node.params.pan !== undefined ? node.params.pan / 100 : 0;
  pannerNode.pan.value = panValue;
  const phaseReverseL = node.params.reverseL !== undefined ? node.params.reverseL : false;
  const phaseReverseR = node.params.reverseR !== undefined ? node.params.reverseR : false;
  leftPhaseGain.gain.value = phaseReverseL ? -1 : 1;
  rightPhaseGain.gain.value = phaseReverseR ? -1 : 1;
  if (phaseReverseL || phaseReverseR) {
    inputGain.connect(gainNode);
    gainNode.connect(splitter);
    splitter.connect(leftPhaseGain, 0);
    leftPhaseGain.connect(merger, 0, 0);
    splitter.connect(rightPhaseGain, 1);
    rightPhaseGain.connect(merger, 0, 1);
    merger.connect(pannerNode);
  } else {
    inputGain.connect(gainNode);
    gainNode.connect(pannerNode);
  }
  if (phaseReverseL || phaseReverseR) {
    connections.push({ from: gainNode, to: splitter });
    connections.push({ from: leftPhaseGain, to: merger });
    connections.push({ from: rightPhaseGain, to: merger });
    connections.push({ from: merger, to: pannerNode });
  } else {
    connections.push({ from: gainNode, to: pannerNode });
  }
  return {
    type: 'utility',
    input: inputGain,
    output: pannerNode,
    inputGain,
    gainNode,
    pannerNode,
    splitter,
    merger,
    leftPhaseGain,
    rightPhaseGain,
    params: node.params,
    audioContext
  };
}
export function updateUtilityParams(nodeData, params) {
  if (params.volume !== undefined && params.volume !== nodeData.params.volume) {
    let gainValue;
    if (params.volume <= -60) {
      gainValue = 0;
    } else {
      gainValue = Math.pow(10, params.volume / 20);
    }
    nodeData.gainNode.gain.value = gainValue;
    nodeData.params.volume = params.volume;
  }
  if (params.pan !== undefined && params.pan !== nodeData.params.pan) {
    nodeData.pannerNode.pan.value = params.pan / 100;
    nodeData.params.pan = params.pan;
  }
  if (params.reverseL !== undefined && params.reverseL !== nodeData.params.reverseL) {
    nodeData.leftPhaseGain.gain.value = params.reverseL ? -1 : 1;
    nodeData.params.reverseL = params.reverseL;
  }
  if (params.reverseR !== undefined && params.reverseR !== nodeData.params.reverseR) {
    nodeData.rightPhaseGain.gain.value = params.reverseR ? -1 : 1;
    nodeData.params.reverseR = params.reverseR;
  }
}