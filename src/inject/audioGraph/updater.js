import { effectUpdaters } from '../effects/index.js';
export function updateAudioGraphParams(nodes, updates) {
  for (const update of updates) {
    const nodeData = nodes.get(update.nodeId);
    if (!nodeData) {
      continue;
    }
    if (nodeData.type === 'input' && update.params.speed !== undefined) {
      const mediaElement = nodeData.audioNode.mediaElement;
      if (mediaElement && mediaElement.preservesPitch !== undefined) {
        const newSpeed = update.params.speed;
        mediaElement.playbackRate = newSpeed;
        if (Math.abs(newSpeed - 1.0) < 0.01) {
          mediaElement.preservesPitch = true;
        } else {
          mediaElement.preservesPitch = false;
        }
        nodeData.params.speed = newSpeed;
      }
    } else if (effectUpdaters[nodeData.type]) {
      effectUpdaters[nodeData.type](nodeData, update.params);
    }
  }
}