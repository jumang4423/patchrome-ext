export interface NodeGraphPreset {
  id: string;
  name: string;
  description?: string;
  nodes: Array<{
    id: string;
    type: string;
    position: { x: number; y: number };
    data: Record<string, any>;
    deletable: boolean;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;
    targetHandle?: string;
  }>;
  createdAt: number;
  updatedAt: number;
}

export interface PresetsData {
  version: number;
  presets: NodeGraphPreset[];
}

export const PRESETS_STORAGE_KEY = 'patchrome-node-graph-presets';
export const PRESETS_VERSION = 2;