export const settings = {
  enabled: true,
  audioGraph: {
    nodes: [
      { id: '1', type: 'input', params: { speed: 1.0 } },
      { id: '3', type: 'output', params: {} }
    ],
    edges: [
      { id: 'e1-3', source: '1', target: '3' },
    ]
  }
};
export let spectralGateWorkletUrl = null;
export let spectralCompressorWorkletUrl = null;
export let spectralPitchWorkletUrl = null;
export function setWorkletUrls(urls) {
  spectralGateWorkletUrl = urls.spectralGate;
  spectralCompressorWorkletUrl = urls.spectralCompressor;
  spectralPitchWorkletUrl = urls.spectralPitch;
}
export const processedElements = new WeakSet();
export const audioContexts = new WeakMap();
export const audioGraphs = new WeakMap();