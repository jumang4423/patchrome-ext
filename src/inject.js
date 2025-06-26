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
        { id: '2', type: 'reverb', params: { mix: 0 } },
        { id: '3', type: 'output', params: {} }
      ],
      edges: [
        { id: 'e1-2', source: '1', target: '2' },
        { id: 'e2-3', source: '2', target: '3' }
      ]
    }
  };
  
  // Keep track of processed elements
  const processedElements = new WeakSet();
  const audioContexts = new WeakMap();
  const audioGraphs = new WeakMap();
  
  // Create reverb impulse response
  function createReverbImpulse(audioContext, duration = 0.6, decay = 3.5) {
    const length = audioContext.sampleRate * duration;
    const impulse = audioContext.createBuffer(2, length, audioContext.sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      
      // Add early reflections for live house character
      const earlyReflections = [
        { time: 0.015, gain: 0.5 },
        { time: 0.025, gain: 0.3 },
        { time: 0.035, gain: 0.2 },
        { time: 0.045, gain: 0.15 }
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
        
        // Add diffuse reverb tail with faster decay
        sample += (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay) * 0.5;
        
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
        const dryGain = audioContext.createGain();
        const wetGain = audioContext.createGain();
        const convolver = audioContext.createConvolver();
        const merger = audioContext.createGain();
        
        convolver.buffer = createReverbImpulse(audioContext);
        
        // Set up wet/dry mix
        const wetAmount = (node.params.mix || 0) / 100;
        const dryAmount = 1 - wetAmount;
        dryGain.gain.value = dryAmount;
        wetGain.gain.value = wetAmount;
        
        nodes.set(node.id, {
          type: 'reverb',
          input: merger,
          output: merger,
          dryGain,
          wetGain,
          convolver,
          merger,
          params: node.params
        });
        
        // Store internal connections
        connections.push({ from: convolver, to: wetGain });
        connections.push({ from: wetGain, to: merger });
        connections.push({ from: dryGain, to: merger });
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
            // Connect to both dry and wet paths
            sourceNode.audioNode.connect(targetNode.dryGain);
            sourceNode.audioNode.connect(targetNode.convolver);
          } else if (targetNode.type === 'output') {
            sourceNode.audioNode.connect(targetNode.audioNode);
          }
        } else if (sourceNode.type === 'reverb') {
          if (targetNode.type === 'reverb') {
            // Connect reverb output to next reverb input
            sourceNode.output.connect(targetNode.dryGain);
            sourceNode.output.connect(targetNode.convolver);
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
    
    graph.forEach((node, nodeId) => {
      const graphNode = settings.audioGraph.nodes.find(n => n.id === nodeId);
      if (!graphNode) return;
      
      if (node.type === 'reverb' && node.wetGain && node.dryGain) {
        const wetAmount = (graphNode.params.mix || 0) / 100;
        const dryAmount = 1 - wetAmount;
        node.wetGain.gain.value = wetAmount;
        node.dryGain.gain.value = dryAmount;
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
      if (node.dryGain) {
        try { node.dryGain.disconnect(); } catch(e) {}
      }
      if (node.wetGain) {
        try { node.wetGain.disconnect(); } catch(e) {}
      }
      if (node.convolver) {
        try { node.convolver.disconnect(); } catch(e) {}
      }
      if (node.merger) {
        try { node.merger.disconnect(); } catch(e) {}
      }
      if (node.masterGain) {
        try { node.masterGain.disconnect(); } catch(e) {}
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
          // Check if edges have changed
          const oldEdges = JSON.stringify(settings.audioGraph.edges);
          const newEdges = JSON.stringify(newSettings.audioGraph.edges);
          if (oldEdges !== newEdges) {
            needsRebuild = true;
          }
          settings.audioGraph = newSettings.audioGraph;
        }
        settings.enabled = newSettings.enabled !== false;
      }
      
      if (needsRebuild) {
        // Force rebuild all audio graphs
        const elements = document.querySelectorAll('audio, video');
        elements.forEach(element => setupAudioProcessing(element, true));
      } else {
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