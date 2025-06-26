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
import { AudioGraphData } from '../../shared/types';

const nodeTypes = {
  unifiedAudio: UnifiedAudioNode,
};

const edgeTypes = {
  maxStyle: MaxStyleEdge,
};

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', type: 'maxStyle' },
];

interface FlowDiagramProps {
  audioGraph: AudioGraphData;
  onGraphChange: (graph: AudioGraphData) => void;
}

const FlowDiagramInner: React.FC<FlowDiagramProps> = ({ audioGraph, onGraphChange }) => {
  const [nodeIdCounter, setNodeIdCounter] = React.useState(4);
  const { getViewport } = useReactFlow();
  const [nodes, setNodes] = useNodesState([]);
  const [edges, setEdges] = useEdgesState([]);
  const [isInitialized, setIsInitialized] = React.useState(false);
  const [hasLoadedFromStorage, setHasLoadedFromStorage] = React.useState(false);
  
  // Helper function to save current state to localStorage
  const saveToLocalStorage = useCallback((nodesList: Node[], edgesList: Edge[]) => {
    const nodeData = nodesList.map(node => {
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
  const handleNodeValueChange = useCallback((nodeId: string, key: string, value: number) => {
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
        speed: 1.0,
        deletable: false,
        onChange: (key: string, value: number) => {
          if (key === 'speed') {
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
              handleNodeValueChange(node.id, key, value);
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
              handleNodeValueChange(node.id, key, value);
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
          console.error('Failed to load saved graph:', error);
        }
      } else {
        // No saved graph, initialize with default nodes
        setNodes(initialNodes);
        setEdges(initialEdges);
        setIsInitialized(true);
        setNodeIdCounter(3);
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
          mix: 0,
          deletable: true,
          onChange: (key: string, value: number) => {
            handleNodeValueChange(newNodeId, key, value);
          },
          onRemove: () => handleRemoveNode(newNodeId)
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