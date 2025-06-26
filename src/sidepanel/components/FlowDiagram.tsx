import React, { useCallback } from 'react';
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
  onSpeedChange: (value: number) => void;
  onReverbChange: (value: number) => void;
}

const FlowDiagramInner: React.FC<FlowDiagramProps> = ({ speed, reverb, onSpeedChange, onReverbChange }) => {
  const [nodeIdCounter, setNodeIdCounter] = React.useState(4);
  const { project, getViewport } = useReactFlow();
  const [nodes, setNodes] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  
  const handleRemoveNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
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
          if (key === 'speed') onSpeedChange(value);
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
          if (key === 'mix') onReverbChange(value);
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

  // Initialize nodes with effect
  React.useEffect(() => {
    setNodes(initialNodes);
  }, []); // Run only once on mount

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
      setNodes((nds) => applyNodeChanges(filteredChanges, nds));
    },
    [setNodes]
  );

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, type: 'maxStyle' }, eds)),
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
            if (key === 'mix') console.log('New reverb:', value);
          },
          onRemove: () => handleRemoveNode(newNodeId)
        },
        position: { x: centerX - 110, y: centerY - 75 }, // Offset by half the node size
      };
      setNodes((nds) => [...nds, newNode]);
      setNodeIdCounter((prev) => prev + 1);
    }
  }, [nodeIdCounter, setNodes, getViewport, handleRemoveNode]);

  // Update node data when props change
  React.useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === '1') {
          return {
            ...node,
            data: { 
              ...node.data,
              speed: speed,
              onChange: (key: string, value: number) => {
                if (key === 'speed') onSpeedChange(value);
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
                if (key === 'mix') onReverbChange(value);
              },
              onRemove: () => handleRemoveNode('2')
            },
          };
        }
        return node;
      })
    );
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