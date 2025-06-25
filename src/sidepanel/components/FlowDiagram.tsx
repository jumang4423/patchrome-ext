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
} from 'reactflow';
import 'reactflow/dist/style.css';

const initialNodes: Node[] = [
  {
    id: '1',
    type: 'input',
    data: { label: 'Audio Input' },
    position: { x: 150, y: 50 },
  },
  {
    id: '2',
    data: { label: 'Speed Control' },
    position: { x: 150, y: 150 },
  },
  {
    id: '3',
    data: { label: 'Reverb Effect' },
    position: { x: 150, y: 250 },
  },
  {
    id: '4',
    type: 'output',
    data: { label: 'Audio Output' },
    position: { x: 150, y: 350 },
  },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2' },
  { id: 'e2-3', source: '2', target: '3' },
  { id: 'e3-4', source: '3', target: '4' },
];

interface FlowDiagramProps {
  speed: number;
  reverb: number;
}

const FlowDiagram: React.FC<FlowDiagramProps> = ({ speed, reverb }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // Update node labels based on current values
  React.useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === '2') {
          return {
            ...node,
            data: { label: `Speed Control (${speed.toFixed(2)}x)` },
          };
        }
        if (node.id === '3') {
          return {
            ...node,
            data: { label: `Reverb Effect (${reverb}%)` },
          };
        }
        return node;
      })
    );
  }, [speed, reverb, setNodes]);

  return (
    <div style={{ 
      height: 'calc(100vh - 150px)', 
      width: 'calc(100% - 10px)',
    }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        fitViewOptions={{ padding: 0.2 }}
      >
        <Controls />
        <Background variant="dots" gap={12} size={1} />
      </ReactFlow>
    </div>
  );
};

export default FlowDiagram;