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
  selected,
}) => {
  // Calculate the sagging effect
  const distance = Math.sqrt(Math.pow(targetX - sourceX, 2) + Math.pow(targetY - sourceY, 2));
  const sagAmount = Math.min(distance * 0.4, 120); // Reduced sag for smoother curves
  
  // Create control points for a more natural cable droop
  let path: string;
  
  if (sourcePosition === Position.Right && targetPosition === Position.Left) {
    // Right to Left connection (most common in this layout)
    // Create a smoother cubic bezier curve
    const minOffset = 80; // Increased minimum offset for smoother curves
    const offset = Math.max(minOffset, Math.abs(targetX - sourceX) * 0.3);
    
    const controlX1 = sourceX + offset;
    const controlY1 = sourceY + sagAmount * 0.5;
    const controlX2 = targetX - offset;
    const controlY2 = targetY + sagAmount * 0.5;
    
    path = `M ${sourceX},${sourceY} C ${controlX1},${controlY1} ${controlX2},${controlY2} ${targetX},${targetY}`;
  } else {
    // Fallback for other connection types
    const midX = (sourceX + targetX) / 2;
    const midY = (sourceY + targetY) / 2 + sagAmount;
    path = `M ${sourceX},${sourceY} Q ${midX},${midY} ${targetX},${targetY}`;
  }
  
  // Create a unique gradient ID for this edge
  const gradientId = `stripe-gradient-${id}`;
  
  return (
    <>
      <defs>
        {/* Define striped pattern for power cable effect */}
        <pattern id={gradientId} patternUnits="userSpaceOnUse" width="16" height="4" patternTransform="rotate(45)">
          <rect width="8" height="4" fill={selected ? "#4ecdc4" : "#adb5bd"} />
          <rect x="8" width="8" height="4" fill={selected ? "#6eddd5" : "#ced4da"} />
        </pattern>
      </defs>
      
      {/* Shadow for depth */}
      <path
        style={{
          stroke: selected ? '#4ecdc420' : '#00000015',
          strokeWidth: selected ? 8 : 6,
          fill: 'none',
          filter: selected ? 'blur(6px)' : 'blur(4px)',
        }}
        d={path}
        transform="translate(0, 2)"
      />
      
      {/* Main cable with striped pattern */}
      <path
        id={id}
        style={{
          ...style,
          stroke: `url(#${gradientId})`,
          strokeWidth: selected ? 5 : 4,
          fill: 'none',
          strokeLinecap: 'round',
          transition: 'stroke-width 0.2s ease',
        }}
        className="react-flow__edge-path"
        d={path}
        markerEnd={markerEnd}
      />
      
      {/* Subtle highlight on top */}
      <path
        style={{
          stroke: selected ? '#ffffff90' : '#ffffff60',
          strokeWidth: selected ? 2 : 1.5,
          fill: 'none',
        }}
        d={path}
        transform="translate(0, -1)"
      />
    </>
  );
};

export default MaxStyleEdge;