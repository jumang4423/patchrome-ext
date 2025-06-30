# Inject.js Migration Guide

## Overview
This guide explains how to complete the migration of the large inject.js file into a modular structure.

## Completed Modules

### 1. Configuration (`config.js`)
- Extracted global settings and tracking objects
- Exports settings, worklet URLs, and WeakMap/WeakSet instances

### 2. Effects
- **reverb.js** - Reverb effect with impulse response generation
- **delay.js** - Delay effect with feedback
- **utility.js** - Volume, pan, and phase controls
- **limiter.js** - Dynamic range limiter
- **index.js** - Central export point for all effects

### 3. Audio Graph
- **builder.js** - Main graph building logic
- **updater.js** - Parameter update logic

## Remaining Work

### 1. Complete Effect Modules
Create the following effect modules following the same pattern:

#### distortion.js
```javascript
// Extract from lines ~290-350 of inject.js
// Includes waveShaper curve generation
```

#### toneGenerator.js
```javascript
// Extract from lines ~351-410
// Oscillator-based tone generation
```

#### equalizer.js
```javascript
// Extract from lines ~411-540
// Multi-band EQ with filters
```

#### phaser.js
```javascript
// Extract from lines ~541-625
// All-pass filter based phaser
```

#### flanger.js
```javascript
// Extract from lines ~626-710
// Short delay-based flanger
```

#### spectralGate.js, spectralCompressor.js, spectralPitch.js
```javascript
// Extract from lines ~711-870
// AudioWorklet-based effects
```

#### bitcrusher.js
```javascript
// Extract from lines ~871-940
// Bit depth and sample rate reduction
```

### 2. Media Handler Modules

#### mediaHandlers/processor.js
```javascript
export function setupAudioProcessing(element) {
  // Extract from lines ~1982-2050
}

export function updateMediaElement(element, forceRebuild = false) {
  // Extract from lines ~2051-2090
}
```

#### mediaHandlers/pitchControl.js
```javascript
export function getCurrentSpeed(element) {
  // Extract from lines ~1878-1890
}

export function applyPitchSettings(element, speed) {
  // Extract from lines ~2091-2103
}
```

#### mediaHandlers/scanner.js
```javascript
export function updateAllMedia() {
  // Extract from lines ~2104-2110
}
```

### 3. Communication Modules

#### communication/messageHandler.js
```javascript
// Extract message event listener from lines ~2140-2172
export function setupMessageHandler() {
  window.addEventListener('message', handleMessage);
}

function handleMessage(event) {
  // Message handling logic
}
```

### 4. Observer Modules

#### observers/domObserver.js
```javascript
// Extract from lines ~2174-2203
export function setupDOMObserver() {
  // MutationObserver setup
}
```

#### observers/mediaOverrides.js
```javascript
// Extract from lines ~2111-2139
export function setupMediaOverrides() {
  // HTMLMediaElement.prototype.play override
}
```

### 5. Platform-Specific Modules

#### platforms/soundcloud.js
```javascript
// Extract from lines ~2206-2350
export function setupSoundCloudHandling() {
  // AudioContext interception
}
```

### 6. Main Entry Point

#### inject/index.js
```javascript
import { settings, processedElements, audioContexts, audioGraphs } from './config.js';
import { buildAudioGraph } from './audioGraph/builder.js';
import { updateAudioGraphParams } from './audioGraph/updater.js';
import { setupAudioProcessing, updateAllMedia } from './mediaHandlers/processor.js';
import { setupMessageHandler } from './communication/messageHandler.js';
import { setupDOMObserver } from './observers/domObserver.js';
import { setupMediaOverrides } from './observers/mediaOverrides.js';
import { setupSoundCloudHandling } from './platforms/soundcloud.js';

// Initialize everything
(function() {
  'use strict';
  
  // Setup all handlers and observers
  setupMessageHandler();
  setupMediaOverrides();
  setupDOMObserver();
  
  // Platform-specific setup
  if (window.location.hostname === 'soundcloud.com') {
    setupSoundCloudHandling();
  }
  
  // Initial media scan
  setTimeout(updateAllMedia, 100);
  
  // Periodic scan
  setInterval(updateAllMedia, 1000);
})();
```

## Migration Steps

1. **Extract Each Effect Module**
   - Copy the effect creation code from buildAudioGraph
   - Copy the update code from updateAudioGraphParams
   - Follow the pattern established in reverb.js, delay.js, etc.

2. **Update Effect Imports**
   - Add each new effect to effects/index.js
   - Update effectCreators and effectUpdaters objects

3. **Extract Media Handling**
   - Move all media element processing functions
   - Keep the separation between processing and scanning

4. **Extract Communication**
   - Move message handling to its own module
   - Ensure settings updates trigger media updates

5. **Extract Observers**
   - Separate DOM observation from media overrides
   - Keep platform-specific code isolated

6. **Create Main Entry Point**
   - Import all modules
   - Initialize in the correct order
   - Maintain the same external behavior

7. **Update Build Configuration**
   - Ensure webpack can handle the ES6 module imports
   - May need to adjust the entry point in webpack.config.js

## Testing

After migration:
1. Test that all effects still work
2. Verify settings updates apply correctly
3. Check that new media elements are detected
4. Test platform-specific features (SoundCloud)
5. Ensure no console errors

## Benefits

- **Maintainability**: Each module has a single responsibility
- **Testability**: Individual effects can be unit tested
- **Reusability**: Effects can be used in other projects
- **Performance**: Potential for lazy loading
- **Development**: Easier to find and modify specific features