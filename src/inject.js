// This runs in the page context
(function() {
  'use strict';
  
  let settings = {
    enabled: true,
    speed: 1.0,
    reverb: 0,
    audioGraph: {
      nodes: [
        { id: '1', type: 'input', params: { speed: 1.0 } },
        { id: '3', type: 'output', params: {} }
      ],
      edges: [
        { id: 'e1-3', source: '1', target: '3' },
      ]
    }
  };
  
  // Keep track of processed elements
  const processedElements = new WeakSet();
  const audioContexts = new WeakMap();
  const audioGraphs = new WeakMap();
  
  // Create reverb impulse response with size and decay parameters
  function createReverbImpulse(audioContext, size = 50, decay = 1000) {
    // Size affects the duration (0-100% maps to 0.1-2.0 seconds)
    const duration = 0.1 + (size / 100) * 1.9;
    // Decay in milliseconds affects the decay rate
    // Convert decay time to a decay factor (higher decay time = slower decay)
    const decayRate = Math.max(1.0, 10.0 - (decay / 1000) * 4.0);
    
    const length = audioContext.sampleRate * duration;
    const impulse = audioContext.createBuffer(2, length, audioContext.sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      
      // Add early reflections for live house character
      // Scale early reflections based on size
      const sizeMultiplier = 0.5 + (size / 100) * 0.5;
      const earlyReflections = [
        { time: 0.015 * sizeMultiplier, gain: 0.5 },
        { time: 0.025 * sizeMultiplier, gain: 0.3 },
        { time: 0.035 * sizeMultiplier, gain: 0.2 },
        { time: 0.045 * sizeMultiplier, gain: 0.15 }
      ];
      
      for (let i = 0; i < length; i++) {
        const t = i / audioContext.sampleRate;
        let sample = 0;
        
        // Add early reflections
        for (const reflection of earlyReflections) {
          const reflectionSample = Math.floor(reflection.time * audioContext.sampleRate);
          if (i === reflectionSample) {
            sample += (Math.random() * 2 - 1) * reflection.gain;
          }
        }
        
        // Add diffuse reverb tail with adjustable decay
        sample += (Math.random() * 2 - 1) * Math.pow(1 - i / length, decayRate) * 0.5;
        
        // Apply slight stereo spread
        if (channel === 1) {
          sample *= 0.9 + Math.random() * 0.2;
        }
        
        channelData[i] = sample;
      }
    }
    
    return impulse;
  }
  
  // Build audio graph from node graph
  function buildAudioGraph(audioContext, source, nodeGraph, customDestination) {
    const nodes = new Map();
    const connections = [];
    
    // Create audio nodes based on graph nodes
    nodeGraph.nodes.forEach(node => {
      if (node.type === 'input') {
        nodes.set(node.id, {
          type: 'input',
          audioNode: source,
          params: node.params
        });
      } else if (node.type === 'reverb') {
        // Create reverb effect chain
        const inputGain = audioContext.createGain(); // Add input gain for easier reconnection
        const dryGain = audioContext.createGain();
        const wetGain = audioContext.createGain();
        const convolver = audioContext.createConvolver();
        const merger = audioContext.createGain();
        
        // Create impulse with size and decay parameters
        const size = node.params.size !== undefined ? node.params.size : 50;
        const decay = node.params.decay !== undefined ? node.params.decay : 1000;
        convolver.buffer = createReverbImpulse(audioContext, size, decay);
        
        // Set up wet/dry mix
        const wetAmount = (node.params.mix || 0) / 100;
        const dryAmount = 1 - wetAmount;
        dryGain.gain.value = dryAmount;
        wetGain.gain.value = wetAmount;
        
        // Connect internal routing
        inputGain.connect(dryGain);
        inputGain.connect(convolver);
        
        nodes.set(node.id, {
          type: 'reverb',
          input: inputGain,
          output: merger,
          inputGain,
          dryGain,
          wetGain,
          convolver,
          merger,
          params: node.params,
          audioContext
        });
        
        // Store internal connections
        connections.push({ from: convolver, to: wetGain });
        connections.push({ from: wetGain, to: merger });
        connections.push({ from: dryGain, to: merger });
      } else if (node.type === 'delay') {
        // Create delay effect chain
        const inputGain = audioContext.createGain();
        const dryGain = audioContext.createGain();
        const wetGain = audioContext.createGain();
        const delayNode = audioContext.createDelay(2); // Max 2 seconds delay
        const feedbackGain = audioContext.createGain();
        const merger = audioContext.createGain();
        
        // Set delay time in seconds (convert from milliseconds)
        const delayTime = node.params.delayTime !== undefined ? node.params.delayTime / 1000 : 0.5;
        delayNode.delayTime.value = delayTime;
        
        // Set feedback amount (0-1 range)
        const feedbackAmount = (node.params.feedback || 0) / 100;
        feedbackGain.gain.value = feedbackAmount;
        
        // Set up wet/dry mix
        const wetAmount = (node.params.mix || 0) / 100;
        const dryAmount = 1 - wetAmount;
        dryGain.gain.value = dryAmount;
        wetGain.gain.value = wetAmount;
        
        // Connect internal routing
        inputGain.connect(dryGain);
        inputGain.connect(delayNode);
        
        nodes.set(node.id, {
          type: 'delay',
          input: inputGain,
          output: merger,
          inputGain,
          dryGain,
          wetGain,
          delayNode,
          feedbackGain,
          merger,
          params: node.params,
          audioContext
        });
        
        // Store internal connections
        connections.push({ from: delayNode, to: feedbackGain });
        connections.push({ from: feedbackGain, to: delayNode }); // Feedback loop
        connections.push({ from: delayNode, to: wetGain });
        connections.push({ from: wetGain, to: merger });
        connections.push({ from: dryGain, to: merger });
      } else if (node.type === 'gain') {
        // Create gain node with volume and panning
        const inputGain = audioContext.createGain();
        const gainNode = audioContext.createGain();
        const pannerNode = audioContext.createStereoPanner();
        
        // Convert dB to linear gain (-inf dB = 0, 0 dB = 1, +12 dB = ~4)
        const volumeDb = node.params.volume !== undefined ? node.params.volume : 0;
        let gainValue;
        if (volumeDb <= -60) {
          gainValue = 0; // Treat -60dB and below as silence
        } else {
          gainValue = Math.pow(10, volumeDb / 20);
        }
        gainNode.gain.value = gainValue;
        
        // Set pan value (-100 to +100 maps to -1 to +1)
        const panValue = node.params.pan !== undefined ? node.params.pan / 100 : 0;
        pannerNode.pan.value = panValue;
        
        // Connect routing: input -> gain -> panner
        inputGain.connect(gainNode);
        
        nodes.set(node.id, {
          type: 'gain',
          input: inputGain,
          output: pannerNode,
          inputGain,
          gainNode,
          pannerNode,
          params: node.params,
          audioContext
        });
        
        // Store internal connections
        connections.push({ from: gainNode, to: pannerNode });
      } else if (node.type === 'output') {
        // Add a master gain to control overall volume
        const masterGain = audioContext.createGain();
        masterGain.gain.value = 0.8; // Reduce volume to 80% to prevent clipping
        masterGain.connect(customDestination || audioContext.destination);
        
        nodes.set(node.id, {
          type: 'output',
          audioNode: masterGain,
          masterGain: masterGain
        });
      }
    });
    
    // Connect nodes based on edges
    nodeGraph.edges.forEach(edge => {
      const sourceNode = nodes.get(edge.source);
      const targetNode = nodes.get(edge.target);
      
      if (sourceNode && targetNode) {
        if (sourceNode.type === 'input') {
          if (targetNode.type === 'reverb') {
            // Connect to reverb input
            sourceNode.audioNode.connect(targetNode.inputGain);
          } else if (targetNode.type === 'delay') {
            // Connect to delay input
            sourceNode.audioNode.connect(targetNode.inputGain);
          } else if (targetNode.type === 'gain') {
            // Connect to gain input
            sourceNode.audioNode.connect(targetNode.inputGain);
          } else if (targetNode.type === 'output') {
            sourceNode.audioNode.connect(targetNode.audioNode);
          }
        } else if (sourceNode.type === 'reverb') {
          if (targetNode.type === 'reverb') {
            // Connect reverb output to next reverb input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'delay') {
            // Connect reverb output to delay input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'gain') {
            // Connect reverb output to gain input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'output') {
            sourceNode.output.connect(targetNode.audioNode);
          }
        } else if (sourceNode.type === 'delay') {
          if (targetNode.type === 'reverb') {
            // Connect delay output to reverb input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'delay') {
            // Connect delay output to next delay input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'gain') {
            // Connect delay output to gain input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'output') {
            sourceNode.output.connect(targetNode.audioNode);
          }
        } else if (sourceNode.type === 'gain') {
          if (targetNode.type === 'reverb') {
            // Connect gain output to reverb input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'delay') {
            // Connect gain output to delay input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'gain') {
            // Connect gain output to next gain input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'output') {
            sourceNode.output.connect(targetNode.audioNode);
          }
        }
      }
    });
    
    // Apply all internal connections
    connections.forEach(conn => {
      conn.from.connect(conn.to);
    });
    
    return nodes;
  }
  
  // Update audio graph parameters
  function updateAudioGraphParams(element) {
    const graph = audioGraphs.get(element);
    if (!graph) return;
    
    // First, set all effect nodes to 0 (in case some are orphaned)
    graph.forEach((node) => {
      if ((node.type === 'reverb' || node.type === 'delay') && node.wetGain && node.dryGain) {
        node.wetGain.gain.value = 0;
        node.dryGain.gain.value = 1;
      }
    });
    
    // Then update only the nodes that exist in the current graph
    graph.forEach((node, nodeId) => {
      const graphNode = settings.audioGraph.nodes.find(n => n.id === nodeId);
      if (!graphNode) {
        // This node doesn't exist in the graph anymore, ensure it's muted
        if ((node.type === 'reverb' || node.type === 'delay') && node.wetGain) {
          node.wetGain.gain.value = 0;
          node.dryGain.gain.value = 1;
        }
        return;
      }
      
      if (node.type === 'reverb' && node.wetGain && node.dryGain) {
        const wetAmount = (graphNode.params.mix || 0) / 100;
        const dryAmount = 1 - wetAmount;
        
        // Use setValueAtTime for immediate parameter changes
        const currentTime = audioContexts.get(element)?.currentTime || 0;
        node.wetGain.gain.setValueAtTime(wetAmount, currentTime);
        node.dryGain.gain.setValueAtTime(dryAmount, currentTime);
        
        // Check if size or decay changed, and update impulse if needed
        const currentSize = graphNode.params.size !== undefined ? graphNode.params.size : 50;
        const currentDecay = graphNode.params.decay !== undefined ? graphNode.params.decay : 1000;
        const prevSize = node.params.size !== undefined ? node.params.size : 50;
        const prevDecay = node.params.decay !== undefined ? node.params.decay : 1000;
        
        if (currentSize !== prevSize || currentDecay !== prevDecay) {
          // Need to recreate convolver node because Web Audio API doesn't allow buffer changes
          const oldConvolver = node.convolver;
          const newConvolver = node.audioContext.createConvolver();
          newConvolver.buffer = createReverbImpulse(node.audioContext, currentSize, currentDecay);
          
          // Disconnect old convolver
          try { oldConvolver.disconnect(); } catch(e) {}
          
          // Reconnect with new convolver
          node.inputGain.connect(newConvolver);
          newConvolver.connect(node.wetGain);
          
          // Update the node reference
          node.convolver = newConvolver;
        }
        
        // Always update the stored parameters
        node.params = { ...graphNode.params };
        
        console.log(`Patchrome: Updated reverb ${nodeId} - wet: ${wetAmount}, dry: ${dryAmount}, size: ${currentSize}, decay: ${currentDecay}`);
      } else if (node.type === 'delay' && node.wetGain && node.dryGain) {
        const wetAmount = (graphNode.params.mix || 0) / 100;
        const dryAmount = 1 - wetAmount;
        
        // Use setValueAtTime for immediate parameter changes
        const currentTime = audioContexts.get(element)?.currentTime || 0;
        node.wetGain.gain.setValueAtTime(wetAmount, currentTime);
        node.dryGain.gain.setValueAtTime(dryAmount, currentTime);
        
        // Update delay time (convert from ms to seconds)
        const delayTime = graphNode.params.delayTime !== undefined ? graphNode.params.delayTime / 1000 : 0.5;
        node.delayNode.delayTime.setValueAtTime(delayTime, currentTime);
        
        // Update feedback
        const feedbackAmount = (graphNode.params.feedback || 0) / 100;
        node.feedbackGain.gain.setValueAtTime(feedbackAmount, currentTime);
        
        // Always update the stored parameters
        node.params = { ...graphNode.params };
        
        console.log(`Patchrome: Updated delay ${nodeId} - wet: ${wetAmount}, dry: ${dryAmount}, delay: ${delayTime}s, feedback: ${feedbackAmount}`);
      } else if (node.type === 'gain' && node.gainNode && node.pannerNode) {
        // Update volume (convert dB to linear)
        const volumeDb = graphNode.params.volume !== undefined ? graphNode.params.volume : 0;
        let gainValue;
        if (volumeDb <= -60) {
          gainValue = 0; // Treat -60dB and below as silence
        } else {
          gainValue = Math.pow(10, volumeDb / 20);
        }
        
        // Update pan value (-100 to +100 maps to -1 to +1)
        const panValue = graphNode.params.pan !== undefined ? graphNode.params.pan / 100 : 0;
        
        // Use setValueAtTime for immediate parameter changes
        const currentTime = audioContexts.get(element)?.currentTime || 0;
        node.gainNode.gain.setValueAtTime(gainValue, currentTime);
        node.pannerNode.pan.setValueAtTime(panValue, currentTime);
        
        // Always update the stored parameters
        node.params = { ...graphNode.params };
        
        console.log(`Patchrome: Updated gain ${nodeId} - volume: ${volumeDb}dB (${gainValue}), pan: ${panValue}`);
      }
    });
  }
  
  // Get current speed from settings
  function getCurrentSpeed() {
    const inputNode = settings.audioGraph.nodes.find(n => n.type === 'input');
    return inputNode?.params.speed || settings.speed;
  }
  
  // Disconnect all nodes in the graph
  function disconnectAudioGraph(element) {
    const graph = audioGraphs.get(element);
    if (!graph) return;
    
    graph.forEach(node => {
      if (node.audioNode && node.audioNode.disconnect) {
        try { node.audioNode.disconnect(); } catch(e) {}
      }
      if (node.inputGain) {
        try { node.inputGain.disconnect(); } catch(e) {}
      }
      if (node.dryGain) {
        try { node.dryGain.disconnect(); } catch(e) {}
      }
      if (node.wetGain) {
        try { node.wetGain.disconnect(); } catch(e) {}
      }
      if (node.convolver) {
        try { node.convolver.disconnect(); } catch(e) {}
      }
      if (node.delayNode) {
        try { node.delayNode.disconnect(); } catch(e) {}
      }
      if (node.feedbackGain) {
        try { node.feedbackGain.disconnect(); } catch(e) {}
      }
      if (node.merger) {
        try { node.merger.disconnect(); } catch(e) {}
      }
      if (node.gainNode) {
        try { node.gainNode.disconnect(); } catch(e) {}
      }
      if (node.pannerNode) {
        try { node.pannerNode.disconnect(); } catch(e) {}
      }
      if (node.masterGain) {
        try { node.masterGain.disconnect(); } catch(e) {}
      }
      if (node.scriptProcessor) {
        try { node.scriptProcessor.disconnect(); } catch(e) {}
      }
    });
  }
  
  // Setup audio processing for media element
  function setupAudioProcessing(element, forceRebuild = false) {
    const hasExistingContext = audioContexts.has(element);
    
    if (hasExistingContext && !forceRebuild) {
      // Only update parameters, don't rebuild
      updateAudioGraphParams(element);
      return;
    }
    
    if (hasExistingContext && forceRebuild) {
      // Disconnect existing graph before rebuilding
      disconnectAudioGraph(element);
      
      const audioContext = audioContexts.get(element);
      // Get the existing source (we can't create a new one)
      const existingGraph = audioGraphs.get(element);
      let source = null;
      existingGraph.forEach(node => {
        if (node.type === 'input' && node.audioNode) {
          source = node.audioNode;
        }
      });
      
      if (source) {
        // Rebuild audio graph with existing source
        const audioNodes = buildAudioGraph(audioContext, source, settings.audioGraph);
        audioGraphs.set(element, audioNodes);
      }
      return;
    }
    
    // Skip if on SoundCloud - handled separately
    if (window.location.hostname.includes('soundcloud.com')) return;
    
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaElementSource(element);
      
      // Build audio graph
      const audioNodes = buildAudioGraph(audioContext, source, settings.audioGraph);
      
      // Store references
      audioContexts.set(element, audioContext);
      audioGraphs.set(element, audioNodes);
      
    } catch (e) {
      console.error('Patchrome: Failed to setup audio processing', e);
    }
  }
  
  // Update a single media element
  function updateMediaElement(element) {
    if (!element) return;
    
    // Setup/update audio processing
    setupAudioProcessing(element, false);
    
    // Add property descriptor to catch changes
    if (!processedElements.has(element)) {
      processedElements.add(element);
      
      // Store original descriptor
      const originalDescriptor = Object.getOwnPropertyDescriptor(element, 'playbackRate') || 
                               Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'playbackRate');
      
      // Override playbackRate property
      Object.defineProperty(element, 'playbackRate', {
        get: function() {
          return originalDescriptor.get.call(this);
        },
        set: function(value) {
          // Always use our speed setting (get it fresh each time)
          const currentSpeed = getCurrentSpeed();
          if (isFinite(currentSpeed) && currentSpeed > 0) {
            originalDescriptor.set.call(this, currentSpeed);
            // Apply pitch preservation setting after each playback rate change
            applyPitchSettings(this);
          } else if (isFinite(value) && value > 0) {
            originalDescriptor.set.call(this, value);
            applyPitchSettings(this);
          }
        },
        configurable: true
      });
    }
    
    const currentSpeed = getCurrentSpeed();
    if (isFinite(currentSpeed) && currentSpeed > 0) {
      // Set playback rate with validation
      element.playbackRate = currentSpeed;
      
      // Apply pitch settings
      applyPitchSettings(element);
    }
  }
  
  // Apply pitch preservation settings
  function applyPitchSettings(element) {
    // IMPORTANT: Disable pitch preservation to get pitch shift effect
    if ('preservesPitch' in element) {
      element.preservesPitch = false;
    }
    if ('mozPreservesPitch' in element) {
      element.mozPreservesPitch = false;
    }
    if ('webkitPreservesPitch' in element) {
      element.webkitPreservesPitch = false;
    }
  }
  
  // Find and update all media elements
  function updateAllMedia() {
    const elements = document.querySelectorAll('audio, video');
    elements.forEach(updateMediaElement);
  }
  
  // Override play method to catch new elements
  const originalPlay = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function() {
    updateMediaElement(this);
    return originalPlay.apply(this, arguments);
  };
  
  // Listen for settings from content script
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'PATCHROME_SETTINGS') {
      console.log('[Inject] Received PATCHROME_SETTINGS:', event.data.settings);
      const newSettings = event.data.settings;
      let needsRebuild = false;
      
      // Validate settings before applying
      if (newSettings) {
        if (typeof newSettings.speed === 'number' && isFinite(newSettings.speed) && newSettings.speed > 0) {
          settings.speed = newSettings.speed;
        }
        if (typeof newSettings.reverb === 'number' && isFinite(newSettings.reverb) && newSettings.reverb >= 0 && newSettings.reverb <= 100) {
          settings.reverb = newSettings.reverb;
        }
        if (newSettings.audioGraph) {
          // Check if edges or nodes have changed
          const oldEdges = JSON.stringify(settings.audioGraph.edges);
          const newEdges = JSON.stringify(newSettings.audioGraph.edges);
          const oldNodes = JSON.stringify(settings.audioGraph.nodes.map(n => ({ id: n.id, type: n.type })));
          const newNodes = JSON.stringify(newSettings.audioGraph.nodes.map(n => ({ id: n.id, type: n.type })));
          
          if (oldEdges !== newEdges || oldNodes !== newNodes) {
            needsRebuild = true;
            console.log('Patchrome: Audio graph rebuild triggered');
          }
          
          // Always update the settings
          settings.audioGraph = newSettings.audioGraph;
        }
        settings.enabled = newSettings.enabled !== false;
      }
      
      console.log(`[Inject] needsRebuild: ${needsRebuild}, settings.audioGraph:`, settings.audioGraph);
      
      if (needsRebuild) {
        // Force rebuild all audio graphs
        console.log('[Inject] Rebuilding audio graphs');
        const elements = document.querySelectorAll('audio, video');
        elements.forEach(element => setupAudioProcessing(element, true));
      } else {
        console.log('[Inject] Updating audio parameters only');
        updateAllMedia();
      }
    }
  });
  
  // Observer for new media elements
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.matches && (node.matches('audio, video'))) {
              updateMediaElement(node);
            }
            // Check descendants
            const mediaElements = node.querySelectorAll && node.querySelectorAll('audio, video');
            if (mediaElements) {
              mediaElements.forEach(updateMediaElement);
            }
          }
        });
      }
    }
  });
  
  // Start observing
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  let checkInterval = 100;
  
  // Check for media elements periodically
  setInterval(updateAllMedia, checkInterval);
  
  // Special handling for SoundCloud which may use Web Audio API
  // Intercept AudioContext creation to handle pitch changes and reverb
  if (window.location.hostname.includes('soundcloud.com')) {
    const OriginalAudioContext = window.AudioContext || window.webkitAudioContext;
    const contexts = new WeakMap();
    const soundcloudSources = new WeakMap();
    const sourceConnections = new WeakMap();
    let needsSoundCloudRebuild = false;
    
    // Watch for edge changes that require rebuild
    const originalMessageHandler = window.addEventListener;
    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'PATCHROME_SETTINGS') {
        const newSettings = event.data.settings;
        if (newSettings && newSettings.audioGraph) {
          // Mark for rebuild on next connect
          needsSoundCloudRebuild = true;
        }
      }
    });
    
    window.AudioContext = window.webkitAudioContext = function(...args) {
      const ctx = new OriginalAudioContext(...args);
      
      const originalCreateMediaElementSource = ctx.createMediaElementSource;
      ctx.createMediaElementSource = function(mediaElement) {
        // Clear any existing source for this media element to handle track changes
        if (soundcloudSources.has(mediaElement)) {
          const oldProxy = soundcloudSources.get(mediaElement);
          if (oldProxy.disconnect) {
            oldProxy.disconnect();
          }
          soundcloudSources.delete(mediaElement);
          audioGraphs.delete(mediaElement);
          audioContexts.delete(mediaElement);
        }
        
        const source = originalCreateMediaElementSource.call(this, mediaElement);
        
        // Create a proxy source that intercepts connections
        const proxySource = {
          connect: function(destination) {
            // Clean up any existing connection
            const existingConnection = sourceConnections.get(source);
            if (existingConnection) {
              // Disconnect all nodes in the graph
              existingConnection.nodes.forEach(node => {
                if (node.audioNode && node.audioNode.disconnect) {
                  node.audioNode.disconnect();
                }
                if (node.dryGain) node.dryGain.disconnect();
                if (node.wetGain) node.wetGain.disconnect();
                if (node.convolver) node.convolver.disconnect();
                if (node.merger) node.merger.disconnect();
              });
              source.disconnect();
              if (existingConnection.interval) {
                clearInterval(existingConnection.interval);
              }
            }
            
            // Store the relationship between context and media element
            contexts.set(mediaElement, ctx);
            audioContexts.set(mediaElement, ctx);
            
            // Disconnect existing graph if any
            disconnectAudioGraph(mediaElement);
            
            // Build dynamic audio graph with custom destination
            const audioNodes = buildAudioGraph(ctx, source, settings.audioGraph, destination);
            audioGraphs.set(mediaElement, audioNodes);
            
            // Ensure pitch settings are applied
            applyPitchSettings(mediaElement);
            
            // Monitor changes
            const checkPitch = () => {
              const currentSpeed = getCurrentSpeed();
              if (mediaElement.playbackRate !== currentSpeed) {
                mediaElement.playbackRate = currentSpeed;
              }
              applyPitchSettings(mediaElement);
              updateAudioGraphParams(mediaElement);
              
              // Check if we need to rebuild the graph
              if (needsSoundCloudRebuild) {
                needsSoundCloudRebuild = false;
                // Trigger reconnect by calling connect again
                this.connect(destination);
              }
            };
            
            // Check more frequently for SoundCloud
            const interval = setInterval(checkPitch, 50);
            
            // Store connection info
            sourceConnections.set(source, {
              nodes: audioNodes,
              destination,
              interval
            });
          },
          disconnect: function() {
            const connection = sourceConnections.get(source);
            if (connection) {
              connection.nodes.forEach(node => {
                if (node.audioNode && node.audioNode.disconnect) {
                  node.audioNode.disconnect();
                }
                if (node.dryGain) node.dryGain.disconnect();
                if (node.wetGain) node.wetGain.disconnect();
                if (node.convolver) node.convolver.disconnect();
                if (node.merger) node.merger.disconnect();
              });
              if (connection.interval) {
                clearInterval(connection.interval);
              }
              sourceConnections.delete(source);
            }
            source.disconnect();
          },
          // Forward other properties/methods
          get mediaElement() { return source.mediaElement; },
          get context() { return source.context; },
          get numberOfOutputs() { return source.numberOfOutputs; },
          get numberOfInputs() { return source.numberOfInputs; },
          get channelCount() { return source.channelCount; },
          get channelCountMode() { return source.channelCountMode; },
          get channelInterpretation() { return source.channelInterpretation; }
        };
        
        soundcloudSources.set(mediaElement, proxySource);
        
        return proxySource;
      };
      
      return ctx;
    };
  }
  
  // Initial check
  setTimeout(updateAllMedia, 100);
  
  // Additional check after page fully loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateAllMedia);
  }
  window.addEventListener('load', () => {
    setTimeout(updateAllMedia, 1000);
  });
})();