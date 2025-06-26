import React from 'react';
import { EdgeProps, Position } from 'reactflow';

const MaxStyleEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}) => {
  // Calculate the sagging effect
  const distance = Math.sqrt(Math.pow(targetX - sourceX, 2) + Math.pow(targetY - sourceY, 2));
  const sagAmount = Math.min(distance * 1.2, 500); // Sag proportional to distance, max 500px
  
  // Adjust for horizontal handles (handles on left/right sides)
  const horizontalOffset = -Math.abs(targetX - sourceX) * 0.5;
  
  // Create control points for a more natural cable droop
  let path: string;
  
  if (sourcePosition === Position.Right && targetPosition === Position.Left) {
    // Right to Left connection (most common in this layout)
    // Create a cubic bezier curve that exits horizontally from the source and enters horizontally to the target
    const minOffset = 50; // Minimum horizontal offset to ensure smooth curves
    const offset = Math.max(minOffset, Math.abs(targetX - sourceX) * 0.5);
    
    const controlX1 = sourceX + offset;
    const controlY1 = sourceY + sagAmount * 0.3;
    const controlX2 = targetX - offset;
    const controlY2 = targetY + sagAmount * 0.3;
    
    path = `M ${sourceX},${sourceY} C ${controlX1},${controlY1} ${controlX2},${controlY2} ${targetX},${targetY}`;
  } else {
    // Fallback for other connection types
    const midX = (sourceX + targetX) / 2;
    const midY = (sourceY + targetY) / 2 + sagAmount;
    path = `M ${sourceX},${sourceY} Q ${midX},${midY} ${targetX},${targetY}`;
  }
  
  return (
    <>
      <path
        id={id}
        style={{
          ...style,
          strokeWidth: 3,
          fill: 'none',
        }}
        className="react-flow__edge-path"
        d={path}
        markerEnd={markerEnd}
      />
      {/* Add a subtle shadow for depth */}
      <path
        style={{
          stroke: '#00000020',
          strokeWidth: 4,
          fill: 'none',
          filter: 'blur(2px)',
        }}
        d={path}
        transform="translate(0, 2)"
      />
    </>
  );
};

export default MaxStyleEdge;