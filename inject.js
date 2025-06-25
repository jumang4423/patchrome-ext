// This runs in the page context
(function() {
  'use strict';
  
  console.log('Patchrome: Injected script loaded');
  
  let settings = {
    enabled: true,
    speed: 1.0,
    reverb: 0
  };
  
  // Keep track of processed elements
  const processedElements = new WeakSet();
  const audioContexts = new WeakMap();
  const audioNodes = new WeakMap();
  
  // Create reverb impulse response
  function createReverbImpulse(audioContext, duration = 2, decay = 2) {
    const length = audioContext.sampleRate * duration;
    const impulse = audioContext.createBuffer(2, length, audioContext.sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }
    
    return impulse;
  }
  
  // Setup audio processing for media element
  function setupAudioProcessing(element) {
    if (audioContexts.has(element)) return;
    
    // Skip if on SoundCloud - handled separately
    if (window.location.hostname.includes('soundcloud.com')) return;
    
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaElementSource(element);
      
      // Create nodes
      const dryGain = audioContext.createGain();
      const wetGain = audioContext.createGain();
      const convolver = audioContext.createConvolver();
      const merger = audioContext.createGain();
      
      // Set up convolver (reverb)
      convolver.buffer = createReverbImpulse(audioContext);
      
      // Connect the graph
      // Dry path: source -> dryGain -> merger -> destination
      source.connect(dryGain);
      dryGain.connect(merger);
      
      // Wet path: source -> convolver -> wetGain -> merger -> destination
      source.connect(convolver);
      convolver.connect(wetGain);
      wetGain.connect(merger);
      
      merger.connect(audioContext.destination);
      
      // Store references
      audioContexts.set(element, audioContext);
      audioNodes.set(element, {
        source,
        dryGain,
        wetGain,
        convolver,
        merger
      });
      
      // Apply initial reverb settings
      updateReverbMix(element);
      
    } catch (e) {
      console.error('Patchrome: Failed to setup audio processing', e);
    }
  }
  
  // Update reverb mix
  function updateReverbMix(element) {
    const nodes = audioNodes.get(element);
    if (!nodes) return;
    
    const wetAmount = settings.reverb / 100;
    const dryAmount = 1 - wetAmount;
    
    nodes.dryGain.gain.value = dryAmount;
    nodes.wetGain.gain.value = wetAmount;
  }
  
  // Update a single media element
  function updateMediaElement(element) {
    if (!element) return;

    console.log("change pitch excuted: ", element, "speed:", settings.speed, "reverb:", settings.reverb);
    
    // Setup audio processing if reverb is enabled
    if (settings.reverb > 0 && !audioContexts.has(element)) {
      setupAudioProcessing(element);
    }
    
    // Update reverb mix
    if (audioContexts.has(element)) {
      updateReverbMix(element);
    }
    
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
          // Always use our speed setting
          if (isFinite(settings.speed) && settings.speed > 0) {
            originalDescriptor.set.call(this, settings.speed);
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
    
    if (isFinite(settings.speed) && settings.speed > 0) {
      // Set playback rate with validation
      element.playbackRate = settings.speed;
      
      // Apply pitch settings
      applyPitchSettings(element);
      
      console.log('Patchrome: Updated element - speed:', settings.speed, 'reverb:', settings.reverb);
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
    console.log('Patchrome: Updating', elements.length, 'media elements');
    elements.forEach(updateMediaElement);
  }
  
  // Override play method to catch new elements
  const originalPlay = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function() {
    console.log('Patchrome: Media element playing');
    updateMediaElement(this);
    return originalPlay.apply(this, arguments);
  };
  
  // Listen for settings from content script
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'PATCHROME_SETTINGS') {
      const newSettings = event.data.settings;
      // Validate settings before applying
      if (newSettings) {
        if (typeof newSettings.speed === 'number' && isFinite(newSettings.speed) && newSettings.speed > 0) {
          settings.speed = newSettings.speed;
        }
        if (typeof newSettings.reverb === 'number' && isFinite(newSettings.reverb) && newSettings.reverb >= 0 && newSettings.reverb <= 100) {
          settings.reverb = newSettings.reverb;
        }
        settings.enabled = newSettings.enabled !== false;
      }
      console.log('Patchrome: Settings received', settings);
      updateAllMedia();
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
          audioNodes.delete(mediaElement);
          audioContexts.delete(mediaElement);
        }
        
        const source = originalCreateMediaElementSource.call(this, mediaElement);
        
        // Create a proxy source that intercepts connections
        const proxySource = {
          connect: function(destination) {
            // Clean up any existing connection
            const existingConnection = sourceConnections.get(source);
            if (existingConnection) {
              existingConnection.nodes.dryGain.disconnect();
              existingConnection.nodes.wetGain.disconnect();
              existingConnection.nodes.convolver.disconnect();
              existingConnection.nodes.merger.disconnect();
              source.disconnect();
              if (existingConnection.interval) {
                clearInterval(existingConnection.interval);
              }
            }
            
            // Store the relationship between context and media element
            contexts.set(mediaElement, ctx);
            audioContexts.set(mediaElement, ctx);
            
            // Create reverb nodes for SoundCloud
            const dryGain = ctx.createGain();
            const wetGain = ctx.createGain();
            const convolver = ctx.createConvolver();
            const merger = ctx.createGain();
            
            // Set up convolver (reverb)
            convolver.buffer = createReverbImpulse(ctx);
            
            // Connect the graph
            // Dry path: source -> dryGain -> merger -> destination
            source.connect(dryGain);
            dryGain.connect(merger);
            
            // Wet path: source -> convolver -> wetGain -> merger -> destination
            source.connect(convolver);
            convolver.connect(wetGain);
            wetGain.connect(merger);
            
            // Connect to the destination that SoundCloud intended
            merger.connect(destination);
            
            const nodes = {
              source,
              dryGain,
              wetGain,
              convolver,
              merger
            };
            
            // Store nodes
            audioNodes.set(mediaElement, nodes);
            
            // Apply initial reverb settings
            updateReverbMix(mediaElement);
            
            // Ensure pitch settings are applied
            applyPitchSettings(mediaElement);
            
            // Monitor changes
            const checkPitch = () => {
              if (mediaElement.playbackRate !== settings.speed) {
                mediaElement.playbackRate = settings.speed;
              }
              applyPitchSettings(mediaElement);
              updateReverbMix(mediaElement);
            };
            
            // Check more frequently for SoundCloud
            const interval = setInterval(checkPitch, 50);
            
            // Store connection info
            sourceConnections.set(source, {
              nodes,
              destination,
              interval
            });
          },
          disconnect: function() {
            const connection = sourceConnections.get(source);
            if (connection) {
              connection.nodes.dryGain.disconnect();
              connection.nodes.wetGain.disconnect();
              connection.nodes.convolver.disconnect();
              connection.nodes.merger.disconnect();
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