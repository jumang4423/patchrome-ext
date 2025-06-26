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
  applyNodeChanges,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import UnifiedAudioNode from './nodes/UnifiedAudioNode';
import MaxStyleEdge from './edges/MaxStyleEdge';
import AddEffectButton from './AddEffectButton';
import { AudioGraphData } from '../../shared/types';

const nodeTypes = {
  unifiedAudio: UnifiedAudioNode,
};

const edgeTypes = {
  maxStyle: MaxStyleEdge,
};

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', type: 'maxStyle' },
  { id: 'e2-3', source: '2', target: '3', type: 'maxStyle' },
];

interface FlowDiagramProps {
  speed: number;
  reverb: number;
  audioGraph: AudioGraphData;
  onSpeedChange: (value: number) => void;
  onReverbChange: (value: number) => void;
  onGraphChange: (graph: AudioGraphData) => void;
}

const FlowDiagramInner: React.FC<FlowDiagramProps> = ({ speed, reverb, audioGraph, onSpeedChange, onReverbChange, onGraphChange }) => {
  const [nodeIdCounter, setNodeIdCounter] = React.useState(4);
  const { getViewport } = useReactFlow();
  const [nodes, setNodes] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isInitialized, setIsInitialized] = React.useState(false);
  const [needsSync, setNeedsSync] = React.useState(false);
  
  const handleRemoveNode = useCallback((nodeId: string) => {
    setNodes((nds) => {
      const filteredNodes = nds.filter((node) => node.id !== nodeId);
      return filteredNodes;
    });
    setEdges((eds) => {
      const newEdges = eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId);
      return newEdges;
    });
    setNeedsSync(true);
  }, [setNodes, setEdges]);

  const initialNodes: Node[] = [
    {
      id: '1',
      type: 'unifiedAudio',
      data: { 
        type: 'input' as const,
        speed: speed,
        deletable: false,
        onChange: (key: string, value: number) => {
          if (key === 'speed') {
            onSpeedChange(value);
          }
        }
      },
      position: { x: 100, y: 150 },
      deletable: false,
    },
    {
      id: '2',
      type: 'unifiedAudio',
      data: { 
        type: 'reverb' as const,
        mix: reverb,
        deletable: true,
        onChange: (key: string, value: number) => {
          if (key === 'mix') {
            onReverbChange(value);
          }
        },
        onRemove: () => handleRemoveNode('2')
      },
      position: { x: 100, y: 350 },
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
            speed: node.params.speed || 1.0,
            deletable: false,
            onChange: (key: string, value: number) => {
              if (key === 'speed') {
                onSpeedChange(value);
              }
            }
          }
        };
      } else if (node.type === 'reverb') {
        return {
          ...baseNode,
          data: {
            type: 'reverb' as const,
            mix: node.params.mix || 0,
            deletable: true,
            onChange: (key: string, value: number) => {
              if (key === 'mix') {
                onReverbChange(value);
              }
            },
            onRemove: () => handleRemoveNode(node.id)
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
  }, [onSpeedChange, onReverbChange, handleRemoveNode]);

  // Initialize from audioGraph
  React.useEffect(() => {
    if (!isInitialized && audioGraph) {
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
  }, [audioGraph, isInitialized, setNodes, setEdges, convertGraphToNodes]);

  // Sync ReactFlow state to audioGraph when needed
  React.useEffect(() => {
    if (needsSync && nodes.length > 0) {
      const nodeData = nodes.map(node => {
        const baseNode = {
          id: node.id,
          type: node.data.type as 'input' | 'reverb' | 'output',
          params: {} as Record<string, number>
        };
        
        if (node.data.type === 'input') {
          baseNode.params = { speed: node.data.speed || 1.0 };
        } else if (node.data.type === 'reverb') {
          baseNode.params = { mix: node.data.mix || 0 };
        }
        
        return baseNode;
      });
      
      const edgeData = edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target
      }));
      
      onGraphChange({
        nodes: nodeData,
        edges: edgeData
      });
      
      setNeedsSync(false);
    }
  }, [needsSync, nodes, edges, onGraphChange]);

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
        
        // Sync graph if there are structural changes
        if (hasNonPositionChanges) {
          setNeedsSync(true);
        }
        
        return updatedNodes;
      });
    },
    [setNodes]
  );

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => {
        const newEdges = addEdge({ ...params, type: 'maxStyle' }, eds);
        setNeedsSync(true);
        return newEdges;
      });
    },
    [setEdges]
  );

  const handleAddEffect = useCallback((effectType: string) => {
    if (effectType === 'reverb') {
      // Get the current viewport
      const viewport = getViewport();
      
      // Calculate the center of the viewport
      const centerX = (-viewport.x + window.innerWidth / 2) / viewport.zoom;
      const centerY = (-viewport.y + window.innerHeight / 2) / viewport.zoom;
      
      const newNodeId = nodeIdCounter.toString();
      const newNode: Node = {
        id: newNodeId,
        type: 'unifiedAudio',
        data: { 
          type: 'reverb' as const,
          mix: 0,
          deletable: true,
          onChange: (key: string, value: number) => {
            if (key === 'mix') {
            }
          },
          onRemove: () => handleRemoveNode(newNodeId)
        },
        position: { x: centerX - 110, y: centerY - 75 }, // Offset by half the node size
      };
      setNodes((nds) => {
        const updatedNodes = [...nds, newNode];
        setNeedsSync(true);
        return updatedNodes;
      });
      setNodeIdCounter((prev) => prev + 1);
    }
  }, [nodeIdCounter, setNodes, getViewport, handleRemoveNode]);

  // Update node data when props change
  React.useEffect(() => {
    setNodes((nds) => {
      const updatedNodes = nds.map((node) => {
        if (node.id === '1') {
          return {
            ...node,
            data: { 
              ...node.data,
              speed: speed,
              onChange: (key: string, value: number) => {
                if (key === 'speed') {
                  onSpeedChange(value);
                }
              }
            },
          };
        }
        if (node.id === '2') {
          return {
            ...node,
            data: { 
              ...node.data,
              mix: reverb,
              onChange: (key: string, value: number) => {
                if (key === 'mix') {
                  onReverbChange(value);
                }
              },
              onRemove: () => handleRemoveNode('2')
            },
          };
        }
        return node;
      });
      // Don't log here as this runs on every prop change
      return updatedNodes;
    });
  }, [speed, reverb, onSpeedChange, onReverbChange, setNodes, handleRemoveNode]);

  return (
    <div style={{ 
      height: '100%', 
      width: '100%',
      position: 'relative',
    }}>
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
        <Controls />
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
      </ReactFlow>
      <AddEffectButton onAddEffect={handleAddEffect} />
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