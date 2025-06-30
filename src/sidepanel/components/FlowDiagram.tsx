import React, { useCallback, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Controls,
  Background,
  MiniMap,
  BackgroundVariant,
  NodeChange,
  EdgeChange,
  applyNodeChanges,
  applyEdgeChanges,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import UnifiedAudioNode from './nodes/UnifiedAudioNode';
import MaxStyleEdge from './edges/MaxStyleEdge';
import AddEffectButton from './AddEffectButton';
import AddEffectDialog from './AddEffectDialog';
import MenuButton from './MenuButton';
import InfoModal from './InfoModal';
import LogoButton from './LogoButton';
import PresetManager from './PresetManager';
import { AudioGraphData } from '../../shared/types';
import { AUDIO_PARAM_DEFAULTS } from '../../constants/audioDefaults';
import { NodeGraphPreset } from '../../types/presets';
import { EffectNodeType, NodeType } from '../../types/nodeGraphStructure';

const nodeTypes = {
  unifiedAudio: UnifiedAudioNode,
};

const edgeTypes = {
  maxStyle: MaxStyleEdge,
};

const initialEdges: Edge[] = [
  { id: 'e1-3', source: '1', target: '3', type: 'maxStyle' },
];

interface FlowDiagramProps {
  audioGraph: AudioGraphData;
  onGraphChange: (graph: AudioGraphData) => void;
  isEnabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
}

const FlowDiagramInner: React.FC<FlowDiagramProps> = ({ audioGraph, onGraphChange, isEnabled, onEnabledChange }) => {
  const [nodeIdCounter, setNodeIdCounter] = React.useState(4);
  const { getViewport } = useReactFlow();
  const [nodes, setNodes] = useNodesState([]);
  const [edges, setEdges] = useEdgesState([]);
  const [isInitialized, setIsInitialized] = React.useState(false);
  const [hasLoadedFromStorage, setHasLoadedFromStorage] = React.useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = React.useState(false);
  const [isEffectDialogOpen, setIsEffectDialogOpen] = React.useState(false);
  const [isPresetManagerOpen, setIsPresetManagerOpen] = React.useState(false);
  
  // Helper function to save current state to localStorage
  const saveToLocalStorage = useCallback((nodesList: Node[], edgesList: Edge[]) => {
    const nodeData = nodesList.map(node => {
      const baseNode = {
        id: node.id,
        type: node.data.type as 'input' | 'reverb' | 'delay' | 'gain' | 'output',
        params: {} as Record<string, number>
      };
      
      if (node.data.type === 'input') {
        baseNode.params = { speed: node.data.speed ?? AUDIO_PARAM_DEFAULTS.input.speed };
      } else if (node.data.type === 'reverb') {
        baseNode.params = { 
          mix: node.data.mix ?? AUDIO_PARAM_DEFAULTS.reverb.mix,
          decay: node.data.decay ?? AUDIO_PARAM_DEFAULTS.reverb.decay,
          size: node.data.size ?? AUDIO_PARAM_DEFAULTS.reverb.size
        };
      } else if (node.data.type === 'delay') {
        baseNode.params = { 
          mix: node.data.mix ?? AUDIO_PARAM_DEFAULTS.delay.mix,
          delayTime: node.data.delayTime ?? AUDIO_PARAM_DEFAULTS.delay.delayTime,
          feedback: node.data.feedback ?? AUDIO_PARAM_DEFAULTS.delay.feedback
        };
      } else if (node.data.type === 'utility') {
        baseNode.params = { 
          volume: node.data.volume ?? AUDIO_PARAM_DEFAULTS.utility.volume,
          pan: node.data.pan ?? AUDIO_PARAM_DEFAULTS.utility.pan,
          reverseL: node.data.reverseL ?? AUDIO_PARAM_DEFAULTS.utility.reverseL,
          reverseR: node.data.reverseR ?? AUDIO_PARAM_DEFAULTS.utility.reverseR
        };
      } else if (node.data.type === 'limiter') {
        baseNode.params = { 
          threshold: node.data.threshold ?? AUDIO_PARAM_DEFAULTS.limiter.threshold
        };
      } else if (node.data.type === 'distortion') {
        baseNode.params = { 
          drive: node.data.drive ?? AUDIO_PARAM_DEFAULTS.distortion.drive,
          mix: node.data.mix ?? AUDIO_PARAM_DEFAULTS.distortion.mix
        };
      } else if (node.data.type === 'tonegenerator') {
        baseNode.params = { 
          waveform: node.data.waveform ?? 'sine',
          frequency: node.data.frequency ?? 440,
          volume: node.data.volume ?? -12
        };
      } else if (node.data.type === 'equalizer') {
        baseNode.params = { 
          filterType: node.data.filterType ?? 'lowpass',
          frequency: node.data.frequency ?? 1000,
          q: node.data.q ?? 1
        };
      } else if (node.data.type === 'phaser') {
        baseNode.params = { 
          rate: node.data.rate !== undefined ? node.data.rate : 0.5,
          depth: node.data.depth !== undefined ? node.data.depth : 50,
          feedback: node.data.feedback !== undefined ? node.data.feedback : 0,
          mix: node.data.mix || 0
        };
      } else if (node.data.type === 'flanger') {
        baseNode.params = { 
          rate: node.data.rate !== undefined ? node.data.rate : 0.5,
          depth: node.data.depth !== undefined ? node.data.depth : 50,
          feedback: node.data.feedback !== undefined ? node.data.feedback : 0,
          delay: node.data.delay !== undefined ? node.data.delay : 5,
          mix: node.data.mix || 0
        };
      } else if (node.data.type === 'spectralgate') {
        baseNode.params = { 
          cutoff: node.data.cutoff !== undefined ? node.data.cutoff : -20,
          fftSize: node.data.fftSize !== undefined ? node.data.fftSize : 2048
        };
      } else if (node.data.type === 'spectralcompressor') {
        baseNode.params = { 
          attack: node.data.attack !== undefined ? node.data.attack : 30,
          release: node.data.release !== undefined ? node.data.release : 200,
          inputGain: node.data.inputGain !== undefined ? node.data.inputGain : 10,
          threshold: node.data.threshold !== undefined ? node.data.threshold : -45.1,
          ratio: node.data.ratio !== undefined ? node.data.ratio : 1.2
        };
      } else if (node.data.type === 'spectralpitch') {
        baseNode.params = { 
          pitch: node.data.pitch !== undefined ? node.data.pitch : 0,
          mix: node.data.mix !== undefined ? node.data.mix : 100,
          fftSize: node.data.fftSize !== undefined ? node.data.fftSize : 2048
        };
      } else if (node.data.type === 'bitcrusher') {
        baseNode.params = { 
          mix: node.data.mix !== undefined ? node.data.mix : 0,
          rate: node.data.rate !== undefined ? node.data.rate : 30000,
          bits: node.data.bits !== undefined ? node.data.bits : 8
        };
      }
      
      return baseNode;
    });
    
    const edgeData = edgesList.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target
    }));
    
    const newGraph = {
      nodes: nodeData,
      edges: edgeData
    };
    
    // Save graph structure
    localStorage.setItem('patchrome-flow-graph', JSON.stringify(newGraph));
    
    // Save positions
    const positions: Record<string, { x: number; y: number }> = {};
    nodesList.forEach(node => {
      positions[node.id] = node.position;
    });
    localStorage.setItem('patchrome-flow-positions', JSON.stringify(positions));
    
    // Also update parent component
    onGraphChange(newGraph);
  }, [onGraphChange]);

  // Handler for node value changes
  const handleNodeValueChange = useCallback((nodeId: string, key: string, value: number | string | boolean) => {
    
    setNodes((currentNodes) => {
      const updatedNodes = currentNodes.map(node => 
        node.id === nodeId 
          ? { ...node, data: { ...node.data, [key]: value } }
          : node
      );
      
      // Save to localStorage with current state
      setEdges((currentEdges) => {
        saveToLocalStorage(updatedNodes, currentEdges);
        return currentEdges;
      });
      
      return updatedNodes;
    });
  }, [setNodes, setEdges, saveToLocalStorage]);

  const handleRemoveNode = useCallback((nodeId: string) => {
    setNodes((nds) => {
      const filteredNodes = nds.filter((node) => node.id !== nodeId);
      setEdges((eds) => {
        const newEdges = eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId);
        // Save immediately
        saveToLocalStorage(filteredNodes, newEdges);
        return newEdges;
      });
      return filteredNodes;
    });
  }, [setNodes, setEdges, saveToLocalStorage]);

  const initialNodes: Node[] = [
    {
      id: '1',
      type: 'unifiedAudio',
      data: { 
        type: 'input' as const,
        ...AUDIO_PARAM_DEFAULTS.input,
        deletable: false,
        onChange: (key: string, value: number) => {
          handleNodeValueChange('1', key, value);
        }
      },
      position: { x: 100, y: 150 },
      deletable: false,
    },
    {
      id: '3',
      type: 'unifiedAudio',
      data: {
        type: 'output' as const,
        deletable: false,
      },
      position: { x: 100, y: 550 },
      deletable: false,
    },
  ];


  // Convert audioGraph to ReactFlow nodes
  const convertGraphToNodes = useCallback((graph: AudioGraphData): Node[] => {
    return graph.nodes.map(node => {
      const baseNode: Node = {
        id: node.id,
        type: 'unifiedAudio',
        position: { x: 100, y: 150 + (parseInt(node.id) - 1) * 200 },
        deletable: node.type !== 'input' && node.type !== 'output',
        data: {},
      };

      if (node.type === 'input') {
        return {
          ...baseNode,
          data: {
            type: 'input' as const,
            speed: node.params.speed ?? AUDIO_PARAM_DEFAULTS.input.speed,
            deletable: false,
            onChange: (key: string, value: number) => {
              handleNodeValueChange(node.id, key, value);
            }
          }
        };
      } else if (node.type === 'reverb') {
        return {
          ...baseNode,
          data: {
            type: 'reverb' as const,
            mix: node.params.mix ?? AUDIO_PARAM_DEFAULTS.reverb.mix,
            decay: node.params.decay ?? AUDIO_PARAM_DEFAULTS.reverb.decay,
            size: node.params.size ?? AUDIO_PARAM_DEFAULTS.reverb.size,
            deletable: true,
            onChange: (key: string, value: number) => {
              handleNodeValueChange(node.id, key, value);
            },
            onRemove: () => handleRemoveNode(node.id),
          }
        };
      } else if (node.type === 'delay') {
        return {
          ...baseNode,
          data: {
            type: 'delay' as const,
            mix: node.params.mix ?? AUDIO_PARAM_DEFAULTS.delay.mix,
            delayTime: node.params.delayTime ?? AUDIO_PARAM_DEFAULTS.delay.delayTime,
            feedback: node.params.feedback ?? AUDIO_PARAM_DEFAULTS.delay.feedback,
            deletable: true,
            onChange: (key: string, value: number) => {
              handleNodeValueChange(node.id, key, value);
            },
            onRemove: () => handleRemoveNode(node.id),
          }
        };
      } else if (node.type === 'utility') {
        return {
          ...baseNode,
          data: {
            type: 'utility' as const,
            volume: node.params.volume ?? AUDIO_PARAM_DEFAULTS.utility.volume,
            pan: node.params.pan ?? AUDIO_PARAM_DEFAULTS.utility.pan,
            reverseL: node.params.reverseL ?? AUDIO_PARAM_DEFAULTS.utility.reverseL,
            reverseR: node.params.reverseR ?? AUDIO_PARAM_DEFAULTS.utility.reverseR,
            deletable: true,
            onChange: (key: string, value: number | boolean) => {
              handleNodeValueChange(node.id, key, value);
            },
            onRemove: () => handleRemoveNode(node.id),
          }
        };
      } else if (node.type === 'limiter') {
        return {
          ...baseNode,
          data: {
            type: 'limiter' as const,
            threshold: node.params.threshold ?? AUDIO_PARAM_DEFAULTS.limiter.threshold,
            deletable: true,
            onChange: (key: string, value: number) => {
              handleNodeValueChange(node.id, key, value);
            },
            onRemove: () => handleRemoveNode(node.id),
          }
        };
      } else if (node.type === 'distortion') {
        return {
          ...baseNode,
          data: {
            type: 'distortion' as const,
            drive: node.params.drive ?? AUDIO_PARAM_DEFAULTS.distortion.drive,
            mix: node.params.mix ?? AUDIO_PARAM_DEFAULTS.distortion.mix,
            deletable: true,
            onChange: (key: string, value: number) => {
              handleNodeValueChange(node.id, key, value);
            },
            onRemove: () => handleRemoveNode(node.id),
          }
        };
      } else if (node.type === 'tonegenerator') {
        return {
          ...baseNode,
          data: {
            type: 'tonegenerator' as const,
            waveform: node.params.waveform ?? 'sine',
            frequency: node.params.frequency ?? 440,
            volume: node.params.volume ?? -12,
            deletable: true,
            onChange: (key: string, value: number | string) => {
              handleNodeValueChange(node.id, key, value);
            },
            onRemove: () => handleRemoveNode(node.id)
          }
        };
      } else if (node.type === 'equalizer') {
        return {
          ...baseNode,
          data: {
            type: 'equalizer' as const,
            filterType: node.params.filterType ?? 'lowpass',
            frequency: node.params.frequency ?? 1000,
            q: node.params.q ?? 1,
            deletable: true,
            onChange: (key: string, value: number | string) => {
              handleNodeValueChange(node.id, key, value);
            },
            onRemove: () => handleRemoveNode(node.id)
          }
        };
      } else if (node.type === 'phaser') {
        return {
          ...baseNode,
          data: {
            type: 'phaser' as const,
            rate: node.params.rate !== undefined ? node.params.rate : 0.5,
            depth: node.params.depth !== undefined ? node.params.depth : 50,
            feedback: node.params.feedback !== undefined ? node.params.feedback : 0,
            mix: node.params.mix || 0,
            deletable: true,
            onChange: (key: string, value: number) => {
              handleNodeValueChange(node.id, key, value);
            },
            onRemove: () => handleRemoveNode(node.id),
          }
        };
      } else if (node.type === 'flanger') {
        return {
          ...baseNode,
          data: {
            type: 'flanger' as const,
            rate: node.params.rate !== undefined ? node.params.rate : 0.5,
            depth: node.params.depth !== undefined ? node.params.depth : 50,
            feedback: node.params.feedback !== undefined ? node.params.feedback : 0,
            delay: node.params.delay !== undefined ? node.params.delay : 5,
            mix: node.params.mix || 0,
            deletable: true,
            onChange: (key: string, value: number) => {
              handleNodeValueChange(node.id, key, value);
            },
            onRemove: () => handleRemoveNode(node.id),
          }
        };
      } else if (node.type === 'spectralgate') {
        return {
          ...baseNode,
          data: {
            type: 'spectralgate' as const,
            cutoff: node.params.cutoff !== undefined ? node.params.cutoff : -20,
            fftSize: node.params.fftSize !== undefined ? node.params.fftSize : 2048,
            deletable: true,
            onChange: (key: string, value: number) => {
              handleNodeValueChange(node.id, key, value);
            },
            onRemove: () => handleRemoveNode(node.id),
          }
        };
      } else if (node.type === 'spectralcompressor') {
        return {
          ...baseNode,
          data: {
            type: 'spectralcompressor' as const,
            attack: node.params.attack !== undefined ? node.params.attack : 30,
            release: node.params.release !== undefined ? node.params.release : 200,
            inputGain: node.params.inputGain !== undefined ? node.params.inputGain : 10,
            threshold: node.params.threshold !== undefined ? node.params.threshold : -45.1,
            ratio: node.params.ratio !== undefined ? node.params.ratio : 1.2,
            deletable: true,
            onChange: (key: string, value: number) => {
              handleNodeValueChange(node.id, key, value);
            },
            onRemove: () => handleRemoveNode(node.id),
          }
        };
      } else if (node.type === 'spectralpitch') {
        return {
          ...baseNode,
          data: {
            type: 'spectralpitch' as const,
            pitch: node.params.pitch !== undefined ? node.params.pitch : 0,
            mix: node.params.mix !== undefined ? node.params.mix : 100,
            fftSize: node.params.fftSize !== undefined ? node.params.fftSize : 2048,
            deletable: true,
            onChange: (key: string, value: number) => {
              handleNodeValueChange(node.id, key, value);
            },
            onRemove: () => handleRemoveNode(node.id),
          }
        };
      } else if (node.type === 'bitcrusher') {
        return {
          ...baseNode,
          data: {
            type: 'bitcrusher' as const,
            mix: node.params.mix !== undefined ? node.params.mix : 0,
            rate: node.params.rate !== undefined ? node.params.rate : 30000,
            bits: node.params.bits !== undefined ? node.params.bits : 8,
            deletable: true,
            onChange: (key: string, value: number) => {
              handleNodeValueChange(node.id, key, value);
            },
            onRemove: () => handleRemoveNode(node.id),
          }
        };
      } else {
        return {
          ...baseNode,
          data: {
            type: 'output' as const,
            deletable: false,
          }
        };
      }
    });
  }, [handleRemoveNode, handleNodeValueChange]);

  // Load graph state from localStorage on mount
  React.useEffect(() => {
    if (!hasLoadedFromStorage) {
      const savedGraph = localStorage.getItem('patchrome-flow-graph');
      const savedPositions = localStorage.getItem('patchrome-flow-positions');
      
      if (savedGraph && savedPositions) {
        try {
          const parsedGraph = JSON.parse(savedGraph) as AudioGraphData;
          const parsedPositions = JSON.parse(savedPositions) as Record<string, { x: number; y: number }>;
          
          // Convert saved graph to nodes with saved positions
          const flowNodes = convertGraphToNodes(parsedGraph).map(node => ({
            ...node,
            position: parsedPositions[node.id] || node.position
          }));
          
          const flowEdges = parsedGraph.edges.map(edge => ({
            ...edge,
            type: 'maxStyle'
          }));
          
          setNodes(flowNodes);
          setEdges(flowEdges);
          setIsInitialized(true);
          
          // Set node counter based on existing nodes
          const maxId = Math.max(...parsedGraph.nodes.map(n => parseInt(n.id)));
          setNodeIdCounter(maxId + 1);
          
          // Update the parent component's audioGraph
          onGraphChange(parsedGraph);
        } catch (error) {
        }
      } else {
        // No saved graph, initialize with default nodes
        setNodes(initialNodes);
        setEdges(initialEdges);
        setIsInitialized(true);
        setNodeIdCounter(4);
      }
      setHasLoadedFromStorage(true);
    }
  }, [hasLoadedFromStorage, convertGraphToNodes, setNodes, setEdges, onGraphChange]);

  // Initialize from audioGraph if no saved state
  React.useEffect(() => {
    if (!isInitialized && audioGraph && hasLoadedFromStorage) {
      // Check if we loaded from localStorage
      const savedGraph = localStorage.getItem('patchrome-flow-graph');
      if (!savedGraph) {
        // No saved state, use audioGraph from props
        const flowNodes = convertGraphToNodes(audioGraph);
        const flowEdges = audioGraph.edges.map(edge => ({
          ...edge,
          type: 'maxStyle'
        }));
        
        setNodes(flowNodes);
        setEdges(flowEdges);
        setIsInitialized(true);
        
        // Set node counter based on existing nodes
        const maxId = Math.max(...audioGraph.nodes.map(n => parseInt(n.id)));
        setNodeIdCounter(maxId + 1);
      }
    }
  }, [audioGraph, isInitialized, hasLoadedFromStorage, setNodes, setEdges, convertGraphToNodes]);


  // Custom handler to prevent deletion of audio input and output nodes
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const filteredChanges = changes.filter((change) => {
        // Prevent deletion of audio input (id: '1') and audio output (id: '3') nodes
        if (change.type === 'remove' && (change.id === '1' || change.id === '3')) {
          return false;
        }
        return true;
      });
      
      // Check if any changes are NOT position changes
      const hasNonPositionChanges = filteredChanges.some(change => 
        change.type !== 'position'
      );
      
      setNodes((nds) => {
        const updatedNodes = applyNodeChanges(filteredChanges, nds);
        
        // Save positions to localStorage whenever nodes change
        const positions: Record<string, { x: number; y: number }> = {};
        updatedNodes.forEach(node => {
          positions[node.id] = node.position;
        });
        localStorage.setItem('patchrome-flow-positions', JSON.stringify(positions));
        
        // Save graph if there are structural changes
        if (hasNonPositionChanges) {
          saveToLocalStorage(updatedNodes, edges);
        }
        
        return updatedNodes;
      });
    },
    [setNodes, edges, saveToLocalStorage]
  );

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => {
        const newEdges = addEdge({ ...params, type: 'maxStyle' }, eds);
        // Save immediately when edges change
        saveToLocalStorage(nodes, newEdges);
        return newEdges;
      });
    },
    [setEdges, nodes, saveToLocalStorage]
  );
  
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      // Check if any edges are being removed
      const hasRemovals = changes.some(change => change.type === 'remove');
      
      // Apply the changes using ReactFlow's built-in handler
      setEdges((eds) => {
        const updated = applyEdgeChanges(changes, eds);
        if (hasRemovals) {
          // Save immediately when edges are removed
          saveToLocalStorage(nodes, updated);
        }
        return updated;
      });
    },
    [setEdges, nodes, saveToLocalStorage]
  );

  const handleAddEffect = useCallback((effectType: string) => {
    if (effectType === 'reverb') {
      const viewport = getViewport();
      
      const centerX = (-viewport.x + window.innerWidth / 2) / viewport.zoom;
      const centerY = (-viewport.y + window.innerHeight / 2) / viewport.zoom;
      
      const newNodeId = nodeIdCounter.toString();
      const newNode: Node = {
        id: newNodeId,
        type: 'unifiedAudio',
        data: { 
          type: 'reverb' as const,
          ...AUDIO_PARAM_DEFAULTS.reverb,
          deletable: true,
          onChange: (key: string, value: number) => {
            handleNodeValueChange(newNodeId, key, value);
          },
          onRemove: () => handleRemoveNode(newNodeId),
        },
        position: { x: centerX - 110, y: centerY - 75 },
        selected: true,
      };
      // Add to both ReactFlow nodes and save immediately
      setNodes((nds) => {
        // Deselect all existing nodes
        const deselectedNodes = nds.map(n => ({ ...n, selected: false }));
        const updated = [...deselectedNodes, newNode];
        saveToLocalStorage(updated, edges);
        return updated;
      });
      
      setNodeIdCounter((prev) => prev + 1);
    } else if (effectType === 'delay') {
      const viewport = getViewport();
      
      const centerX = (-viewport.x + window.innerWidth / 2) / viewport.zoom;
      const centerY = (-viewport.y + window.innerHeight / 2) / viewport.zoom;
      
      const newNodeId = nodeIdCounter.toString();
      const newNode: Node = {
        id: newNodeId,
        type: 'unifiedAudio',
        data: { 
          type: 'delay' as const,
          ...AUDIO_PARAM_DEFAULTS.delay,
          deletable: true,
          onChange: (key: string, value: number) => {
            handleNodeValueChange(newNodeId, key, value);
          },
          onRemove: () => handleRemoveNode(newNodeId),
        },
        position: { x: centerX - 110, y: centerY - 75 },
        selected: true,
      };
      // Add to both ReactFlow nodes and save immediately
      setNodes((nds) => {
        // Deselect all existing nodes
        const deselectedNodes = nds.map(n => ({ ...n, selected: false }));
        const updated = [...deselectedNodes, newNode];
        saveToLocalStorage(updated, edges);
        return updated;
      });
      
      setNodeIdCounter((prev) => prev + 1);
    } else if (effectType === 'utility') {
      const viewport = getViewport();
      
      const centerX = (-viewport.x + window.innerWidth / 2) / viewport.zoom;
      const centerY = (-viewport.y + window.innerHeight / 2) / viewport.zoom;
      
      const newNodeId = nodeIdCounter.toString();
      const newNode: Node = {
        id: newNodeId,
        type: 'unifiedAudio',
        data: { 
          type: 'utility' as const,
          ...AUDIO_PARAM_DEFAULTS.utility,
          deletable: true,
          onChange: (key: string, value: number) => {
            handleNodeValueChange(newNodeId, key, value);
          },
          onRemove: () => handleRemoveNode(newNodeId),
        },
        position: { x: centerX - 110, y: centerY - 75 },
        selected: true,
      };
      // Add to both ReactFlow nodes and save immediately
      setNodes((nds) => {
        // Deselect all existing nodes
        const deselectedNodes = nds.map(n => ({ ...n, selected: false }));
        const updated = [...deselectedNodes, newNode];
        saveToLocalStorage(updated, edges);
        return updated;
      });
      
      setNodeIdCounter((prev) => prev + 1);
    } else if (effectType === 'limiter') {
      const viewport = getViewport();
      
      const centerX = (-viewport.x + window.innerWidth / 2) / viewport.zoom;
      const centerY = (-viewport.y + window.innerHeight / 2) / viewport.zoom;
      
      const newNodeId = nodeIdCounter.toString();
      const newNode: Node = {
        id: newNodeId,
        type: 'unifiedAudio',
        data: { 
          type: 'limiter' as const,
          ...AUDIO_PARAM_DEFAULTS.limiter,
          deletable: true,
          onChange: (key: string, value: number) => {
            handleNodeValueChange(newNodeId, key, value);
          },
          onRemove: () => handleRemoveNode(newNodeId),
        },
        position: { x: centerX - 110, y: centerY - 75 },
        selected: true,
      };
      // Add to both ReactFlow nodes and save immediately
      setNodes((nds) => {
        // Deselect all existing nodes
        const deselectedNodes = nds.map(n => ({ ...n, selected: false }));
        const updated = [...deselectedNodes, newNode];
        saveToLocalStorage(updated, edges);
        return updated;
      });
      
      setNodeIdCounter((prev) => prev + 1);
    } else if (effectType === 'distortion') {
      const viewport = getViewport();
      
      const centerX = (-viewport.x + window.innerWidth / 2) / viewport.zoom;
      const centerY = (-viewport.y + window.innerHeight / 2) / viewport.zoom;
      
      const newNodeId = nodeIdCounter.toString();
      const newNode: Node = {
        id: newNodeId,
        type: 'unifiedAudio',
        data: { 
          type: 'distortion' as const,
          ...AUDIO_PARAM_DEFAULTS.distortion,
          deletable: true,
          onChange: (key: string, value: number) => {
            handleNodeValueChange(newNodeId, key, value);
          },
          onRemove: () => handleRemoveNode(newNodeId),
        },
        position: { x: centerX - 110, y: centerY - 75 },
        selected: true,
      };
      // Add to both ReactFlow nodes and save immediately
      setNodes((nds) => {
        // Deselect all existing nodes
        const deselectedNodes = nds.map(n => ({ ...n, selected: false }));
        const updated = [...deselectedNodes, newNode];
        saveToLocalStorage(updated, edges);
        return updated;
      });
      
      setNodeIdCounter((prev) => prev + 1);
    } else if (effectType === 'tonegenerator') {
      const viewport = getViewport();
      
      const centerX = (-viewport.x + window.innerWidth / 2) / viewport.zoom;
      const centerY = (-viewport.y + window.innerHeight / 2) / viewport.zoom;
      
      const newNodeId = nodeIdCounter.toString();
      const newNode: Node = {
        id: newNodeId,
        type: 'unifiedAudio',
        data: { 
          type: 'tonegenerator' as const,
          waveform: 'sine',
          frequency: 440,
          volume: -12,
          deletable: true,
          onChange: (key: string, value: number | string) => {
            handleNodeValueChange(newNodeId, key, value);
          },
          onRemove: () => handleRemoveNode(newNodeId),
        },
        position: { x: centerX - 110, y: centerY - 75 },
        selected: true,
      };
      // Add to both ReactFlow nodes and save immediately
      setNodes((nds) => {
        // Deselect all existing nodes
        const deselectedNodes = nds.map(n => ({ ...n, selected: false }));
        const updated = [...deselectedNodes, newNode];
        saveToLocalStorage(updated, edges);
        return updated;
      });
      
      setNodeIdCounter((prev) => prev + 1);
    } else if (effectType === 'equalizer') {
      const viewport = getViewport();
      
      const centerX = (-viewport.x + window.innerWidth / 2) / viewport.zoom;
      const centerY = (-viewport.y + window.innerHeight / 2) / viewport.zoom;
      
      const newNodeId = nodeIdCounter.toString();
      const newNode: Node = {
        id: newNodeId,
        type: 'unifiedAudio',
        data: { 
          type: 'equalizer' as const,
          filterType: 'lowpass',
          frequency: 1000,
          q: 1,
          deletable: true,
          onChange: (key: string, value: number | string) => {
            handleNodeValueChange(newNodeId, key, value);
          },
          onRemove: () => handleRemoveNode(newNodeId),
        },
        position: { x: centerX - 110, y: centerY - 75 },
        selected: true,
      };
      // Add to both ReactFlow nodes and save immediately
      setNodes((nds) => {
        // Deselect all existing nodes
        const deselectedNodes = nds.map(n => ({ ...n, selected: false }));
        const updated = [...deselectedNodes, newNode];
        saveToLocalStorage(updated, edges);
        return updated;
      });
      
      setNodeIdCounter((prev) => prev + 1);
    } else if (effectType === 'phaser') {
      const viewport = getViewport();
      
      const centerX = (-viewport.x + window.innerWidth / 2) / viewport.zoom;
      const centerY = (-viewport.y + window.innerHeight / 2) / viewport.zoom;
      
      const newNodeId = nodeIdCounter.toString();
      const newNode: Node = {
        id: newNodeId,
        type: 'unifiedAudio',
        data: { 
          type: 'phaser' as const,
          rate: 0.5,
          depth: 50,
          feedback: 0,
          mix: 0,
          deletable: true,
          onChange: (key: string, value: number) => {
            handleNodeValueChange(newNodeId, key, value);
          },
          onRemove: () => handleRemoveNode(newNodeId),
        },
        position: { x: centerX - 110, y: centerY - 75 },
        selected: true,
      };
      // Add to both ReactFlow nodes and save immediately
      setNodes((nds) => {
        // Deselect all existing nodes
        const deselectedNodes = nds.map(n => ({ ...n, selected: false }));
        const updated = [...deselectedNodes, newNode];
        saveToLocalStorage(updated, edges);
        return updated;
      });
      
      setNodeIdCounter((prev) => prev + 1);
    } else if (effectType === 'flanger') {
      const viewport = getViewport();
      
      const centerX = (-viewport.x + window.innerWidth / 2) / viewport.zoom;
      const centerY = (-viewport.y + window.innerHeight / 2) / viewport.zoom;
      
      const newNodeId = nodeIdCounter.toString();
      const newNode: Node = {
        id: newNodeId,
        type: 'unifiedAudio',
        data: { 
          type: 'flanger' as const,
          rate: 0.5,
          depth: 50,
          feedback: 0,
          delay: 5,
          mix: 0,
          deletable: true,
          onChange: (key: string, value: number) => {
            handleNodeValueChange(newNodeId, key, value);
          },
          onRemove: () => handleRemoveNode(newNodeId),
        },
        position: { x: centerX - 110, y: centerY - 75 },
        selected: true,
      };
      // Add to both ReactFlow nodes and save immediately
      setNodes((nds) => {
        // Deselect all existing nodes
        const deselectedNodes = nds.map(n => ({ ...n, selected: false }));
        const updated = [...deselectedNodes, newNode];
        saveToLocalStorage(updated, edges);
        return updated;
      });
      
      setNodeIdCounter((prev) => prev + 1);
    } else if (effectType === 'spectralgate') {
      const viewport = getViewport();
      
      const centerX = (-viewport.x + window.innerWidth / 2) / viewport.zoom;
      const centerY = (-viewport.y + window.innerHeight / 2) / viewport.zoom;
      
      const newNodeId = nodeIdCounter.toString();
      const newNode: Node = {
        id: newNodeId,
        type: 'unifiedAudio',
        data: { 
          type: 'spectralgate' as const,
          cutoff: -20,
          fftSize: 2048,
          deletable: true,
          onChange: (key: string, value: number) => {
            handleNodeValueChange(newNodeId, key, value);
          },
          onRemove: () => handleRemoveNode(newNodeId),
        },
        position: { x: centerX - 110, y: centerY - 75 },
      };
      // Add to both ReactFlow nodes and save immediately
      setNodes((nds) => {
        const updated = [...nds, newNode];
        saveToLocalStorage(updated, edges);
        return updated;
      });
      
      setNodeIdCounter((prev) => prev + 1);
    } else if (effectType === 'spectralcompressor') {
      const viewport = getViewport();
      
      const centerX = (-viewport.x + window.innerWidth / 2) / viewport.zoom;
      const centerY = (-viewport.y + window.innerHeight / 2) / viewport.zoom;
      
      const newNodeId = nodeIdCounter.toString();
      const newNode: Node = {
        id: newNodeId,
        type: 'unifiedAudio',
        data: { 
          type: 'spectralcompressor' as const,
          ...AUDIO_PARAM_DEFAULTS.spectralcompressor,
          deletable: true,
          onChange: (key: string, value: number) => {
            handleNodeValueChange(newNodeId, key, value);
          },
          onRemove: () => handleRemoveNode(newNodeId),
        },
        position: { x: centerX - 110, y: centerY - 75 },
      };
      // Add to both ReactFlow nodes and save immediately
      setNodes((nds) => {
        const updated = [...nds, newNode];
        saveToLocalStorage(updated, edges);
        return updated;
      });
      
      setNodeIdCounter((prev) => prev + 1);
    } else if (effectType === 'spectralpitch') {
      const viewport = getViewport();
      
      const centerX = (-viewport.x + window.innerWidth / 2) / viewport.zoom;
      const centerY = (-viewport.y + window.innerHeight / 2) / viewport.zoom;
      
      const newNodeId = nodeIdCounter.toString();
      const newNode: Node = {
        id: newNodeId,
        type: 'unifiedAudio',
        data: { 
          type: 'spectralpitch' as const,
          pitch: 0,
          mix: 100,
          fftSize: 2048,
          deletable: true,
          onChange: (key: string, value: number) => {
            handleNodeValueChange(newNodeId, key, value);
          },
          onRemove: () => handleRemoveNode(newNodeId),
        },
        position: { x: centerX - 110, y: centerY - 75 },
        selected: true,
      };
      // Add to both ReactFlow nodes and save immediately
      setNodes((nds) => {
        // Deselect all existing nodes
        const deselectedNodes = nds.map(n => ({ ...n, selected: false }));
        const updated = [...deselectedNodes, newNode];
        saveToLocalStorage(updated, edges);
        return updated;
      });
      
      setNodeIdCounter((prev) => prev + 1);
    } else if (effectType === 'bitcrusher') {
      const viewport = getViewport();
      
      const centerX = (-viewport.x + window.innerWidth / 2) / viewport.zoom;
      const centerY = (-viewport.y + window.innerHeight / 2) / viewport.zoom;
      
      const newNodeId = nodeIdCounter.toString();
      const newNode: Node = {
        id: newNodeId,
        type: 'unifiedAudio',
        data: { 
          type: 'bitcrusher' as const,
          mix: 0,
          rate: 30000,
          bits: 8,
          deletable: true,
          onChange: (key: string, value: number) => {
            handleNodeValueChange(newNodeId, key, value);
          },
          onRemove: () => handleRemoveNode(newNodeId),
        },
        position: { x: centerX - 110, y: centerY - 75 },
        selected: true,
      };
      // Add to both ReactFlow nodes and save immediately
      setNodes((nds) => {
        // Deselect all existing nodes
        const deselectedNodes = nds.map(n => ({ ...n, selected: false }));
        const updated = [...deselectedNodes, newNode];
        saveToLocalStorage(updated, edges);
        return updated;
      });
      
      setNodeIdCounter((prev) => prev + 1);
    }
  }, [nodeIdCounter, setNodes, getViewport, handleRemoveNode, handleNodeValueChange, edges, saveToLocalStorage]);


  // Update onRemove handlers when handleRemoveNode changes
  React.useEffect(() => {
    if (!isInitialized) return;
    
    setNodes((nds) => {
      return nds.map((node) => {
        if (node.data.deletable) {
          return {
            ...node,
            data: {
              ...node.data,
              onRemove: () => handleRemoveNode(node.id)
            }
          };
        }
        return node;
      });
    });
  }, [isInitialized, setNodes, handleRemoveNode]);

  // Handle right-click on the canvas
  const handleContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    setIsEffectDialogOpen(true);
  }, []);

  // Handle applying a preset to the graph
  const handleApplyPreset = useCallback((preset: NodeGraphPreset) => {
    // Clear existing graph (except input/output nodes)
    const inputNode = nodes.find(n => n.data.type === 'input');
    const outputNode = nodes.find(n => n.data.type === 'output');
    
    // Create new nodes from preset
    const newNodes: Node[] = preset.nodes.map(presetNode => {
      // Skip input/output nodes from preset, use existing ones
      if (presetNode.type === 'input' && inputNode) {
        return inputNode;
      }
      if (presetNode.type === 'output' && outputNode) {
        return outputNode;
      }
      
      // Create new node
      return {
        id: presetNode.id,
        type: 'unifiedAudio',
        position: presetNode.position,
        data: {
          ...presetNode.data,
          onChange: (key: string, value: number | string) => {
            handleNodeValueChange(presetNode.id, key, value);
          },
          onRemove: () => handleRemoveNode(presetNode.id)
        }
      };
    });
    
    // Apply new nodes and edges
    setNodes(newNodes);
    setEdges(preset.edges);
    
    // Save to localStorage
    saveToLocalStorage(newNodes, preset.edges);
  }, [nodes, setNodes, setEdges, handleNodeValueChange, handleRemoveNode, saveToLocalStorage]);

  return (
    <div 
      style={{ 
        height: '100%', 
        width: '100%',
        position: 'relative',
      }}
      onContextMenu={handleContextMenu}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
      </ReactFlow>
      <LogoButton onClick={() => onEnabledChange(!isEnabled)} isActive={isEnabled} />
      <AddEffectButton onClick={() => setIsEffectDialogOpen(true)} />
      <MenuButton 
        onInfoClick={() => setIsInfoModalOpen(true)}
        onPresetsClick={() => setIsPresetManagerOpen(true)}
      />
      <AddEffectDialog 
        open={isEffectDialogOpen} 
        onOpenChange={setIsEffectDialogOpen}
        onAddEffect={handleAddEffect}
      />
      <InfoModal 
        open={isInfoModalOpen} 
        onOpenChange={setIsInfoModalOpen} 
      />
      <PresetManager
        isOpen={isPresetManagerOpen}
        onClose={() => setIsPresetManagerOpen(false)}
        onApplyPreset={handleApplyPreset}
        currentNodes={nodes}
        currentEdges={edges}
      />
    </div>
  );
};

const FlowDiagram: React.FC<FlowDiagramProps> = (props) => {
  return (
    <ReactFlowProvider>
      <FlowDiagramInner {...props} />
    </ReactFlowProvider>
  );
};

export default FlowDiagram;