# Adding New Effect Nodes to Patchrome

This guide explains how to add new audio effect nodes to the Patchrome Chrome extension. Follow these steps to implement a new effect from start to finish.

## Overview

Adding a new effect requires changes to multiple files across the extension:
1. Type definitions
2. Audio processing implementation
3. UI components
4. Data conversion logic

## Step-by-Step Instructions

### 1. Update Type Definitions

#### a. Update `src/types/nodeGraphStructure.ts`

Add your effect to the type unions:
```typescript
export type NodeType = 'input' | 'reverb' | 'delay' | 'youreffect' | 'output';
export type EffectNodeType = 'reverb' | 'delay' | 'youreffect';
```

Create the node interface and parameter definitions:
```typescript
// youreffect
export interface YourEffectNode extends BaseNode {
  type: 'youreffect';
  data: {
    param1: number;
    param2: number;
    // Add your parameters here
  };
  deletable: true;
}

export const YourEffectParamDOM = [
  {
     label: 'Parameter 1',
     key: 'param1', 
     min: 0,
     max: 100,
     step: 1,
     valueType: 'percentage'  // or 'number' or 'milliseconds'
  },
  {
     label: 'Parameter 2',
     key: 'param2', 
     min: 0,
     max: 1000,
     step: 10,
     valueType: 'milliseconds'
  },
  // Add more parameters as needed
];
```

Update the AudioNode union type:
```typescript
export type AudioNode = InputNode | ReverbNode | DelayNode | YourEffectNode | OutputNode;
```

#### b. Update `src/shared/types.ts`

Add your effect to the NodeData type:
```typescript
export interface NodeData {
  id: string;
  type: 'input' | 'reverb' | 'delay' | 'youreffect' | 'output';
  params: Record<string, number>;
}
```

### 2. Implement Audio Processing

Edit `src/inject.js` to add your effect's audio processing logic.

#### a. Add the effect case in `buildAudioGraph` function (around line 89):

```javascript
} else if (node.type === 'youreffect') {
  // Create effect chain
  const inputGain = audioContext.createGain();
  const dryGain = audioContext.createGain();
  const wetGain = audioContext.createGain();
  
  // Create your Web Audio API nodes here
  // Example: const effectNode = audioContext.createBiquadFilter();
  
  const merger = audioContext.createGain();
  
  // Set up parameters
  const param1 = node.params.param1 !== undefined ? node.params.param1 : 50;
  const param2 = node.params.param2 !== undefined ? node.params.param2 : 500;
  
  // Apply parameters to your effect nodes
  // Example: effectNode.frequency.value = param1;
  
  // Set up wet/dry mix
  const wetAmount = (node.params.mix || 0) / 100;
  const dryAmount = 1 - wetAmount;
  dryGain.gain.value = dryAmount;
  wetGain.gain.value = wetAmount;
  
  // Connect internal routing
  inputGain.connect(dryGain);
  inputGain.connect(effectNode);  // Replace with your effect node
  
  nodes.set(node.id, {
    type: 'youreffect',
    input: inputGain,
    output: merger,
    inputGain,
    dryGain,
    wetGain,
    // Add your effect nodes here
    merger,
    params: node.params,
    audioContext
  });
  
  // Store internal connections
  // Example: connections.push({ from: effectNode, to: wetGain });
  connections.push({ from: wetGain, to: merger });
  connections.push({ from: dryGain, to: merger });
```

#### b. Update connection logic (around line 196):

Add cases for connecting your effect to other nodes:
```javascript
} else if (sourceNode.type === 'youreffect') {
  if (targetNode.type === 'reverb') {
    sourceNode.output.connect(targetNode.inputGain);
  } else if (targetNode.type === 'delay') {
    sourceNode.output.connect(targetNode.inputGain);
  } else if (targetNode.type === 'youreffect') {
    sourceNode.output.connect(targetNode.inputGain);
  } else if (targetNode.type === 'output') {
    sourceNode.output.connect(targetNode.audioNode);
  }
}
```

Also add cases for connecting TO your effect in the existing conditions:
```javascript
if (sourceNode.type === 'input') {
  // ... existing cases ...
  } else if (targetNode.type === 'youreffect') {
    sourceNode.audioNode.connect(targetNode.inputGain);
  }
```

#### c. Add parameter update logic in `updateAudioGraphParams` (around line 299):

```javascript
} else if (node.type === 'youreffect' && node.wetGain && node.dryGain) {
  const wetAmount = (graphNode.params.mix || 0) / 100;
  const dryAmount = 1 - wetAmount;
  
  // Use setValueAtTime for immediate parameter changes
  const currentTime = audioContexts.get(element)?.currentTime || 0;
  node.wetGain.gain.setValueAtTime(wetAmount, currentTime);
  node.dryGain.gain.setValueAtTime(dryAmount, currentTime);
  
  // Update your effect-specific parameters
  const param1 = graphNode.params.param1 !== undefined ? graphNode.params.param1 : 50;
  // Example: node.effectNode.frequency.setValueAtTime(param1, currentTime);
  
  // Always update the stored parameters
  node.params = { ...graphNode.params };
  
  console.log(`Patchrome: Updated youreffect ${nodeId} - params:`, node.params);
}
```

#### d. Update `disconnectAudioGraph` function (around line 351):

Add disconnection for your effect nodes:
```javascript
if (node.yourEffectNode) {
  try { node.yourEffectNode.disconnect(); } catch(e) {}
}
// Add disconnection for any other nodes specific to your effect
```

### 3. Update UI Components

#### a. Enable the effect in `src/sidepanel/components/AddEffectButton.tsx`:

Add a button for your effect (around line 76):
```tsx
<button
  className="effect-dropdown-item"
  onClick={() => handleAddEffect('youreffect')}
>
  <div className="effect-item-content">
    <div className="effect-item-icon youreffect">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Add your custom SVG icon here */}
      </svg>
    </div>
    <span>Your Effect</span>
  </div>
</button>
```

#### b. Update `src/sidepanel/components/nodes/UnifiedAudioNode.tsx`:

Import your parameter definitions:
```tsx
import { AudioNode, InputParamDOM, ReverbParamDOM, DelayParamDOM, YourEffectParamDOM, OutputParamDOM, ValueType } from '../../../types/nodeGraphStructure';
```

Add your effect icon (around line 28):
```tsx
youreffect: (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Add your custom SVG icon here */}
  </svg>
),
```

Add your effect header (around line 46):
```tsx
const nodeHeaders = {
  input: 'Audio Input',
  reverb: 'Reverb',
  delay: 'Delay',
  youreffect: 'Your Effect',
  output: 'Audio Output'
};
```

Update `getParamDOM` function (around line 56):
```tsx
case 'youreffect':
  return YourEffectParamDOM;
```

#### c. Add CSS styling in `src/sidepanel/styles.css` (around line 517):

```css
.effect-item-icon.youreffect {
  background: rgba(YOUR_COLOR_RGB, 0.1);
  color: #YOUR_COLOR_HEX;
}
```

### 4. Update Flow Diagram Logic

Edit `src/sidepanel/components/FlowDiagram.tsx`:

#### a. Add effect handling in `handleAddEffect` (around line 384):

```typescript
} else if (effectType === 'youreffect') {
  const viewport = getViewport();
  
  const centerX = (-viewport.x + window.innerWidth / 2) / viewport.zoom;
  const centerY = (-viewport.y + window.innerHeight / 2) / viewport.zoom;
  
  const newNodeId = nodeIdCounter.toString();
  const newNode: Node = {
    id: newNodeId,
    type: 'unifiedAudio',
    data: { 
      type: 'youreffect' as const,
      param1: 50,  // Default value
      param2: 500, // Default value
      mix: 0,      // If your effect has wet/dry mix
      deletable: true,
      onChange: (key: string, value: number) => {
        handleNodeValueChange(newNodeId, key, value);
      },
      onRemove: () => handleRemoveNode(newNodeId)
    },
    position: { x: centerX - 110, y: centerY - 75 },
  };
  
  setNodes((nds) => {
    const updated = [...nds, newNode];
    saveToLocalStorage(updated, edges);
    return updated;
  });
  
  setNodeIdCounter((prev) => prev + 1);
}
```

#### b. Update `convertGraphToNodes` (around line 202):

```typescript
} else if (node.type === 'youreffect') {
  return {
    ...baseNode,
    data: {
      type: 'youreffect' as const,
      param1: node.params.param1 !== undefined ? node.params.param1 : 50,
      param2: node.params.param2 !== undefined ? node.params.param2 : 500,
      mix: node.params.mix || 0,  // If your effect has wet/dry mix
      deletable: true,
      onChange: (key: string, value: number) => {
        handleNodeValueChange(node.id, key, value);
      },
      onRemove: () => handleRemoveNode(node.id)
    }
  };
}
```

#### c. Update `saveToLocalStorage` (around line 71):

```typescript
} else if (node.data.type === 'youreffect') {
  baseNode.params = { 
    param1: node.data.param1 !== undefined ? node.data.param1 : 50,
    param2: node.data.param2 !== undefined ? node.data.param2 : 500,
    mix: node.data.mix || 0  // If your effect has wet/dry mix
  };
}
```

## Testing Your New Effect

1. Build the extension: `npm run build`
2. Reload the extension in Chrome
3. Open the side panel and click the "Add Effect" button
4. Select your new effect
5. Connect it between input and output nodes
6. Adjust parameters and verify audio processing works correctly

## Common Web Audio API Effects

Here are some Web Audio API nodes you might use:

- **Filter**: `audioContext.createBiquadFilter()`
- **Distortion**: `audioContext.createWaveShaper()`
- **Compressor**: `audioContext.createDynamicsCompressor()`
- **Panner**: `audioContext.createStereoPanner()`
- **Gain**: `audioContext.createGain()`
- **Oscillator**: `audioContext.createOscillator()`
- **Analyser**: `audioContext.createAnalyser()`

## Tips

1. Always implement wet/dry mixing for effects
2. Use `setValueAtTime()` for smooth parameter changes
3. Handle edge cases (undefined parameters, disconnection)
4. Add meaningful console.log statements for debugging
5. Test with various parameter combinations
6. Consider the order of connections in your effect chain
7. Remember to disconnect all nodes properly to avoid memory leaks

## Example: Adding a Simple Filter Effect

For a practical example, here's how you might implement a lowpass filter:

```javascript
} else if (node.type === 'filter') {
  const inputGain = audioContext.createGain();
  const dryGain = audioContext.createGain();
  const wetGain = audioContext.createGain();
  const filter = audioContext.createBiquadFilter();
  const merger = audioContext.createGain();
  
  // Configure filter
  filter.type = 'lowpass';
  filter.frequency.value = node.params.frequency || 1000;
  filter.Q.value = (node.params.resonance || 0) / 10; // Convert 0-100 to 0-10
  
  // Set up wet/dry mix
  const wetAmount = (node.params.mix || 0) / 100;
  const dryAmount = 1 - wetAmount;
  dryGain.gain.value = dryAmount;
  wetGain.gain.value = wetAmount;
  
  // Connect routing
  inputGain.connect(dryGain);
  inputGain.connect(filter);
  
  nodes.set(node.id, {
    type: 'filter',
    input: inputGain,
    output: merger,
    inputGain,
    dryGain,
    wetGain,
    filter,
    merger,
    params: node.params,
    audioContext
  });
  
  connections.push({ from: filter, to: wetGain });
  connections.push({ from: wetGain, to: merger });
  connections.push({ from: dryGain, to: merger });
}
```

This documentation should help you add any new effect to the Patchrome extension!