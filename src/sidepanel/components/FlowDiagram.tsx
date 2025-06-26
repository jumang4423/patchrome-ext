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
} from 'reactflow';
import 'reactflow/dist/style.css';
import ReverbEffectNode from './nodes/ReverbEffectNode';
import AudioInputNode from './nodes/AudioInputNode';
import AudioOutputNode from './nodes/AudioOutputNode';

const nodeTypes = {
  audioInput: AudioInputNode,
  reverbEffect: ReverbEffectNode,
  audioOutput: AudioOutputNode,
};

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2' },
  { id: 'e2-3', source: '2', target: '3' },
];

interface FlowDiagramProps {
  speed: number;
  reverb: number;
  onSpeedChange: (value: number) => void;
  onReverbChange: (value: number) => void;
}

const FlowDiagram: React.FC<FlowDiagramProps> = ({ speed, reverb, onSpeedChange, onReverbChange }) => {
  const initialNodes: Node[] = [
    {
      id: '1',
      type: 'audioInput',
      data: { speedValue: speed, onSpeedChange: onSpeedChange },
      position: { x: 100, y: 150 },
    },
    {
      id: '2',
      type: 'reverbEffect',
      data: { value: reverb, onChange: onReverbChange },
      position: { x: 100, y: 350 },
    },
    {
      id: '3',
      type: 'audioOutput',
      data: {},
      position: { x: 100, y: 550 },
    },
  ];

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // Update node data when props change
  React.useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === '1') {
          return {
            ...node,
            data: { speedValue: speed, onSpeedChange: onSpeedChange },
          };
        }
        if (node.id === '2') {
          return {
            ...node,
            data: { value: reverb, onChange: onReverbChange },
          };
        }
        return node;
      })
    );
  }, [speed, reverb, onSpeedChange, onReverbChange, setNodes]);

  return (
    <div style={{ 
      height: '100%', 
      width: '100%',
    }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
      >
        <Controls />
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
      </ReactFlow>
    </div>
  );
};

export default FlowDiagram;