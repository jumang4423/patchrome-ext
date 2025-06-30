import { settings, spectralGateWorkletUrl, spectralCompressorWorkletUrl, spectralPitchWorkletUrl } from '../config.js';
import { effectCreators } from '../effects/index.js';
export async function buildAudioGraph(audioContext, source, nodeGraph, customDestination) {
  const nodes = new Map();
  const connections = [];
  if (!settings.enabled) {
    source.connect(customDestination || audioContext.destination);
    nodes.set('bypass', { type: 'bypass', audioNode: source });
    return nodes;
  }
  for (const node of nodeGraph.nodes) {
    if (node.type === 'input') {
      nodes.set(node.id, {
        type: 'input',
        audioNode: source,
        params: node.params
      });
    } else if (node.type === 'output') {
      nodes.set(node.id, {
        type: 'output',
        audioNode: customDestination || audioContext.destination
      });
    } else if (effectCreators[node.type]) {
      const effectNode = await effectCreators[node.type](audioContext, node, connections);
      nodes.set(node.id, effectNode);
    } else {
    }
  }
  for (const edge of nodeGraph.edges) {
    const sourceNode = nodes.get(edge.source);
    const targetNode = nodes.get(edge.target);
    if (sourceNode && targetNode) {
      let outputNode;
      let inputNode;
      if (sourceNode.type === 'input') {
        outputNode = sourceNode.audioNode;
      } else if (sourceNode.output) {
        outputNode = sourceNode.output;
      } else {
        outputNode = sourceNode.audioNode;
      }
      if (targetNode.type === 'output') {
        inputNode = targetNode.audioNode;
      } else if (targetNode.input) {
        inputNode = targetNode.input;
      } else {
        inputNode = targetNode.audioNode;
      }
      try {
        outputNode.connect(inputNode);
      } catch (e) {
      }
    }
  }
  for (const connection of connections) {
    try {
      connection.from.connect(connection.to);
    } catch (e) {
    }
  }
  return nodes;
}