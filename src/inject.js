// This runs in the page context
(function() {
  'use strict';
  
  
  let settings = {
    enabled: true,
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
  
  // Store the worklet URLs (will be set by content script)
  let spectralGateWorkletUrl = null;
  let spectralCompressorWorkletUrl = null;
  
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
        { time: 0.015 * sizeMultiplier, gain: 0.25 },  // Reduced from 0.5
        { time: 0.025 * sizeMultiplier, gain: 0.15 },  // Reduced from 0.3
        { time: 0.035 * sizeMultiplier, gain: 0.1 },   // Reduced from 0.2
        { time: 0.045 * sizeMultiplier, gain: 0.075 }  // Reduced from 0.15
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
        // Reduced amplitude from 0.5 to 0.25
        sample += (Math.random() * 2 - 1) * Math.pow(1 - i / length, decayRate) * 0.25;
        
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
  async function buildAudioGraph(audioContext, source, nodeGraph, customDestination) {
    const nodes = new Map();
    const connections = [];
    
    // If disabled, just connect source directly to destination
    if (!settings.enabled) {
      source.connect(customDestination || audioContext.destination);
      nodes.set('bypass', { type: 'bypass', audioNode: source });
      return nodes;
    }
    
    // Create audio nodes based on graph nodes
    for (const node of nodeGraph.nodes) {
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
        
        // Store internal connections (direct connection without limiter)
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
      } else if (node.type === 'utility') {
        // Create utility node with volume and panning
        const inputGain = audioContext.createGain();
        const gainNode = audioContext.createGain();
        const pannerNode = audioContext.createStereoPanner();
        const splitter = audioContext.createChannelSplitter(2);
        const merger = audioContext.createChannelMerger(2);
        const rightPhaseGain = audioContext.createGain();
        
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
        
        // Set phase reversal for right channel
        const phaseReverse = node.params.reverse !== undefined ? node.params.reverse : false;
        rightPhaseGain.gain.value = phaseReverse ? -1 : 1;
        
        // Connect routing based on phase reversal
        if (phaseReverse) {
          // With phase reversal: input -> gain -> splitter -> merger (with right channel inverted) -> panner
          inputGain.connect(gainNode);
          gainNode.connect(splitter);
          
          // Left channel: direct connection
          splitter.connect(merger, 0, 0);
          
          // Right channel: phase inverted
          splitter.connect(rightPhaseGain, 1);
          rightPhaseGain.connect(merger, 0, 1);
          
          merger.connect(pannerNode);
        } else {
          // Without phase reversal: simple routing
          inputGain.connect(gainNode);
          gainNode.connect(pannerNode);
        }
        
        nodes.set(node.id, {
          type: 'utility',
          input: inputGain,
          output: pannerNode,
          inputGain,
          gainNode,
          pannerNode,
          splitter,
          merger,
          rightPhaseGain,
          params: node.params,
          audioContext
        });
        
        // Store internal connections
        if (phaseReverse) {
          connections.push({ from: gainNode, to: splitter });
          connections.push({ from: rightPhaseGain, to: merger });
          connections.push({ from: merger, to: pannerNode });
        } else {
          connections.push({ from: gainNode, to: pannerNode });
        }
      } else if (node.type === 'limiter') {
        // Create limiter effect chain
        const inputGain = audioContext.createGain();
        const compressor = audioContext.createDynamicsCompressor();
        
        // Set up limiter parameters
        const thresholdDb = node.params.threshold !== undefined ? node.params.threshold : -6;
        compressor.threshold.value = thresholdDb;
        compressor.knee.value = 0; // Hard knee for limiting
        compressor.ratio.value = 20; // High ratio for limiting effect
        compressor.attack.value = 0.003; // Fast attack
        compressor.release.value = 0.1; // Moderate release
        
        // Connect internal routing (direct connection, no wet/dry mix)
        inputGain.connect(compressor);
        
        nodes.set(node.id, {
          type: 'limiter',
          input: inputGain,
          output: compressor,
          inputGain,
          compressor,
          params: node.params,
          audioContext
        });
        
        // No internal connections needed for simple chain
      } else if (node.type === 'distortion') {
        // Create distortion effect chain
        const inputGain = audioContext.createGain();
        const dryGain = audioContext.createGain();
        const wetGain = audioContext.createGain();
        const waveShaper = audioContext.createWaveShaper();
        const merger = audioContext.createGain();
        
        // Set up distortion parameters
        const drive = node.params.drive !== undefined ? node.params.drive : 50;
        const amount = drive * 2.5; // Scale drive to a reasonable range (was 50, now 1/20th = 2.5)
        
        // Create distortion curve
        const samples = 44100;
        const curve = new Float32Array(samples);
        const deg = Math.PI / 180;
        
        for (let i = 0; i < samples; i++) {
          const x = (i * 2) / samples - 1;
          // Soft clipping curve with adjustable amount
          curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
        }
        
        waveShaper.curve = curve;
        waveShaper.oversample = '4x'; // Better quality
        
        // Set up wet/dry mix
        const wetAmount = (node.params.mix || 0) / 100;
        const dryAmount = 1 - wetAmount;
        dryGain.gain.value = dryAmount;
        wetGain.gain.value = wetAmount;
        
        // Connect internal routing
        inputGain.connect(dryGain);
        inputGain.connect(waveShaper);
        
        nodes.set(node.id, {
          type: 'distortion',
          input: inputGain,
          output: merger,
          inputGain,
          dryGain,
          wetGain,
          waveShaper,
          merger,
          params: node.params,
          audioContext
        });
        
        // Store internal connections
        connections.push({ from: waveShaper, to: wetGain });
        connections.push({ from: wetGain, to: merger });
        connections.push({ from: dryGain, to: merger });
      } else if (node.type === 'tonegenerator') {
        // Create tone generator (oscillator)
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        // Set waveform type
        const waveform = node.params.waveform || 'sine';
        oscillator.type = waveform;
        
        // Set frequency
        const frequency = node.params.frequency !== undefined ? node.params.frequency : 440;
        oscillator.frequency.value = frequency;
        
        // Set volume (convert from dB to linear)
        const volumeDb = node.params.volume !== undefined ? node.params.volume : -12;
        const volumeLinear = Math.pow(10, volumeDb / 20);
        gainNode.gain.value = volumeLinear;
        
        // Connect oscillator to gain
        oscillator.connect(gainNode);
        
        // Start the oscillator
        oscillator.start();
        
        nodes.set(node.id, {
          type: 'tonegenerator',
          input: null, // No input for tone generator
          output: gainNode,
          oscillator,
          gainNode,
          params: node.params,
          audioContext
        });
      } else if (node.type === 'equalizer') {
        // Create equalizer effect chain
        const inputGain = audioContext.createGain();
        const filter = audioContext.createBiquadFilter();
        
        // Set filter type
        const filterType = node.params.filterType || 'lowpass';
        filter.type = filterType;
        
        // Set frequency
        const frequency = node.params.frequency !== undefined ? node.params.frequency : 1000;
        filter.frequency.value = frequency;
        
        // Set Q factor
        const q = node.params.q !== undefined ? node.params.q : 1;
        filter.Q.value = q;
        
        // Connect routing (no wet/dry mix for EQ)
        inputGain.connect(filter);
        
        nodes.set(node.id, {
          type: 'equalizer',
          input: inputGain,
          output: filter,
          inputGain,
          filter,
          params: node.params,
          audioContext
        });
      } else if (node.type === 'phaser') {
        // Create phaser effect chain
        const inputGain = audioContext.createGain();
        const dryGain = audioContext.createGain();
        const wetGain = audioContext.createGain();
        const merger = audioContext.createGain();
        
        // Phaser components
        const lfo = audioContext.createOscillator();
        const lfoGain = audioContext.createGain();
        const allPassFilters = [];
        const numStages = 4; // 4-stage phaser
        
        // Create all-pass filter chain
        for (let i = 0; i < numStages; i++) {
          const filter = audioContext.createBiquadFilter();
          filter.type = 'allpass';
          filter.frequency.value = 1000 + i * 500; // Stagger frequencies
          allPassFilters.push(filter);
        }
        
        // Set up LFO
        const rate = node.params.rate !== undefined ? node.params.rate : 0.5;
        lfo.type = 'sine';
        lfo.frequency.value = rate;
        
        // Set up depth (LFO modulation amount)
        const depth = (node.params.depth || 50) / 100;
        lfoGain.gain.value = depth * 1000; // Modulate up to 1000Hz
        
        // Set up feedback
        const feedbackGain = audioContext.createGain();
        const feedbackAmount = (node.params.feedback || 0) / 100;
        feedbackGain.gain.value = feedbackAmount * 0.7; // Scale down feedback
        
        // Set up wet/dry mix
        const wetAmount = (node.params.mix || 0) / 100;
        const dryAmount = 1 - wetAmount;
        dryGain.gain.value = dryAmount;
        wetGain.gain.value = wetAmount;
        
        // Connect LFO to modulate filter frequencies
        lfo.connect(lfoGain);
        allPassFilters.forEach(filter => {
          lfoGain.connect(filter.frequency);
        });
        
        // Connect filter chain
        inputGain.connect(dryGain);
        inputGain.connect(allPassFilters[0]);
        
        for (let i = 0; i < numStages - 1; i++) {
          allPassFilters[i].connect(allPassFilters[i + 1]);
        }
        
        // Connect feedback loop
        allPassFilters[numStages - 1].connect(feedbackGain);
        feedbackGain.connect(allPassFilters[0]);
        
        // Connect to wet gain and merger
        allPassFilters[numStages - 1].connect(wetGain);
        
        // Start LFO
        lfo.start();
        
        nodes.set(node.id, {
          type: 'phaser',
          input: inputGain,
          output: merger,
          inputGain,
          dryGain,
          wetGain,
          merger,
          lfo,
          lfoGain,
          allPassFilters,
          feedbackGain,
          params: node.params,
          audioContext
        });
        
        // Store internal connections
        connections.push({ from: wetGain, to: merger });
        connections.push({ from: dryGain, to: merger });
      } else if (node.type === 'flanger') {
        // Create flanger effect chain
        const inputGain = audioContext.createGain();
        const dryGain = audioContext.createGain();
        const wetGain = audioContext.createGain();
        const delayNode = audioContext.createDelay(0.02); // Max 20ms delay for flanger
        const feedbackGain = audioContext.createGain();
        const merger = audioContext.createGain();
        
        // LFO for delay time modulation
        const lfo = audioContext.createOscillator();
        const lfoGain = audioContext.createGain();
        
        // Set up LFO
        const rate = node.params.rate !== undefined ? node.params.rate : 0.5;
        lfo.type = 'sine';
        lfo.frequency.value = rate;
        
        // Set up base delay time (in seconds)
        const baseDelay = (node.params.delay || 5) / 1000; // Convert ms to seconds
        delayNode.delayTime.value = baseDelay;
        
        // Set up depth (LFO modulation amount)
        const depth = (node.params.depth || 50) / 100;
        lfoGain.gain.value = depth * baseDelay * 0.5; // Modulate up to 50% of base delay
        
        // Connect LFO to modulate delay time
        lfo.connect(lfoGain);
        lfoGain.connect(delayNode.delayTime);
        
        // Set up feedback (can be negative for different character)
        const feedbackAmount = (node.params.feedback || 0) / 100;
        feedbackGain.gain.value = feedbackAmount * 0.8; // Scale down feedback
        
        // Set up wet/dry mix
        const wetAmount = (node.params.mix || 0) / 100;
        const dryAmount = 1 - wetAmount;
        dryGain.gain.value = dryAmount;
        wetGain.gain.value = wetAmount;
        
        // Connect routing
        inputGain.connect(dryGain);
        inputGain.connect(delayNode);
        
        // Connect feedback loop
        delayNode.connect(feedbackGain);
        feedbackGain.connect(delayNode);
        
        // Connect to wet gain
        delayNode.connect(wetGain);
        
        // Start LFO
        lfo.start();
        
        nodes.set(node.id, {
          type: 'flanger',
          input: inputGain,
          output: merger,
          inputGain,
          dryGain,
          wetGain,
          delayNode,
          feedbackGain,
          merger,
          lfo,
          lfoGain,
          params: node.params,
          audioContext
        });
        
        // Store internal connections
        connections.push({ from: wetGain, to: merger });
        connections.push({ from: dryGain, to: merger });
      } else if (node.type === 'spectralgate') {
        // Create spectral gate effect using AudioWorklet
        const inputGain = audioContext.createGain();
        const merger = audioContext.createGain();
        
        // Try to create AudioWorkletNode
        let spectralGateNode = null;
        
        
        // Check if AudioWorklet is supported
        if (audioContext.audioWorklet) {
          
          try {
            // Use the worklet URL passed from content script
            if (!spectralGateWorkletUrl) {
              throw new Error('No worklet URL available');
            }
            
            
            await audioContext.audioWorklet.addModule(spectralGateWorkletUrl);
            
            // Create the AudioWorkletNode
            spectralGateNode = new AudioWorkletNode(audioContext, 'spectral-gate-processor');
            
            // Set cutoff parameter (already in dB)
            const cutoffValue = node.params.cutoff !== undefined ? node.params.cutoff : -20;
            const cutoffParam = spectralGateNode.parameters.get('cutoff');
            
            if (cutoffParam) {
              cutoffParam.value = cutoffValue;
            } else {
            }
            
            // Connect routing
            inputGain.connect(spectralGateNode);
            spectralGateNode.connect(merger);
          } catch (e) {
            // Fallback: connect directly
            inputGain.connect(merger);
          }
        } else {
          inputGain.connect(merger);
        }
        
        nodes.set(node.id, {
          type: 'spectralgate',
          input: inputGain,
          output: merger,
          inputGain,
          merger,
          spectralGateNode,
          params: node.params,
          audioContext
        });
      } else if (node.type === 'spectralcompressor') {
        // Create spectral compressor effect using AudioWorklet
        const inputGain = audioContext.createGain();
        const merger = audioContext.createGain();
        
        // Try to create AudioWorkletNode
        let spectralCompressorNode = null;
        
        // Check if AudioWorklet is supported
        if (audioContext.audioWorklet) {
          try {
            // Use the worklet URL passed from content script
            if (!spectralCompressorWorkletUrl) {
              throw new Error('No compressor worklet URL available');
            }
            
            await audioContext.audioWorklet.addModule(spectralCompressorWorkletUrl);
            
            // Create the AudioWorkletNode
            spectralCompressorNode = new AudioWorkletNode(audioContext, 'spectral-compressor-processor');
            
            // Set parameters
            const attackValue = node.params.attack !== undefined ? node.params.attack : 30;
            const releaseValue = node.params.release !== undefined ? node.params.release : 200;
            const inputGainValue = node.params.inputGain !== undefined ? node.params.inputGain : 10;
            const thresholdValue = node.params.threshold !== undefined ? node.params.threshold : -45.1;
            const ratioValue = node.params.ratio !== undefined ? node.params.ratio : 1.2;
            
            const attackParam = spectralCompressorNode.parameters.get('attack');
            const releaseParam = spectralCompressorNode.parameters.get('release');
            const gainParam = spectralCompressorNode.parameters.get('inputGain');
            const thresholdParam = spectralCompressorNode.parameters.get('threshold');
            const ratioParam = spectralCompressorNode.parameters.get('ratio');
            
            if (attackParam) attackParam.value = attackValue;
            if (releaseParam) releaseParam.value = releaseValue;
            if (gainParam) gainParam.value = inputGainValue;
            if (thresholdParam) thresholdParam.value = thresholdValue;
            if (ratioParam) ratioParam.value = ratioValue;
            
            // Connect routing
            inputGain.connect(spectralCompressorNode);
            spectralCompressorNode.connect(merger);
          } catch (e) {
            console.error('Patchrome: Failed to create spectral compressor worklet:', e);
            // Fallback: connect directly
            inputGain.connect(merger);
          }
        } else {
          console.warn('Patchrome: AudioWorklet not supported, spectral compressor bypassed');
          inputGain.connect(merger);
        }
        
        nodes.set(node.id, {
          type: 'spectralcompressor',
          input: inputGain,
          output: merger,
          inputGain,
          merger,
          spectralCompressorNode,
          params: node.params,
          audioContext
        });
      } else if (node.type === 'bitcrusher') {
        // Create bitcrusher effect chain
        const inputGain = audioContext.createGain();
        const dryGain = audioContext.createGain();
        const wetGain = audioContext.createGain();
        const merger = audioContext.createGain();
        
        // Create script processor for bitcrushing effect
        const bufferSize = 4096;
        const scriptProcessor = audioContext.createScriptProcessor(bufferSize, 2, 2);
        
        // Get parameters
        const sampleRate = node.params.rate !== undefined ? node.params.rate : 30000;
        const bitDepth = node.params.bits !== undefined ? node.params.bits : 8;
        
        // Calculate step size for bit reduction
        const step = Math.pow(0.5, bitDepth);
        
        // Calculate sample reduction factor
        const sampleReduction = audioContext.sampleRate / sampleRate;
        
        // Bitcrusher processing
        let lastSampleL = 0;
        let lastSampleR = 0;
        let targetSampleL = 0;
        let targetSampleR = 0;
        let sampleCounter = 0;
        
        // Smoothing filter to reduce clicks
        const smoothingFactor = 0.999; // Adjust for more/less smoothing
        
        scriptProcessor.onaudioprocess = function(e) {
          const inputL = e.inputBuffer.getChannelData(0);
          const inputR = e.inputBuffer.getChannelData(1);
          const outputL = e.outputBuffer.getChannelData(0);
          const outputR = e.outputBuffer.getChannelData(1);
          
          for (let i = 0; i < bufferSize; i++) {
            // Sample rate reduction
            if (sampleCounter >= sampleReduction) {
              targetSampleL = inputL[i];
              targetSampleR = inputR[i];
              sampleCounter = 0;
            }
            
            // Apply smoothing to reduce clicks
            lastSampleL = lastSampleL * smoothingFactor + targetSampleL * (1 - smoothingFactor);
            lastSampleR = lastSampleR * smoothingFactor + targetSampleR * (1 - smoothingFactor);
            
            // Bit depth reduction
            outputL[i] = Math.round(lastSampleL / step) * step;
            outputR[i] = Math.round(lastSampleR / step) * step;
            
            sampleCounter++;
          }
        };
        
        // Set up wet/dry mix
        const wetAmount = (node.params.mix || 0) / 100;
        const dryAmount = 1 - wetAmount;
        dryGain.gain.value = dryAmount;
        wetGain.gain.value = wetAmount;
        
        // Connect internal routing
        inputGain.connect(dryGain);
        inputGain.connect(scriptProcessor);
        
        nodes.set(node.id, {
          type: 'bitcrusher',
          input: inputGain,
          output: merger,
          inputGain,
          dryGain,
          wetGain,
          scriptProcessor,
          merger,
          params: node.params,
          audioContext
        });
        
        // Store internal connections
        connections.push({ from: scriptProcessor, to: wetGain });
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
    }
    
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
          } else if (targetNode.type === 'utility') {
            // Connect to gain input
            sourceNode.audioNode.connect(targetNode.inputGain);
          } else if (targetNode.type === 'limiter') {
            // Connect to limiter input
            sourceNode.audioNode.connect(targetNode.inputGain);
          } else if (targetNode.type === 'distortion') {
            // Connect to distortion input
            sourceNode.audioNode.connect(targetNode.inputGain);
          } else if (targetNode.type === 'tonegenerator') {
            // Tone generator has no input, skip connection
          } else if (targetNode.type === 'equalizer') {
            // Connect to equalizer input
            sourceNode.audioNode.connect(targetNode.inputGain);
          } else if (targetNode.type === 'phaser') {
            // Connect to phaser input
            sourceNode.audioNode.connect(targetNode.inputGain);
          } else if (targetNode.type === 'flanger') {
            // Connect to flanger input
            sourceNode.audioNode.connect(targetNode.inputGain);
          } else if (targetNode.type === 'spectralgate') {
            // Connect to spectral gate input
            sourceNode.audioNode.connect(targetNode.inputGain);
          } else if (targetNode.type === 'spectralcompressor') {
            // Connect to spectral compressor input
            sourceNode.audioNode.connect(targetNode.inputGain);
          } else if (targetNode.type === 'bitcrusher') {
            // Connect to bitcrusher input
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
          } else if (targetNode.type === 'utility') {
            // Connect reverb output to gain input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'limiter') {
            // Connect reverb output to limiter input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'distortion') {
            // Connect reverb output to distortion input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'equalizer') {
            // Connect reverb output to equalizer input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'phaser') {
            // Connect reverb output to phaser input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'flanger') {
            // Connect reverb output to flanger input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'spectralgate') {
            // Connect reverb output to spectral gate input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'spectralcompressor') {
            // Connect reverb output to spectral compressor input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'bitcrusher') {
            // Connect reverb output to bitcrusher input
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
          } else if (targetNode.type === 'utility') {
            // Connect delay output to gain input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'limiter') {
            // Connect delay output to limiter input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'distortion') {
            // Connect delay output to distortion input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'equalizer') {
            // Connect delay output to equalizer input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'phaser') {
            // Connect delay output to phaser input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'flanger') {
            // Connect delay output to flanger input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'spectralgate') {
            // Connect delay output to spectral gate input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'spectralcompressor') {
            // Connect delay output to spectral compressor input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'bitcrusher') {
            // Connect delay output to bitcrusher input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'output') {
            sourceNode.output.connect(targetNode.audioNode);
          }
        } else if (sourceNode.type === 'utility') {
          if (targetNode.type === 'reverb') {
            // Connect utility output to reverb input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'delay') {
            // Connect utility output to delay input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'utility') {
            // Connect utility output to next utility input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'limiter') {
            // Connect utility output to limiter input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'distortion') {
            // Connect utility output to distortion input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'equalizer') {
            // Connect utility output to equalizer input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'phaser') {
            // Connect utility output to phaser input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'flanger') {
            // Connect utility output to flanger input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'spectralgate') {
            // Connect utility output to spectral gate input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'spectralcompressor') {
            // Connect utility output to spectral compressor input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'bitcrusher') {
            // Connect utility output to bitcrusher input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'output') {
            sourceNode.output.connect(targetNode.audioNode);
          }
        } else if (sourceNode.type === 'limiter') {
          if (targetNode.type === 'reverb') {
            // Connect limiter output to reverb input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'delay') {
            // Connect limiter output to delay input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'utility') {
            // Connect limiter output to gain input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'limiter') {
            // Connect limiter output to next limiter input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'distortion') {
            // Connect limiter output to distortion input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'equalizer') {
            // Connect limiter output to equalizer input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'phaser') {
            // Connect limiter output to phaser input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'flanger') {
            // Connect limiter output to flanger input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'spectralgate') {
            // Connect limiter output to spectral gate input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'spectralcompressor') {
            // Connect limiter output to spectral compressor input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'bitcrusher') {
            // Connect limiter output to bitcrusher input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'output') {
            sourceNode.output.connect(targetNode.audioNode);
          }
        } else if (sourceNode.type === 'distortion') {
          if (targetNode.type === 'reverb') {
            // Connect distortion output to reverb input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'delay') {
            // Connect distortion output to delay input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'utility') {
            // Connect distortion output to utility input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'limiter') {
            // Connect distortion output to limiter input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'distortion') {
            // Connect distortion output to next distortion input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'equalizer') {
            // Connect distortion output to equalizer input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'phaser') {
            // Connect distortion output to phaser input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'flanger') {
            // Connect distortion output to flanger input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'spectralgate') {
            // Connect distortion output to spectral gate input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'spectralcompressor') {
            // Connect distortion output to spectral compressor input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'bitcrusher') {
            // Connect distortion output to bitcrusher input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'output') {
            sourceNode.output.connect(targetNode.audioNode);
          }
        } else if (sourceNode.type === 'tonegenerator') {
          if (targetNode.type === 'reverb') {
            // Connect tone generator output to reverb input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'delay') {
            // Connect tone generator output to delay input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'utility') {
            // Connect tone generator output to utility input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'limiter') {
            // Connect tone generator output to limiter input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'distortion') {
            // Connect tone generator output to distortion input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'equalizer') {
            // Connect tone generator output to equalizer input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'phaser') {
            // Connect tone generator output to phaser input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'flanger') {
            // Connect tone generator output to flanger input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'spectralgate') {
            // Connect tonegenerator output to spectral gate input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'spectralcompressor') {
            // Connect tonegenerator output to spectral compressor input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'bitcrusher') {
            // Connect tonegenerator output to bitcrusher input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'output') {
            sourceNode.output.connect(targetNode.audioNode);
          }
        } else if (sourceNode.type === 'equalizer') {
          if (targetNode.type === 'reverb') {
            // Connect equalizer output to reverb input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'delay') {
            // Connect equalizer output to delay input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'utility') {
            // Connect equalizer output to utility input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'limiter') {
            // Connect equalizer output to limiter input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'distortion') {
            // Connect equalizer output to distortion input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'equalizer') {
            // Connect equalizer output to next equalizer input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'phaser') {
            // Connect equalizer output to phaser input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'flanger') {
            // Connect equalizer output to flanger input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'spectralgate') {
            // Connect equalizer output to spectral gate input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'spectralcompressor') {
            // Connect equalizer output to spectral compressor input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'bitcrusher') {
            // Connect equalizer output to bitcrusher input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'output') {
            sourceNode.output.connect(targetNode.audioNode);
          }
        } else if (sourceNode.type === 'phaser') {
          if (targetNode.type === 'reverb') {
            // Connect phaser output to reverb input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'delay') {
            // Connect phaser output to delay input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'utility') {
            // Connect phaser output to utility input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'limiter') {
            // Connect phaser output to limiter input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'distortion') {
            // Connect phaser output to distortion input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'equalizer') {
            // Connect phaser output to equalizer input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'phaser') {
            // Connect phaser output to next phaser input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'flanger') {
            // Connect phaser output to flanger input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'spectralgate') {
            // Connect phaser output to spectral gate input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'spectralcompressor') {
            // Connect phaser output to spectral compressor input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'bitcrusher') {
            // Connect phaser output to bitcrusher input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'output') {
            sourceNode.output.connect(targetNode.audioNode);
          }
        } else if (sourceNode.type === 'flanger') {
          if (targetNode.type === 'reverb') {
            // Connect flanger output to reverb input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'delay') {
            // Connect flanger output to delay input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'utility') {
            // Connect flanger output to utility input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'limiter') {
            // Connect flanger output to limiter input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'distortion') {
            // Connect flanger output to distortion input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'equalizer') {
            // Connect flanger output to equalizer input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'phaser') {
            // Connect flanger output to phaser input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'flanger') {
            // Connect flanger output to next flanger input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'spectralgate') {
            // Connect flanger output to spectral gate input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'spectralcompressor') {
            // Connect flanger output to spectral compressor input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'bitcrusher') {
            // Connect flanger output to bitcrusher input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'output') {
            sourceNode.output.connect(targetNode.audioNode);
          }
        } else if (sourceNode.type === 'spectralgate') {
          if (targetNode.type === 'reverb') {
            // Connect spectral gate output to reverb input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'delay') {
            // Connect spectral gate output to delay input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'utility') {
            // Connect spectral gate output to utility input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'limiter') {
            // Connect spectral gate output to limiter input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'distortion') {
            // Connect spectral gate output to distortion input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'equalizer') {
            // Connect spectral gate output to equalizer input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'phaser') {
            // Connect spectral gate output to phaser input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'flanger') {
            // Connect spectral gate output to flanger input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'spectralgate') {
            // Connect spectral gate output to next spectral gate input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'spectralcompressor') {
            // Connect spectral gate output to spectral compressor input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'bitcrusher') {
            // Connect spectral gate output to bitcrusher input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'output') {
            sourceNode.output.connect(targetNode.audioNode);
          }
        } else if (sourceNode.type === 'spectralcompressor') {
          if (targetNode.type === 'reverb') {
            // Connect spectral compressor output to reverb input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'delay') {
            // Connect spectral compressor output to delay input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'utility') {
            // Connect spectral compressor output to utility input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'limiter') {
            // Connect spectral compressor output to limiter input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'distortion') {
            // Connect spectral compressor output to distortion input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'equalizer') {
            // Connect spectral compressor output to equalizer input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'phaser') {
            // Connect spectral compressor output to phaser input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'flanger') {
            // Connect spectral compressor output to flanger input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'spectralgate') {
            // Connect spectral compressor output to spectral gate input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'spectralcompressor') {
            // Connect spectral compressor output to next spectral compressor input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'bitcrusher') {
            // Connect spectral compressor output to bitcrusher input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'output') {
            sourceNode.output.connect(targetNode.audioNode);
          }
        } else if (sourceNode.type === 'bitcrusher') {
          if (targetNode.type === 'reverb') {
            // Connect bitcrusher output to reverb input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'delay') {
            // Connect bitcrusher output to delay input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'utility') {
            // Connect bitcrusher output to utility input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'limiter') {
            // Connect bitcrusher output to limiter input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'distortion') {
            // Connect bitcrusher output to distortion input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'equalizer') {
            // Connect bitcrusher output to equalizer input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'phaser') {
            // Connect bitcrusher output to phaser input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'flanger') {
            // Connect bitcrusher output to flanger input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'spectralgate') {
            // Connect bitcrusher output to spectral gate input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'spectralcompressor') {
            // Connect bitcrusher output to spectral compressor input
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'bitcrusher') {
            // Connect bitcrusher output to next bitcrusher input
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
      if ((node.type === 'reverb' || node.type === 'delay' || node.type === 'phaser' || node.type === 'flanger' || node.type === 'bitcrusher') && node.wetGain && node.dryGain) {
        node.wetGain.gain.value = 0;
        node.dryGain.gain.value = 1;
      }
    });
    
    // Then update only the nodes that exist in the current graph
    graph.forEach((node, nodeId) => {
      const graphNode = settings.audioGraph.nodes.find(n => n.id === nodeId);
      if (!graphNode) {
        // This node doesn't exist in the graph anymore, ensure it's muted
        if ((node.type === 'reverb' || node.type === 'delay' || node.type === 'phaser' || node.type === 'flanger' || node.type === 'bitcrusher') && node.wetGain) {
          node.wetGain.gain.value = 0;
          node.dryGain.gain.value = 1;
        }
        return;
      }
      
      if (node.type === 'reverb' && node.wetGain && node.dryGain) {
        const wetAmount = (graphNode.params.mix || 0) / 100;
        const dryAmount = 1 - wetAmount;
        
        // Set values immediately
        node.wetGain.gain.value = wetAmount;
        node.dryGain.gain.value = dryAmount;
        
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
        
      } else if (node.type === 'delay' && node.wetGain && node.dryGain) {
        const wetAmount = (graphNode.params.mix || 0) / 100;
        const dryAmount = 1 - wetAmount;
        
        // Set values immediately
        node.wetGain.gain.value = wetAmount;
        node.dryGain.gain.value = dryAmount;
        
        // Update delay time (convert from ms to seconds)
        const delayTime = graphNode.params.delayTime !== undefined ? graphNode.params.delayTime / 1000 : 0.5;
        node.delayNode.delayTime.value = delayTime;
        
        // Update feedback
        const feedbackAmount = (graphNode.params.feedback || 0) / 100;
        node.feedbackGain.gain.value = feedbackAmount;
        
        // Always update the stored parameters
        node.params = { ...graphNode.params };
        
      } else if (node.type === 'utility' && node.gainNode && node.pannerNode) {
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
        
        // Set values immediately
        node.gainNode.gain.value = gainValue;
        node.pannerNode.pan.value = panValue;
        
        // Handle phase reversal update
        const newPhaseReverse = graphNode.params.reverse !== undefined ? graphNode.params.reverse : false;
        const oldPhaseReverse = node.params.reverse !== undefined ? node.params.reverse : false;
        
        if (newPhaseReverse !== oldPhaseReverse && node.rightPhaseGain) {
          // Update phase inversion
          node.rightPhaseGain.gain.value = newPhaseReverse ? -1 : 1;
          
          // Reconnect nodes based on new phase reversal state
          try {
            // Disconnect existing connections
            node.gainNode.disconnect();
            if (node.splitter) node.splitter.disconnect();
            if (node.merger) node.merger.disconnect();
            if (node.rightPhaseGain) node.rightPhaseGain.disconnect();
            
            if (newPhaseReverse) {
              // With phase reversal
              node.gainNode.connect(node.splitter);
              node.splitter.connect(node.merger, 0, 0);
              node.splitter.connect(node.rightPhaseGain, 1);
              node.rightPhaseGain.connect(node.merger, 0, 1);
              node.merger.connect(node.pannerNode);
            } else {
              // Without phase reversal
              node.gainNode.connect(node.pannerNode);
            }
          } catch (e) {
          }
        }
        
        // Always update the stored parameters
        node.params = { ...graphNode.params };
        
      } else if (node.type === 'limiter' && node.compressor) {
        // Update threshold
        const thresholdDb = graphNode.params.threshold !== undefined ? graphNode.params.threshold : -6;
        node.compressor.threshold.value = thresholdDb;
        
        // Always update the stored parameters
        node.params = { ...graphNode.params };
        
      } else if (node.type === 'distortion' && node.wetGain && node.dryGain) {
        const wetAmount = (graphNode.params.mix || 0) / 100;
        const dryAmount = 1 - wetAmount;
        
        // Set values immediately
        node.wetGain.gain.value = wetAmount;
        node.dryGain.gain.value = dryAmount;
        
        // Update drive by regenerating the curve
        const drive = graphNode.params.drive !== undefined ? graphNode.params.drive : 50;
        const amount = drive * 2.5; // Scale drive to a reasonable range (was 50, now 1/20th = 2.5)
        
        // Create new distortion curve
        const samples = 44100;
        const curve = new Float32Array(samples);
        const deg = Math.PI / 180;
        
        for (let i = 0; i < samples; i++) {
          const x = (i * 2) / samples - 1;
          // Soft clipping curve with adjustable amount
          curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
        }
        
        node.waveShaper.curve = curve;
        
        // Always update the stored parameters
        node.params = { ...graphNode.params };
        
      } else if (node.type === 'tonegenerator' && node.oscillator && node.gainNode) {
        // Update waveform
        const newWaveform = graphNode.params.waveform || 'sine';
        const oldWaveform = node.params.waveform || 'sine';
        if (newWaveform !== oldWaveform) {
          node.oscillator.type = newWaveform;
        }
        
        // Update frequency
        const frequency = graphNode.params.frequency !== undefined ? graphNode.params.frequency : 440;
        node.oscillator.frequency.value = frequency;
        
        // Update volume
        const volumeDb = graphNode.params.volume !== undefined ? graphNode.params.volume : -12;
        const volumeLinear = Math.pow(10, volumeDb / 20);
        node.gainNode.gain.value = volumeLinear;
        
        // Always update the stored parameters
        node.params = { ...graphNode.params };
        
      } else if (node.type === 'equalizer' && node.filter) {
        // Update filter type
        const newFilterType = graphNode.params.filterType || 'lowpass';
        const oldFilterType = node.params.filterType || 'lowpass';
        if (newFilterType !== oldFilterType) {
          node.filter.type = newFilterType;
        }
        
        // Update frequency
        const frequency = graphNode.params.frequency !== undefined ? graphNode.params.frequency : 1000;
        node.filter.frequency.value = frequency;
        
        // Update Q factor
        const q = graphNode.params.q !== undefined ? graphNode.params.q : 1;
        node.filter.Q.value = q;
        
        // Always update the stored parameters
        node.params = { ...graphNode.params };
        
      } else if (node.type === 'phaser' && node.wetGain && node.dryGain) {
        const wetAmount = (graphNode.params.mix || 0) / 100;
        const dryAmount = 1 - wetAmount;
        
        // Use setValueAtTime for immediate parameter changes
        const currentTime = audioContexts.get(element)?.currentTime || 0;
        node.wetGain.gain.setValueAtTime(wetAmount, currentTime);
        node.dryGain.gain.setValueAtTime(dryAmount, currentTime);
        
        // Update LFO rate
        const rate = graphNode.params.rate !== undefined ? graphNode.params.rate : 0.5;
        node.lfo.frequency.setValueAtTime(rate, currentTime);
        
        // Update depth (LFO modulation amount)
        const depth = (graphNode.params.depth || 50) / 100;
        node.lfoGain.gain.setValueAtTime(depth * 1000, currentTime);
        
        // Update feedback
        const feedbackAmount = (graphNode.params.feedback || 0) / 100;
        node.feedbackGain.gain.setValueAtTime(feedbackAmount * 0.7, currentTime);
        
        // Always update the stored parameters
        node.params = { ...graphNode.params };
        
      } else if (node.type === 'flanger' && node.wetGain && node.dryGain) {
        const wetAmount = (graphNode.params.mix || 0) / 100;
        const dryAmount = 1 - wetAmount;
        
        // Use setValueAtTime for immediate parameter changes
        const currentTime = audioContexts.get(element)?.currentTime || 0;
        node.wetGain.gain.setValueAtTime(wetAmount, currentTime);
        node.dryGain.gain.setValueAtTime(dryAmount, currentTime);
        
        // Update LFO rate
        const rate = graphNode.params.rate !== undefined ? graphNode.params.rate : 0.5;
        node.lfo.frequency.setValueAtTime(rate, currentTime);
        
        // Update base delay time
        const baseDelay = (graphNode.params.delay || 5) / 1000;
        node.delayNode.delayTime.setValueAtTime(baseDelay, currentTime);
        
        // Update depth (LFO modulation amount)
        const depth = (graphNode.params.depth || 50) / 100;
        node.lfoGain.gain.setValueAtTime(depth * baseDelay * 0.5, currentTime);
        
        // Update feedback
        const feedbackAmount = (graphNode.params.feedback || 0) / 100;
        node.feedbackGain.gain.setValueAtTime(feedbackAmount * 0.8, currentTime);
        
        // Always update the stored parameters
        node.params = { ...graphNode.params };
        
      } else if (node.type === 'spectralgate') {
        
        if (node.spectralGateNode) {
          // Update cutoff parameter
          const cutoffValue = graphNode.params.cutoff !== undefined ? graphNode.params.cutoff : -20;
          
          // Use setValueAtTime for immediate parameter changes
          const currentTime = audioContexts.get(element)?.currentTime || 0;
          const cutoffParam = node.spectralGateNode.parameters.get('cutoff');
          
          if (cutoffParam) {
            cutoffParam.setValueAtTime(cutoffValue, currentTime);
          } else {
          }
        } else {
        }
        
        // Always update the stored parameters
        node.params = { ...graphNode.params };
      } else if (node.type === 'spectralcompressor') {
        
        if (node.spectralCompressorNode) {
          // Update parameters
          const attackValue = graphNode.params.attack !== undefined ? graphNode.params.attack : 30;
          const releaseValue = graphNode.params.release !== undefined ? graphNode.params.release : 200;
          const inputGainValue = graphNode.params.inputGain !== undefined ? graphNode.params.inputGain : 10;
          const thresholdValue = graphNode.params.threshold !== undefined ? graphNode.params.threshold : -45.1;
          const ratioValue = graphNode.params.ratio !== undefined ? graphNode.params.ratio : 1.2;
          
          // Use setValueAtTime for immediate parameter changes
          const currentTime = audioContexts.get(element)?.currentTime || 0;
          const attackParam = node.spectralCompressorNode.parameters.get('attack');
          const releaseParam = node.spectralCompressorNode.parameters.get('release');
          const gainParam = node.spectralCompressorNode.parameters.get('inputGain');
          const thresholdParam = node.spectralCompressorNode.parameters.get('threshold');
          const ratioParam = node.spectralCompressorNode.parameters.get('ratio');
          
          if (attackParam) {
            attackParam.setValueAtTime(attackValue, currentTime);
          }
          if (releaseParam) {
            releaseParam.setValueAtTime(releaseValue, currentTime);
          }
          if (gainParam) {
            gainParam.setValueAtTime(inputGainValue, currentTime);
          }
          if (thresholdParam) {
            thresholdParam.setValueAtTime(thresholdValue, currentTime);
          }
          if (ratioParam) {
            ratioParam.setValueAtTime(ratioValue, currentTime);
          }
          
          console.log(`Patchrome: Updated spectralcompressor ${nodeId} - threshold: ${thresholdValue}dB, ratio: ${ratioValue}:1, attack: ${attackValue}ms, release: ${releaseValue}ms, inputGain: ${inputGainValue}dB`);
        }
        
        // Always update the stored parameters
        node.params = { ...graphNode.params };
      } else if (node.type === 'bitcrusher' && node.wetGain && node.dryGain) {
        const wetAmount = (graphNode.params.mix || 0) / 100;
        const dryAmount = 1 - wetAmount;
        
        // Use setValueAtTime for immediate parameter changes
        const currentTime = audioContexts.get(element)?.currentTime || 0;
        node.wetGain.gain.setValueAtTime(wetAmount, currentTime);
        node.dryGain.gain.setValueAtTime(dryAmount, currentTime);
        
        // Update bitcrusher parameters
        const newRate = graphNode.params.rate !== undefined ? graphNode.params.rate : 30000;
        const newBits = graphNode.params.bits !== undefined ? graphNode.params.bits : 8;
        
        // We need to update the script processor's internal variables
        // Since ScriptProcessorNode doesn't have exposed parameters, we'll update via the node object
        if (node.scriptProcessor && node.scriptProcessor.onaudioprocess) {
          // Recalculate step size for bit reduction
          const step = Math.pow(0.5, newBits);
          // Recalculate sample reduction factor
          const sampleReduction = node.audioContext.sampleRate / newRate;
          
          // Update the processor function with new parameters
          let lastSampleL = 0;
          let lastSampleR = 0;
          let sampleCounter = 0;
          
          node.scriptProcessor.onaudioprocess = function(e) {
            const inputL = e.inputBuffer.getChannelData(0);
            const inputR = e.inputBuffer.getChannelData(1);
            const outputL = e.outputBuffer.getChannelData(0);
            const outputR = e.outputBuffer.getChannelData(1);
            
            for (let i = 0; i < e.inputBuffer.length; i++) {
              // Sample rate reduction
              if (sampleCounter >= sampleReduction) {
                lastSampleL = inputL[i];
                lastSampleR = inputR[i];
                sampleCounter = 0;
              }
              
              // Bit depth reduction
              outputL[i] = Math.round(lastSampleL / step) * step;
              outputR[i] = Math.round(lastSampleR / step) * step;
              
              sampleCounter++;
            }
          };
        }
        
        // Always update the stored parameters
        node.params = { ...graphNode.params };
        
        console.log(`Patchrome: Updated bitcrusher ${nodeId} - mix: ${wetAmount * 100}%, rate: ${newRate}Hz, bits: ${newBits}`);
      }
    });
  }
  
  // Get current speed from settings
  function getCurrentSpeed() {
    const inputNode = settings.audioGraph.nodes.find(n => n.type === 'input');
    return inputNode?.params.speed || 1.0;
  }
  
  // Disconnect all nodes in the graph
  function disconnectAudioGraph(element) {
    const graph = audioGraphs.get(element);
    if (!graph) return;
    
    graph.forEach(node => {
      // Handle bypass mode
      if (node.type === 'bypass' && node.audioNode) {
        try { node.audioNode.disconnect(); } catch(e) {}
        return;
      }
      
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
      if (node.splitter) {
        try { node.splitter.disconnect(); } catch(e) {}
      }
      if (node.rightPhaseGain) {
        try { node.rightPhaseGain.disconnect(); } catch(e) {}
      }
      if (node.compressor) {
        try { node.compressor.disconnect(); } catch(e) {}
      }
      if (node.waveShaper) {
        try { node.waveShaper.disconnect(); } catch(e) {}
      }
      if (node.oscillator) {
        try { 
          node.oscillator.disconnect(); 
          node.oscillator.stop();
        } catch(e) {}
      }
      if (node.filter) {
        try { node.filter.disconnect(); } catch(e) {}
      }
      if (node.lfo) {
        try { 
          node.lfo.disconnect(); 
          node.lfo.stop();
        } catch(e) {}
      }
      if (node.lfoGain) {
        try { node.lfoGain.disconnect(); } catch(e) {}
      }
      if (node.allPassFilters) {
        node.allPassFilters.forEach(filter => {
          try { filter.disconnect(); } catch(e) {}
        });
      }
      if (node.spectralGateNode) {
        try { node.spectralGateNode.disconnect(); } catch(e) {}
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
  async function setupAudioProcessing(element, forceRebuild = false) {
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
        const audioNodes = await buildAudioGraph(audioContext, source, settings.audioGraph);
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
      const audioNodes = await buildAudioGraph(audioContext, source, settings.audioGraph);
      
      // Store references
      audioContexts.set(element, audioContext);
      audioGraphs.set(element, audioNodes);
      
    } catch (e) {
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
          // If disabled, use the original value
          if (!settings.enabled) {
            if (isFinite(value) && value > 0) {
              originalDescriptor.set.call(this, value);
            }
            return;
          }
          
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
    
    if (settings.enabled) {
      const currentSpeed = getCurrentSpeed();
      if (isFinite(currentSpeed) && currentSpeed > 0) {
        // Set playback rate with validation
        element.playbackRate = currentSpeed;
        
        // Apply pitch settings
        applyPitchSettings(element);
      }
    } else {
      // Reset to normal playback when disabled
      element.playbackRate = 1.0;
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
      
      // Save the worklet URLs if provided
      if (event.data.workletUrl) {
        spectralGateWorkletUrl = event.data.workletUrl;
      }
      if (event.data.compressorWorkletUrl) {
        spectralCompressorWorkletUrl = event.data.compressorWorkletUrl;
      }
      
      const newSettings = event.data.settings;
      let needsRebuild = false;
      
      // Validate settings before applying
      if (newSettings) {
        // Check if enabled state changed
        const oldEnabled = settings.enabled;
        const newEnabled = newSettings.enabled !== false;
        
        if (oldEnabled !== newEnabled) {
          needsRebuild = true;
        }
        
        if (newSettings.audioGraph) {
          // Check if edges or nodes have changed
          const oldEdges = JSON.stringify(settings.audioGraph.edges);
          const newEdges = JSON.stringify(newSettings.audioGraph.edges);
          const oldNodes = JSON.stringify(settings.audioGraph.nodes.map(n => ({ id: n.id, type: n.type })));
          const newNodes = JSON.stringify(newSettings.audioGraph.nodes.map(n => ({ id: n.id, type: n.type })));
          
          if (oldEdges !== newEdges || oldNodes !== newNodes) {
            needsRebuild = true;
          }
          
          // Always update the settings
          settings.audioGraph = newSettings.audioGraph;
        }
        settings.enabled = newEnabled;
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
          connect: async function(destination) {
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
            const audioNodes = await buildAudioGraph(ctx, source, settings.audioGraph, destination);
            audioGraphs.set(mediaElement, audioNodes);
            
            // Ensure pitch settings are applied
            applyPitchSettings(mediaElement);
            
            // Monitor changes
            const checkPitch = () => {
              if (settings.enabled) {
                const currentSpeed = getCurrentSpeed();
                if (mediaElement.playbackRate !== currentSpeed) {
                  mediaElement.playbackRate = currentSpeed;
                }
                applyPitchSettings(mediaElement);
                updateAudioGraphParams(mediaElement);
              } else {
                // Reset to normal playback when disabled
                if (mediaElement.playbackRate !== 1.0) {
                  mediaElement.playbackRate = 1.0;
                }
              }
              
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