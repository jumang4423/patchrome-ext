# Adding Audio Worklet Custom Effects to Patchrome

This guide explains how to add custom audio effects using AudioWorkletProcessor, including FFT-based processing like the spectral gate. This is for advanced effects that can't be implemented with standard Web Audio API nodes.

## Overview

Audio Worklets allow you to write custom audio processing code that runs in a separate thread for real-time, low-latency audio processing. This is perfect for:
- FFT-based effects (spectral processing)
- Custom synthesis algorithms
- Complex effects requiring sample-by-sample processing
- Effects that need internal state management

## Prerequisites

Before starting, make sure you understand:
- Basic Web Audio API concepts
- JavaScript typed arrays (Float32Array)
- Digital signal processing basics (for FFT-based effects)
- The structure of Patchrome's effect system (see ADD_EFFECT_INSTRUCTIONS.md)

## Step-by-Step Instructions

### 1. Create the AudioWorkletProcessor File

Create a new file in `src/worklets/` directory:

```javascript
// src/worklets/your-effect-processor.js
class YourEffectProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    
    // Initialize your processor state here
    this.someParameter = 0;
    
    console.log('Patchrome: YourEffectProcessor initialized');
  }
  
  // Main processing function - called for each audio block (128 samples)
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    
    // Check if we have valid input/output
    if (!input || input.length === 0 || !output || output.length === 0) {
      return true;
    }
    
    // Get parameters
    if (parameters.someParam && parameters.someParam.length > 0) {
      this.someParameter = parameters.someParam[0];
    }
    
    // Process each channel
    const numChannels = Math.min(input.length, output.length);
    for (let channel = 0; channel < numChannels; channel++) {
      const inputChannel = input[channel];
      const outputChannel = output[channel];
      
      // Your processing code here
      for (let i = 0; i < inputChannel.length; i++) {
        outputChannel[i] = inputChannel[i]; // Replace with your effect
      }
    }
    
    return true; // Keep processor alive
  }
  
  // Define parameters that can be controlled from the main thread
  static get parameterDescriptors() {
    return [{
      name: 'someParam',
      defaultValue: 0,
      minValue: -1,
      maxValue: 1,
      automationRate: 'k-rate' // or 'a-rate' for sample-accurate automation
    }];
  }
}

registerProcessor('your-effect-processor', YourEffectProcessor);
```

### 2. Add the Worklet File to Web Accessible Resources

Update `manifest.json`:
```json
"web_accessible_resources": [
  {
    "resources": ["inject.js", "src/worklets/spectral-gate-processor.js", "src/worklets/your-effect-processor.js"],
    "matches": ["<all_urls>"]
  }
]
```

### 3. Update Webpack Configuration

Ensure your worklet file is copied to the build directory. Update `webpack.config.js`:
```javascript
new CopyWebpackPlugin({
  patterns: [
    { from: 'manifest.json' },
    { from: '*.png' },
    { from: '*.gif' },
    { from: 'src/inject.js', to: 'inject.js' },
    { from: 'src/worklets/spectral-gate-processor.js', to: 'src/worklets/spectral-gate-processor.js' },
    { from: 'src/worklets/your-effect-processor.js', to: 'src/worklets/your-effect-processor.js' } // Add this
  ]
})
```

### 4. Update Type Definitions

Follow the standard steps in ADD_EFFECT_INSTRUCTIONS.md for updating types, but ensure your node interface includes any worklet-specific parameters.

### 5. Implement Audio Processing in inject.js

Add your effect case in the `buildAudioGraph` function:

```javascript
} else if (node.type === 'youreffect') {
  // Create the effect chain
  const inputGain = audioContext.createGain();
  const merger = audioContext.createGain();
  
  // Try to create AudioWorkletNode
  let yourEffectNode = null;
  
  // Check if AudioWorklet is supported
  if (audioContext.audioWorklet) {
    try {
      // Load the worklet module
      const workletUrl = chrome.runtime.getURL('src/worklets/your-effect-processor.js');
      await audioContext.audioWorklet.addModule(workletUrl);
      
      // Create the AudioWorkletNode
      yourEffectNode = new AudioWorkletNode(audioContext, 'your-effect-processor');
      
      // Set parameters
      const paramValue = node.params.someParam !== undefined ? node.params.someParam : 0;
      yourEffectNode.parameters.get('someParam').value = paramValue;
      
      // Connect routing
      inputGain.connect(yourEffectNode);
      yourEffectNode.connect(merger);
    } catch (e) {
      console.error('Patchrome: Failed to create your effect worklet:', e);
      // Fallback: connect directly (bypass)
      inputGain.connect(merger);
    }
  } else {
    console.warn('Patchrome: AudioWorklet not supported, effect bypassed');
    inputGain.connect(merger);
  }
  
  nodes.set(node.id, {
    type: 'youreffect',
    input: inputGain,
    output: merger,
    inputGain,
    merger,
    yourEffectNode,
    params: node.params,
    audioContext
  });
```

### 6. Handle Parameter Updates

In the `updateAudioGraphParams` function:

```javascript
} else if (node.type === 'youreffect' && node.yourEffectNode) {
  // Update parameters
  const paramValue = graphNode.params.someParam !== undefined ? graphNode.params.someParam : 0;
  
  // Use setValueAtTime for immediate parameter changes
  const currentTime = audioContexts.get(element)?.currentTime || 0;
  node.yourEffectNode.parameters.get('someParam').setValueAtTime(paramValue, currentTime);
  
  // Always update the stored parameters
  node.params = { ...graphNode.params };
  
  console.log(`Patchrome: Updated youreffect ${nodeId} - param: ${paramValue}`);
}
```

### 7. Important Note About Worklet URL Loading

Since `inject.js` runs in the page context and doesn't have access to `chrome.runtime.getURL()`, the worklet URL must be passed from the content script. This is already set up for spectral gate - make sure your effect follows the same pattern.

## FFT-Based Effect Example

Here's a template for FFT-based effects like spectral gate:

```javascript
class FFTEffectProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    
    // FFT parameters
    this.fftSize = 1024;
    this.hopSize = this.fftSize / 4; // 75% overlap
    
    // Hann window
    this.window = new Float32Array(this.fftSize);
    for (let i = 0; i < this.fftSize; i++) {
      this.window[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (this.fftSize - 1));
    }
    
    // Per-channel buffers for stereo
    this.channelData = [];
    for (let ch = 0; ch < 2; ch++) {
      this.channelData[ch] = {
        inputBuffer: new Float32Array(this.fftSize),
        outputBuffer: new Float32Array(this.fftSize),
        overlapBuffer: new Float32Array(this.fftSize),
        real: new Float32Array(this.fftSize),
        imag: new Float32Array(this.fftSize),
        inputPos: 0,
        outputPos: 0,
        hopCounter: 0
      };
    }
  }
  
  // FFT implementation (Cooley-Tukey)
  fft(real, imag, inverse = false) {
    // ... FFT implementation ...
  }
  
  // Process one FFT frame
  processFrame(channel) {
    const data = this.channelData[channel];
    
    // Apply window
    for (let i = 0; i < this.fftSize; i++) {
      data.real[i] = data.inputBuffer[i] * this.window[i];
      data.imag[i] = 0;
    }
    
    // Forward FFT
    this.fft(data.real, data.imag, false);
    
    // Your spectral processing here
    // Modify data.real and data.imag arrays
    
    // Inverse FFT
    this.fft(data.real, data.imag, true);
    
    // Window output and overlap-add
    for (let i = 0; i < this.fftSize; i++) {
      data.outputBuffer[i] = data.real[i] * this.window[i];
      data.overlapBuffer[i] += data.outputBuffer[i];
    }
  }
  
  process(inputs, outputs, parameters) {
    // Implement overlap-add processing
    // See spectral-gate-processor.js for full implementation
  }
}
```

## Best Practices

### 1. **Stereo Processing**
Always support stereo (2 channels) even if your effect processes channels identically:
```javascript
const numChannels = Math.min(input.length, output.length);
for (let ch = 0; ch < numChannels; ch++) {
  // Process each channel
}
```

### 2. **Parameter Validation**
Always check if parameters exist before accessing:
```javascript
if (parameters.myParam && parameters.myParam.length > 0) {
  this.myParam = parameters.myParam[0];
}
```

### 3. **Fallback Support**
Always provide a fallback when AudioWorklet isn't supported:
```javascript
if (audioContext.audioWorklet) {
  // Create worklet
} else {
  // Fallback: bypass or use standard Web Audio nodes
  inputGain.connect(merger);
}
```

### 4. **Windowing for FFT**
Always use windowing (Hann, Hamming, etc.) for FFT-based effects to avoid artifacts:
```javascript
// Hann window
this.window[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (this.fftSize - 1));
```

### 5. **Overlap-Add for Smooth Processing**
Use at least 50% overlap (75% is better) for FFT processing:
```javascript
this.hopSize = this.fftSize / 4; // 75% overlap
```

### 6. **Efficient Processing**
- Minimize allocations in the process() method
- Pre-allocate all buffers in constructor
- Use typed arrays (Float32Array) for performance
- Keep FFT size reasonable (512-2048 for real-time)

### 7. **Debugging**
Add console logs sparingly (they can affect performance):
```javascript
if (this.processedBlocks % 100 === 0) {
  console.log(`Processing block ${this.processedBlocks}`);
}
```

## Common FFT-Based Effects You Can Implement

1. **Spectral Gate** - Gates frequencies below threshold (implemented)
2. **Spectral Compressor** - Compress specific frequency bands
3. **Pitch Shifter** - Shift pitch using phase vocoder
4. **Spectral Filter** - Advanced filtering in frequency domain
5. **Robotizer/Vocoder** - Remove or modify phase information
6. **Spectral Freeze** - Freeze the spectrum at a moment
7. **Spectral Delay** - Delay specific frequency bands

## Testing Your Audio Worklet Effect

1. Build the extension with `npm run build`
2. Reload the extension in Chrome
3. Check the webpage console (F12) for initialization logs
4. Test with various parameter values
5. Verify stereo processing works correctly
6. Test CPU usage with performance monitor
7. Ensure no clicking/popping artifacts

## Troubleshooting

### Effect Not Loading
- Check console for worklet loading errors
- Verify the worklet file is in web_accessible_resources
- Ensure webpack copies the file correctly
- Check for syntax errors in the processor

### No Audio Output
- Verify process() returns true
- Check channel counting logic
- Ensure buffers are properly managed
- Add console logs to verify processing

### Clicking/Popping
- Check windowing implementation
- Verify overlap-add is correct
- Ensure no discontinuities in processing
- Check buffer boundaries

### Performance Issues
- Reduce FFT size
- Optimize inner loops
- Remove unnecessary calculations
- Use efficient algorithms

Remember: Audio worklets run in a real-time thread, so performance is critical!