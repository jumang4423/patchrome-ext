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
  let spectralGateWorkletUrl = null;
  let spectralCompressorWorkletUrl = null;
  let spectralPitchWorkletUrl = null;
  const processedElements = new WeakSet();
  const audioContexts = new WeakMap();
  const audioGraphs = new WeakMap();
  function createReverbImpulse(audioContext, size = 50, decay = 1000) {
    const duration = 0.1 + (size / 100) * 1.9;
    const decayRate = Math.max(1.0, 10.0 - (decay / 1000) * 4.0);
    const length = audioContext.sampleRate * duration;
    const impulse = audioContext.createBuffer(2, length, audioContext.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      const sizeMultiplier = 0.5 + (size / 100) * 0.5;
      const earlyReflections = [
        { time: 0.015 * sizeMultiplier, gain: 0.25 },  
        { time: 0.025 * sizeMultiplier, gain: 0.15 },  
        { time: 0.035 * sizeMultiplier, gain: 0.1 },   
        { time: 0.045 * sizeMultiplier, gain: 0.075 }  
      ];
      for (let i = 0; i < length; i++) {
        const t = i / audioContext.sampleRate;
        let sample = 0;
        for (const reflection of earlyReflections) {
          const reflectionSample = Math.floor(reflection.time * audioContext.sampleRate);
          if (i === reflectionSample) {
            sample += (Math.random() * 2 - 1) * reflection.gain;
          }
        }
        sample += (Math.random() * 2 - 1) * Math.pow(1 - i / length, decayRate) * 0.25;
        if (channel === 1) {
          sample *= 0.9 + Math.random() * 0.2;
        }
        channelData[i] = sample;
      }
    }
    return impulse;
  }
  async function buildAudioGraph(audioContext, source, nodeGraph, customDestination) {
    const nodes = new Map();
    const connections = [];
    if (!settings.enabled) {
      source.connect(customDestination || audioContext.destination);
      nodes.set('bypass', { type: 'bypass', audioNode: source });
      return nodes;
    }
    for (const node of nodeGraph.nodes) {
      if (node.type === 'input') {
        nodes.set(node.id, {
          type: 'input',
          audioNode: source,
          params: node.params
        });
      } else if (node.type === 'reverb') {
        const inputGain = audioContext.createGain(); 
        const dryGain = audioContext.createGain();
        const wetGain = audioContext.createGain();
        const convolver = audioContext.createConvolver();
        const merger = audioContext.createGain();
        const size = node.params.size !== undefined ? node.params.size : 50;
        const decay = node.params.decay !== undefined ? node.params.decay : 1000;
        convolver.buffer = createReverbImpulse(audioContext, size, decay);
        const wetAmount = (node.params.mix || 0) / 100;
        const dryAmount = 1 - wetAmount;
        dryGain.gain.value = dryAmount;
        wetGain.gain.value = wetAmount;
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
        connections.push({ from: convolver, to: wetGain });
        connections.push({ from: wetGain, to: merger });
        connections.push({ from: dryGain, to: merger });
      } else if (node.type === 'delay') {
        const inputGain = audioContext.createGain();
        const dryGain = audioContext.createGain();
        const wetGain = audioContext.createGain();
        const delayNode = audioContext.createDelay(2); 
        const feedbackGain = audioContext.createGain();
        const merger = audioContext.createGain();
        const delayTime = node.params.delayTime !== undefined ? node.params.delayTime / 1000 : 0.5;
        delayNode.delayTime.value = delayTime;
        const feedbackAmount = (node.params.feedback || 0) / 100;
        feedbackGain.gain.value = feedbackAmount;
        const wetAmount = (node.params.mix || 0) / 100;
        const dryAmount = 1 - wetAmount;
        dryGain.gain.value = dryAmount;
        wetGain.gain.value = wetAmount;
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
        connections.push({ from: delayNode, to: feedbackGain });
        connections.push({ from: feedbackGain, to: delayNode }); 
        connections.push({ from: delayNode, to: wetGain });
        connections.push({ from: wetGain, to: merger });
        connections.push({ from: dryGain, to: merger });
      } else if (node.type === 'utility') {
        const inputGain = audioContext.createGain();
        const gainNode = audioContext.createGain();
        const pannerNode = audioContext.createStereoPanner();
        const splitter = audioContext.createChannelSplitter(2);
        const merger = audioContext.createChannelMerger(2);
        const leftPhaseGain = audioContext.createGain();
        const rightPhaseGain = audioContext.createGain();
        const volumeDb = node.params.volume !== undefined ? node.params.volume : 0;
        let gainValue;
        if (volumeDb <= -60) {
          gainValue = 0; 
        } else {
          gainValue = Math.pow(10, volumeDb / 20);
        }
        gainNode.gain.value = gainValue;
        const panValue = node.params.pan !== undefined ? node.params.pan / 100 : 0;
        pannerNode.pan.value = panValue;
        const phaseReverseL = node.params.reverseL !== undefined ? node.params.reverseL : false;
        const phaseReverseR = node.params.reverseR !== undefined ? node.params.reverseR : false;
        leftPhaseGain.gain.value = phaseReverseL ? -1 : 1;
        rightPhaseGain.gain.value = phaseReverseR ? -1 : 1;
        if (phaseReverseL || phaseReverseR) {
          inputGain.connect(gainNode);
          gainNode.connect(splitter);
          splitter.connect(leftPhaseGain, 0);
          leftPhaseGain.connect(merger, 0, 0);
          splitter.connect(rightPhaseGain, 1);
          rightPhaseGain.connect(merger, 0, 1);
          merger.connect(pannerNode);
        } else {
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
          leftPhaseGain,
          rightPhaseGain,
          params: node.params,
          audioContext
        });
        if (phaseReverseL || phaseReverseR) {
          connections.push({ from: gainNode, to: splitter });
          connections.push({ from: leftPhaseGain, to: merger });
          connections.push({ from: rightPhaseGain, to: merger });
          connections.push({ from: merger, to: pannerNode });
        } else {
          connections.push({ from: gainNode, to: pannerNode });
        }
      } else if (node.type === 'limiter') {
        const inputGain = audioContext.createGain();
        const compressor = audioContext.createDynamicsCompressor();
        const thresholdDb = node.params.threshold !== undefined ? node.params.threshold : -6;
        compressor.threshold.value = thresholdDb;
        compressor.knee.value = 0; 
        compressor.ratio.value = 20; 
        compressor.attack.value = 0.003; 
        compressor.release.value = 0.1; 
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
      } else if (node.type === 'distortion') {
        const inputGain = audioContext.createGain();
        const dryGain = audioContext.createGain();
        const wetGain = audioContext.createGain();
        const waveShaper = audioContext.createWaveShaper();
        const merger = audioContext.createGain();
        const drive = node.params.drive !== undefined ? node.params.drive : 50;
        const amount = drive * 2.5; 
        const samples = 44100;
        const curve = new Float32Array(samples);
        const deg = Math.PI / 180;
        for (let i = 0; i < samples; i++) {
          const x = (i * 2) / samples - 1;
          curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
        }
        waveShaper.curve = curve;
        waveShaper.oversample = '4x'; 
        const wetAmount = (node.params.mix || 0) / 100;
        const dryAmount = 1 - wetAmount;
        dryGain.gain.value = dryAmount;
        wetGain.gain.value = wetAmount;
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
        connections.push({ from: waveShaper, to: wetGain });
        connections.push({ from: wetGain, to: merger });
        connections.push({ from: dryGain, to: merger });
      } else if (node.type === 'tonegenerator') {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        const waveform = node.params.waveform || 'sine';
        oscillator.type = waveform;
        const frequency = node.params.frequency !== undefined ? node.params.frequency : 440;
        oscillator.frequency.value = frequency;
        const volumeDb = node.params.volume !== undefined ? node.params.volume : -12;
        const volumeLinear = Math.pow(10, volumeDb / 20);
        gainNode.gain.value = volumeLinear;
        oscillator.connect(gainNode);
        oscillator.start();
        nodes.set(node.id, {
          type: 'tonegenerator',
          input: null, 
          output: gainNode,
          oscillator,
          gainNode,
          params: node.params,
          audioContext
        });
      } else if (node.type === 'equalizer') {
        const inputGain = audioContext.createGain();
        const filter = audioContext.createBiquadFilter();
        const filterType = node.params.filterType || 'lowpass';
        filter.type = filterType;
        const frequency = node.params.frequency !== undefined ? node.params.frequency : 1000;
        filter.frequency.value = frequency;
        const q = node.params.q !== undefined ? node.params.q : 1;
        filter.Q.value = q;
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
        const inputGain = audioContext.createGain();
        const dryGain = audioContext.createGain();
        const wetGain = audioContext.createGain();
        const merger = audioContext.createGain();
        const lfo = audioContext.createOscillator();
        const lfoGain = audioContext.createGain();
        const allPassFilters = [];
        const numStages = 4; 
        for (let i = 0; i < numStages; i++) {
          const filter = audioContext.createBiquadFilter();
          filter.type = 'allpass';
          filter.frequency.value = 1000 + i * 500; 
          allPassFilters.push(filter);
        }
        const rate = node.params.rate !== undefined ? node.params.rate : 0.5;
        lfo.type = 'sine';
        lfo.frequency.value = rate;
        const depth = (node.params.depth || 50) / 100;
        lfoGain.gain.value = depth * 1000; 
        const feedbackGain = audioContext.createGain();
        const feedbackAmount = (node.params.feedback || 0) / 100;
        feedbackGain.gain.value = feedbackAmount * 0.7; 
        const wetAmount = (node.params.mix || 0) / 100;
        const dryAmount = 1 - wetAmount;
        dryGain.gain.value = dryAmount;
        wetGain.gain.value = wetAmount;
        lfo.connect(lfoGain);
        allPassFilters.forEach(filter => {
          lfoGain.connect(filter.frequency);
        });
        inputGain.connect(dryGain);
        inputGain.connect(allPassFilters[0]);
        for (let i = 0; i < numStages - 1; i++) {
          allPassFilters[i].connect(allPassFilters[i + 1]);
        }
        allPassFilters[numStages - 1].connect(feedbackGain);
        feedbackGain.connect(allPassFilters[0]);
        allPassFilters[numStages - 1].connect(wetGain);
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
        connections.push({ from: wetGain, to: merger });
        connections.push({ from: dryGain, to: merger });
      } else if (node.type === 'flanger') {
        const inputGain = audioContext.createGain();
        const dryGain = audioContext.createGain();
        const wetGain = audioContext.createGain();
        const delayNode = audioContext.createDelay(0.02); 
        const feedbackGain = audioContext.createGain();
        const merger = audioContext.createGain();
        const lfo = audioContext.createOscillator();
        const lfoGain = audioContext.createGain();
        const rate = node.params.rate !== undefined ? node.params.rate : 0.5;
        lfo.type = 'sine';
        lfo.frequency.value = rate;
        const baseDelay = (node.params.delay || 5) / 1000; 
        delayNode.delayTime.value = baseDelay;
        const depth = (node.params.depth || 50) / 100;
        lfoGain.gain.value = depth * baseDelay * 0.5; 
        lfo.connect(lfoGain);
        lfoGain.connect(delayNode.delayTime);
        const feedbackAmount = (node.params.feedback || 0) / 100;
        feedbackGain.gain.value = feedbackAmount * 0.8; 
        const wetAmount = (node.params.mix || 0) / 100;
        const dryAmount = 1 - wetAmount;
        dryGain.gain.value = dryAmount;
        wetGain.gain.value = wetAmount;
        inputGain.connect(dryGain);
        inputGain.connect(delayNode);
        delayNode.connect(feedbackGain);
        feedbackGain.connect(delayNode);
        delayNode.connect(wetGain);
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
        connections.push({ from: wetGain, to: merger });
        connections.push({ from: dryGain, to: merger });
      } else if (node.type === 'spectralgate') {
        const inputGain = audioContext.createGain();
        const merger = audioContext.createGain();
        let spectralGateNode = null;
        if (audioContext.audioWorklet) {
          try {
            if (!spectralGateWorkletUrl) {
              throw new Error('No worklet URL available');
            }
            await audioContext.audioWorklet.addModule(spectralGateWorkletUrl);
            spectralGateNode = new AudioWorkletNode(audioContext, 'spectral-gate-processor');
            const cutoffValue = node.params.cutoff !== undefined ? node.params.cutoff : -20;
            const cutoffParam = spectralGateNode.parameters.get('cutoff');
            if (cutoffParam) {
              cutoffParam.value = cutoffValue;
            } else {
            }
            const fftSizeValue = node.params.fftSize !== undefined ? node.params.fftSize : 2048;
            const fftSizeParam = spectralGateNode.parameters.get('fftSize');
            if (fftSizeParam) {
              fftSizeParam.value = fftSizeValue;
            }
            inputGain.connect(spectralGateNode);
            spectralGateNode.connect(merger);
          } catch (e) {
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
        const inputGain = audioContext.createGain();
        const merger = audioContext.createGain();
        let spectralCompressorNode = null;
        if (audioContext.audioWorklet) {
          try {
            if (!spectralCompressorWorkletUrl) {
              throw new Error('No compressor worklet URL available');
            }
            await audioContext.audioWorklet.addModule(spectralCompressorWorkletUrl);
            spectralCompressorNode = new AudioWorkletNode(audioContext, 'spectral-compressor-processor');
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
            inputGain.connect(spectralCompressorNode);
            spectralCompressorNode.connect(merger);
          } catch (e) {
            inputGain.connect(merger);
          }
        } else {
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
      } else if (node.type === 'spectralpitch') {
        const inputGain = audioContext.createGain();
        const dryGain = audioContext.createGain();
        const wetGain = audioContext.createGain();
        const merger = audioContext.createGain();
        const fftSize = node.params.fftSize || 2048;
        const dryDelay = audioContext.createDelay(1);
        dryDelay.delayTime.value = fftSize / audioContext.sampleRate;
        let spectralPitchNode = null;
        if (audioContext.audioWorklet) {
          try {
            if (!spectralPitchWorkletUrl) {
              throw new Error('No spectral pitch worklet URL available');
            }
            await audioContext.audioWorklet.addModule(spectralPitchWorkletUrl);
            spectralPitchNode = new AudioWorkletNode(audioContext, 'spectral-pitch-processor');
            const pitchValue = node.params.pitch !== undefined ? node.params.pitch : 0;
            const mixValue = node.params.mix !== undefined ? node.params.mix : 100;
            const pitchParam = spectralPitchNode.parameters.get('pitch');
            const mixParam = spectralPitchNode.parameters.get('mix');
            const fftSizeParam = spectralPitchNode.parameters.get('fftSize');
            if (pitchParam) {
              pitchParam.value = pitchValue;
            }
            if (mixParam) {
              mixParam.value = 100;
            }
            const fftSizeValue = node.params.fftSize !== undefined ? node.params.fftSize : 2048;
            if (fftSizeParam) {
              fftSizeParam.value = fftSizeValue;
            }
            const wetAmount = mixValue / 100;
            const dryAmount = 1 - wetAmount;
            dryGain.gain.value = dryAmount;
            wetGain.gain.value = wetAmount;
            inputGain.connect(dryDelay);
            dryDelay.connect(dryGain);
            dryGain.connect(merger);
            inputGain.connect(spectralPitchNode);
            spectralPitchNode.connect(wetGain);
            wetGain.connect(merger);
          } catch (e) {
            inputGain.connect(merger);
          }
        } else {
          inputGain.connect(merger);
        }
        nodes.set(node.id, {
          type: 'spectralpitch',
          input: inputGain,
          output: merger,
          inputGain,
          dryGain,
          wetGain,
          merger,
          dryDelay,
          spectralPitchNode,
          params: node.params,
          audioContext
        });
      } else if (node.type === 'bitcrusher') {
        const inputGain = audioContext.createGain();
        const dryGain = audioContext.createGain();
        const wetGain = audioContext.createGain();
        const merger = audioContext.createGain();
        const bufferSize = 4096;
        const scriptProcessor = audioContext.createScriptProcessor(bufferSize, 2, 2);
        const dryDelay = audioContext.createDelay(1);
        dryDelay.delayTime.value = bufferSize / audioContext.sampleRate;
        const sampleRate = node.params.rate !== undefined ? node.params.rate : 30000;
        const bitDepth = node.params.bits !== undefined ? node.params.bits : 8;
        const step = Math.pow(0.5, bitDepth);
        const sampleReduction = audioContext.sampleRate / sampleRate;
        let lastSampleL = 0;
        let lastSampleR = 0;
        let targetSampleL = 0;
        let targetSampleR = 0;
        let sampleCounter = 0;
        const smoothingFactor = 0.999; 
        scriptProcessor.onaudioprocess = function(e) {
          const inputL = e.inputBuffer.getChannelData(0);
          const inputR = e.inputBuffer.getChannelData(1);
          const outputL = e.outputBuffer.getChannelData(0);
          const outputR = e.outputBuffer.getChannelData(1);
          for (let i = 0; i < bufferSize; i++) {
            if (sampleCounter >= sampleReduction) {
              targetSampleL = inputL[i];
              targetSampleR = inputR[i];
              sampleCounter = 0;
            }
            lastSampleL = lastSampleL * smoothingFactor + targetSampleL * (1 - smoothingFactor);
            lastSampleR = lastSampleR * smoothingFactor + targetSampleR * (1 - smoothingFactor);
            outputL[i] = Math.round(lastSampleL / step) * step;
            outputR[i] = Math.round(lastSampleR / step) * step;
            sampleCounter++;
          }
        };
        const wetAmount = (node.params.mix || 0) / 100;
        const dryAmount = 1 - wetAmount;
        dryGain.gain.value = dryAmount;
        wetGain.gain.value = wetAmount;
        inputGain.connect(dryDelay);
        dryDelay.connect(dryGain);
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
          dryDelay,
          params: node.params,
          audioContext
        });
        connections.push({ from: scriptProcessor, to: wetGain });
        connections.push({ from: wetGain, to: merger });
        connections.push({ from: dryGain, to: merger });
      } else if (node.type === 'output') {
        const masterGain = audioContext.createGain();
        masterGain.gain.value = 0.8; 
        masterGain.connect(customDestination || audioContext.destination);
        nodes.set(node.id, {
          type: 'output',
          audioNode: masterGain,
          masterGain: masterGain
        });
      }
    }
    nodeGraph.edges.forEach(edge => {
      const sourceNode = nodes.get(edge.source);
      const targetNode = nodes.get(edge.target);
      if (sourceNode && targetNode) {
        if (sourceNode.type === 'input') {
          if (targetNode.type === 'reverb') {
            sourceNode.audioNode.connect(targetNode.inputGain);
          } else if (targetNode.type === 'delay') {
            sourceNode.audioNode.connect(targetNode.inputGain);
          } else if (targetNode.type === 'utility') {
            sourceNode.audioNode.connect(targetNode.inputGain);
          } else if (targetNode.type === 'limiter') {
            sourceNode.audioNode.connect(targetNode.inputGain);
          } else if (targetNode.type === 'distortion') {
            sourceNode.audioNode.connect(targetNode.inputGain);
          } else if (targetNode.type === 'tonegenerator') {
          } else if (targetNode.type === 'equalizer') {
            sourceNode.audioNode.connect(targetNode.inputGain);
          } else if (targetNode.type === 'phaser') {
            sourceNode.audioNode.connect(targetNode.inputGain);
          } else if (targetNode.type === 'flanger') {
            sourceNode.audioNode.connect(targetNode.inputGain);
          } else if (targetNode.type === 'spectralgate') {
            sourceNode.audioNode.connect(targetNode.inputGain);
          } else if (targetNode.type === 'spectralcompressor') {
            sourceNode.audioNode.connect(targetNode.inputGain);
          } else if (targetNode.type === 'spectralpitch') {
            sourceNode.audioNode.connect(targetNode.inputGain);
          } else if (targetNode.type === 'bitcrusher') {
            sourceNode.audioNode.connect(targetNode.inputGain);
          } else if (targetNode.type === 'output') {
            sourceNode.audioNode.connect(targetNode.audioNode);
          }
        } else if (sourceNode.type === 'reverb') {
          if (targetNode.type === 'reverb') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'delay') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'utility') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'limiter') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'distortion') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'equalizer') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'phaser') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'flanger') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'spectralgate') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'spectralcompressor') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'spectralpitch') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'bitcrusher') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'output') {
            sourceNode.output.connect(targetNode.audioNode);
          }
        } else if (sourceNode.type === 'delay') {
          if (targetNode.type === 'reverb') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'delay') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'utility') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'limiter') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'distortion') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'equalizer') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'phaser') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'flanger') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'spectralgate') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'spectralcompressor') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'spectralpitch') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'bitcrusher') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'output') {
            sourceNode.output.connect(targetNode.audioNode);
          }
        } else if (sourceNode.type === 'utility') {
          if (targetNode.type === 'reverb') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'delay') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'utility') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'limiter') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'distortion') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'equalizer') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'phaser') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'flanger') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'spectralgate') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'spectralcompressor') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'spectralpitch') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'bitcrusher') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'output') {
            sourceNode.output.connect(targetNode.audioNode);
          }
        } else if (sourceNode.type === 'limiter') {
          if (targetNode.type === 'reverb') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'delay') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'utility') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'limiter') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'distortion') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'equalizer') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'phaser') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'flanger') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'spectralgate') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'spectralcompressor') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'spectralpitch') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'bitcrusher') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'output') {
            sourceNode.output.connect(targetNode.audioNode);
          }
        } else if (sourceNode.type === 'distortion') {
          if (targetNode.type === 'reverb') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'delay') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'utility') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'limiter') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'distortion') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'equalizer') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'phaser') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'flanger') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'spectralgate') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'spectralcompressor') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'spectralpitch') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'bitcrusher') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'output') {
            sourceNode.output.connect(targetNode.audioNode);
          }
        } else if (sourceNode.type === 'tonegenerator') {
          if (targetNode.type === 'reverb') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'delay') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'utility') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'limiter') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'distortion') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'equalizer') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'phaser') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'flanger') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'spectralgate') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'spectralcompressor') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'spectralpitch') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'bitcrusher') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'output') {
            sourceNode.output.connect(targetNode.audioNode);
          }
        } else if (sourceNode.type === 'equalizer') {
          if (targetNode.type === 'reverb') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'delay') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'utility') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'limiter') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'distortion') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'equalizer') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'phaser') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'flanger') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'spectralgate') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'spectralcompressor') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'spectralpitch') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'bitcrusher') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'output') {
            sourceNode.output.connect(targetNode.audioNode);
          }
        } else if (sourceNode.type === 'phaser') {
          if (targetNode.type === 'reverb') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'delay') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'utility') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'limiter') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'distortion') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'equalizer') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'phaser') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'flanger') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'spectralgate') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'spectralcompressor') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'spectralpitch') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'bitcrusher') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'output') {
            sourceNode.output.connect(targetNode.audioNode);
          }
        } else if (sourceNode.type === 'flanger') {
          if (targetNode.type === 'reverb') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'delay') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'utility') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'limiter') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'distortion') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'equalizer') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'phaser') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'flanger') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'spectralgate') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'spectralcompressor') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'spectralpitch') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'bitcrusher') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'output') {
            sourceNode.output.connect(targetNode.audioNode);
          }
        } else if (sourceNode.type === 'spectralgate') {
          if (targetNode.type === 'reverb') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'delay') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'utility') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'limiter') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'distortion') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'equalizer') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'phaser') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'flanger') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'spectralgate') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'spectralcompressor') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'spectralpitch') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'bitcrusher') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'output') {
            sourceNode.output.connect(targetNode.audioNode);
          }
        } else if (sourceNode.type === 'spectralcompressor') {
          if (targetNode.type === 'reverb') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'delay') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'utility') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'limiter') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'distortion') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'equalizer') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'phaser') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'flanger') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'spectralgate') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'spectralcompressor') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'spectralpitch') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'bitcrusher') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'output') {
            sourceNode.output.connect(targetNode.audioNode);
          }
        } else if (sourceNode.type === 'spectralpitch') {
          if (targetNode.type === 'reverb') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'delay') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'utility') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'limiter') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'distortion') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'equalizer') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'phaser') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'flanger') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'spectralgate') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'spectralcompressor') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'spectralpitch') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'bitcrusher') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'output') {
            sourceNode.output.connect(targetNode.audioNode);
          }
        } else if (sourceNode.type === 'bitcrusher') {
          if (targetNode.type === 'reverb') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'delay') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'utility') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'limiter') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'distortion') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'equalizer') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'phaser') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'flanger') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'spectralgate') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'spectralcompressor') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'spectralpitch') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'bitcrusher') {
            sourceNode.output.connect(targetNode.inputGain);
          } else if (targetNode.type === 'output') {
            sourceNode.output.connect(targetNode.audioNode);
          }
        }
      }
    });
    connections.forEach(conn => {
      conn.from.connect(conn.to);
    });
    return nodes;
  }
  function updateAudioGraphParams(element) {
    const graph = audioGraphs.get(element);
    if (!graph) return;
    graph.forEach((node) => {
      if ((node.type === 'reverb' || node.type === 'delay' || node.type === 'phaser' || node.type === 'flanger' || node.type === 'bitcrusher') && node.wetGain && node.dryGain) {
        node.wetGain.gain.value = 0;
        node.dryGain.gain.value = 1;
      }
    });
    graph.forEach((node, nodeId) => {
      const graphNode = settings.audioGraph.nodes.find(n => n.id === nodeId);
      if (!graphNode) {
        if ((node.type === 'reverb' || node.type === 'delay' || node.type === 'phaser' || node.type === 'flanger' || node.type === 'bitcrusher') && node.wetGain) {
          node.wetGain.gain.value = 0;
          node.dryGain.gain.value = 1;
        }
        return;
      }
      if (node.type === 'reverb' && node.wetGain && node.dryGain) {
        const wetAmount = (graphNode.params.mix || 0) / 100;
        const dryAmount = 1 - wetAmount;
        node.wetGain.gain.value = wetAmount;
        node.dryGain.gain.value = dryAmount;
        const currentSize = graphNode.params.size !== undefined ? graphNode.params.size : 50;
        const currentDecay = graphNode.params.decay !== undefined ? graphNode.params.decay : 1000;
        const prevSize = node.params.size !== undefined ? node.params.size : 50;
        const prevDecay = node.params.decay !== undefined ? node.params.decay : 1000;
        if (currentSize !== prevSize || currentDecay !== prevDecay) {
          const oldConvolver = node.convolver;
          const newConvolver = node.audioContext.createConvolver();
          newConvolver.buffer = createReverbImpulse(node.audioContext, currentSize, currentDecay);
          try { oldConvolver.disconnect(); } catch(e) {}
          node.inputGain.connect(newConvolver);
          newConvolver.connect(node.wetGain);
          node.convolver = newConvolver;
        }
        node.params = { ...graphNode.params };
      } else if (node.type === 'delay' && node.wetGain && node.dryGain) {
        const wetAmount = (graphNode.params.mix || 0) / 100;
        const dryAmount = 1 - wetAmount;
        node.wetGain.gain.value = wetAmount;
        node.dryGain.gain.value = dryAmount;
        const delayTime = graphNode.params.delayTime !== undefined ? graphNode.params.delayTime / 1000 : 0.5;
        node.delayNode.delayTime.value = delayTime;
        const feedbackAmount = (graphNode.params.feedback || 0) / 100;
        node.feedbackGain.gain.value = feedbackAmount;
        node.params = { ...graphNode.params };
      } else if (node.type === 'utility' && node.gainNode && node.pannerNode) {
        const volumeDb = graphNode.params.volume !== undefined ? graphNode.params.volume : 0;
        let gainValue;
        if (volumeDb <= -60) {
          gainValue = 0; 
        } else {
          gainValue = Math.pow(10, volumeDb / 20);
        }
        const panValue = graphNode.params.pan !== undefined ? graphNode.params.pan / 100 : 0;
        node.gainNode.gain.value = gainValue;
        node.pannerNode.pan.value = panValue;
        const newPhaseReverseL = graphNode.params.reverseL !== undefined ? graphNode.params.reverseL : false;
        const newPhaseReverseR = graphNode.params.reverseR !== undefined ? graphNode.params.reverseR : false;
        const oldPhaseReverseL = node.params.reverseL !== undefined ? node.params.reverseL : false;
        const oldPhaseReverseR = node.params.reverseR !== undefined ? node.params.reverseR : false;
        if ((newPhaseReverseL !== oldPhaseReverseL || newPhaseReverseR !== oldPhaseReverseR) && 
            node.leftPhaseGain && node.rightPhaseGain) {
          node.leftPhaseGain.gain.value = newPhaseReverseL ? -1 : 1;
          node.rightPhaseGain.gain.value = newPhaseReverseR ? -1 : 1;
          try {
            node.gainNode.disconnect();
            if (node.splitter) node.splitter.disconnect();
            if (node.merger) node.merger.disconnect();
            if (node.leftPhaseGain) node.leftPhaseGain.disconnect();
            if (node.rightPhaseGain) node.rightPhaseGain.disconnect();
            if (newPhaseReverseL || newPhaseReverseR) {
              node.gainNode.connect(node.splitter);
              node.splitter.connect(node.leftPhaseGain, 0);
              node.leftPhaseGain.connect(node.merger, 0, 0);
              node.splitter.connect(node.rightPhaseGain, 1);
              node.rightPhaseGain.connect(node.merger, 0, 1);
              node.merger.connect(node.pannerNode);
            } else {
              node.gainNode.connect(node.pannerNode);
            }
          } catch (e) {
          }
        }
        node.params = { ...graphNode.params };
      } else if (node.type === 'limiter' && node.compressor) {
        const thresholdDb = graphNode.params.threshold !== undefined ? graphNode.params.threshold : -6;
        node.compressor.threshold.value = thresholdDb;
        node.params = { ...graphNode.params };
      } else if (node.type === 'distortion' && node.wetGain && node.dryGain) {
        const wetAmount = (graphNode.params.mix || 0) / 100;
        const dryAmount = 1 - wetAmount;
        node.wetGain.gain.value = wetAmount;
        node.dryGain.gain.value = dryAmount;
        const drive = graphNode.params.drive !== undefined ? graphNode.params.drive : 50;
        const amount = drive * 2.5; 
        const samples = 44100;
        const curve = new Float32Array(samples);
        const deg = Math.PI / 180;
        for (let i = 0; i < samples; i++) {
          const x = (i * 2) / samples - 1;
          curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
        }
        node.waveShaper.curve = curve;
        node.params = { ...graphNode.params };
      } else if (node.type === 'tonegenerator' && node.oscillator && node.gainNode) {
        const newWaveform = graphNode.params.waveform || 'sine';
        const oldWaveform = node.params.waveform || 'sine';
        if (newWaveform !== oldWaveform) {
          node.oscillator.type = newWaveform;
        }
        const frequency = graphNode.params.frequency !== undefined ? graphNode.params.frequency : 440;
        node.oscillator.frequency.value = frequency;
        const volumeDb = graphNode.params.volume !== undefined ? graphNode.params.volume : -12;
        const volumeLinear = Math.pow(10, volumeDb / 20);
        node.gainNode.gain.value = volumeLinear;
        node.params = { ...graphNode.params };
      } else if (node.type === 'equalizer' && node.filter) {
        const newFilterType = graphNode.params.filterType || 'lowpass';
        const oldFilterType = node.params.filterType || 'lowpass';
        if (newFilterType !== oldFilterType) {
          node.filter.type = newFilterType;
        }
        const frequency = graphNode.params.frequency !== undefined ? graphNode.params.frequency : 1000;
        node.filter.frequency.value = frequency;
        const q = graphNode.params.q !== undefined ? graphNode.params.q : 1;
        node.filter.Q.value = q;
        node.params = { ...graphNode.params };
      } else if (node.type === 'phaser' && node.wetGain && node.dryGain) {
        const wetAmount = (graphNode.params.mix || 0) / 100;
        const dryAmount = 1 - wetAmount;
        const currentTime = audioContexts.get(element)?.currentTime || 0;
        node.wetGain.gain.setValueAtTime(wetAmount, currentTime);
        node.dryGain.gain.setValueAtTime(dryAmount, currentTime);
        const rate = graphNode.params.rate !== undefined ? graphNode.params.rate : 0.5;
        node.lfo.frequency.setValueAtTime(rate, currentTime);
        const depth = (graphNode.params.depth || 50) / 100;
        node.lfoGain.gain.setValueAtTime(depth * 1000, currentTime);
        const feedbackAmount = (graphNode.params.feedback || 0) / 100;
        node.feedbackGain.gain.setValueAtTime(feedbackAmount * 0.7, currentTime);
        node.params = { ...graphNode.params };
      } else if (node.type === 'flanger' && node.wetGain && node.dryGain) {
        const wetAmount = (graphNode.params.mix || 0) / 100;
        const dryAmount = 1 - wetAmount;
        const currentTime = audioContexts.get(element)?.currentTime || 0;
        node.wetGain.gain.setValueAtTime(wetAmount, currentTime);
        node.dryGain.gain.setValueAtTime(dryAmount, currentTime);
        const rate = graphNode.params.rate !== undefined ? graphNode.params.rate : 0.5;
        node.lfo.frequency.setValueAtTime(rate, currentTime);
        const baseDelay = (graphNode.params.delay || 5) / 1000;
        node.delayNode.delayTime.setValueAtTime(baseDelay, currentTime);
        const depth = (graphNode.params.depth || 50) / 100;
        node.lfoGain.gain.setValueAtTime(depth * baseDelay * 0.5, currentTime);
        const feedbackAmount = (graphNode.params.feedback || 0) / 100;
        node.feedbackGain.gain.setValueAtTime(feedbackAmount * 0.8, currentTime);
        node.params = { ...graphNode.params };
      } else if (node.type === 'spectralgate') {
        if (node.spectralGateNode) {
          const cutoffValue = graphNode.params.cutoff !== undefined ? graphNode.params.cutoff : -20;
          const fftSizeValue = graphNode.params.fftSize !== undefined ? graphNode.params.fftSize : 2048;
          const currentTime = audioContexts.get(element)?.currentTime || 0;
          const cutoffParam = node.spectralGateNode.parameters.get('cutoff');
          const fftSizeParam = node.spectralGateNode.parameters.get('fftSize');
          if (cutoffParam) {
            cutoffParam.setValueAtTime(cutoffValue, currentTime);
          } else {
          }
          if (fftSizeParam) {
            fftSizeParam.setValueAtTime(fftSizeValue, currentTime);
          }
        } else {
        }
        node.params = { ...graphNode.params };
      } else if (node.type === 'spectralcompressor') {
        if (node.spectralCompressorNode) {
          const attackValue = graphNode.params.attack !== undefined ? graphNode.params.attack : 30;
          const releaseValue = graphNode.params.release !== undefined ? graphNode.params.release : 200;
          const inputGainValue = graphNode.params.inputGain !== undefined ? graphNode.params.inputGain : 10;
          const thresholdValue = graphNode.params.threshold !== undefined ? graphNode.params.threshold : -45.1;
          const ratioValue = graphNode.params.ratio !== undefined ? graphNode.params.ratio : 1.2;
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
        }
        node.params = { ...graphNode.params };
      } else if (node.type === 'spectralpitch') {
        if (node.spectralPitchNode) {
          const pitchValue = graphNode.params.pitch !== undefined ? graphNode.params.pitch : 0;
          const mixValue = graphNode.params.mix !== undefined ? graphNode.params.mix : 100;
          const fftSizeValue = graphNode.params.fftSize !== undefined ? graphNode.params.fftSize : 2048;
          const currentTime = audioContexts.get(element)?.currentTime || 0;
          const pitchParam = node.spectralPitchNode.parameters.get('pitch');
          const fftSizeParam = node.spectralPitchNode.parameters.get('fftSize');
          if (pitchParam) {
            pitchParam.setValueAtTime(pitchValue, currentTime);
          }
          if (fftSizeParam) {
            fftSizeParam.setValueAtTime(fftSizeValue, currentTime);
          }
          if (node.dryDelay) {
            node.dryDelay.delayTime.setValueAtTime(fftSizeValue / node.audioContext.sampleRate, currentTime);
          }
          if (node.wetGain && node.dryGain) {
            const wetAmount = mixValue / 100;
            const dryAmount = 1 - wetAmount;
            node.wetGain.gain.setValueAtTime(wetAmount, currentTime);
            node.dryGain.gain.setValueAtTime(dryAmount, currentTime);
          }
        }
        node.params = { ...graphNode.params };
      } else if (node.type === 'bitcrusher' && node.wetGain && node.dryGain) {
        const wetAmount = (graphNode.params.mix || 0) / 100;
        const dryAmount = 1 - wetAmount;
        const currentTime = audioContexts.get(element)?.currentTime || 0;
        node.wetGain.gain.setValueAtTime(wetAmount, currentTime);
        node.dryGain.gain.setValueAtTime(dryAmount, currentTime);
        const newRate = graphNode.params.rate !== undefined ? graphNode.params.rate : 30000;
        const newBits = graphNode.params.bits !== undefined ? graphNode.params.bits : 8;
        if (node.scriptProcessor && node.scriptProcessor.onaudioprocess) {
          const step = Math.pow(0.5, newBits);
          const sampleReduction = node.audioContext.sampleRate / newRate;
          let lastSampleL = 0;
          let lastSampleR = 0;
          let sampleCounter = 0;
          node.scriptProcessor.onaudioprocess = function(e) {
            const inputL = e.inputBuffer.getChannelData(0);
            const inputR = e.inputBuffer.getChannelData(1);
            const outputL = e.outputBuffer.getChannelData(0);
            const outputR = e.outputBuffer.getChannelData(1);
            for (let i = 0; i < e.inputBuffer.length; i++) {
              if (sampleCounter >= sampleReduction) {
                lastSampleL = inputL[i];
                lastSampleR = inputR[i];
                sampleCounter = 0;
              }
              outputL[i] = Math.round(lastSampleL / step) * step;
              outputR[i] = Math.round(lastSampleR / step) * step;
              sampleCounter++;
            }
          };
        }
        node.params = { ...graphNode.params };
      }
    });
  }
  function getCurrentSpeed() {
    const inputNode = settings.audioGraph.nodes.find(n => n.type === 'input');
    return inputNode?.params.speed || 1.0;
  }
  function disconnectAudioGraph(element) {
    const graph = audioGraphs.get(element);
    if (!graph) return;
    graph.forEach(node => {
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
      if (node.leftPhaseGain) {
        try { node.leftPhaseGain.disconnect(); } catch(e) {}
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
      if (node.spectralCompressorNode) {
        try { node.spectralCompressorNode.disconnect(); } catch(e) {}
      }
      if (node.spectralPitchNode) {
        try { node.spectralPitchNode.disconnect(); } catch(e) {}
      }
      if (node.masterGain) {
        try { node.masterGain.disconnect(); } catch(e) {}
      }
      if (node.scriptProcessor) {
        try { node.scriptProcessor.disconnect(); } catch(e) {}
      }
    });
  }
  async function setupAudioProcessing(element, forceRebuild = false) {
    const hasExistingContext = audioContexts.has(element);
    if (hasExistingContext && !forceRebuild) {
      updateAudioGraphParams(element);
      return;
    }
    if (hasExistingContext && forceRebuild) {
      disconnectAudioGraph(element);
      const audioContext = audioContexts.get(element);
      const existingGraph = audioGraphs.get(element);
      let source = null;
      existingGraph.forEach(node => {
        if (node.type === 'input' && node.audioNode) {
          source = node.audioNode;
        }
      });
      if (source) {
        const audioNodes = await buildAudioGraph(audioContext, source, settings.audioGraph);
        audioGraphs.set(element, audioNodes);
      }
      return;
    }
    if (window.location.hostname.includes('soundcloud.com')) return;
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaElementSource(element);
      const audioNodes = await buildAudioGraph(audioContext, source, settings.audioGraph);
      audioContexts.set(element, audioContext);
      audioGraphs.set(element, audioNodes);
    } catch (e) {
    }
  }
  function updateMediaElement(element) {
    if (!element) return;
    setupAudioProcessing(element, false);
    if (!processedElements.has(element)) {
      processedElements.add(element);
      const originalDescriptor = Object.getOwnPropertyDescriptor(element, 'playbackRate') || 
                               Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'playbackRate');
      Object.defineProperty(element, 'playbackRate', {
        get: function() {
          return originalDescriptor.get.call(this);
        },
        set: function(value) {
          if (!settings.enabled) {
            if (isFinite(value) && value > 0) {
              originalDescriptor.set.call(this, value);
            }
            return;
          }
          const currentSpeed = getCurrentSpeed();
          if (isFinite(currentSpeed) && currentSpeed > 0) {
            originalDescriptor.set.call(this, currentSpeed);
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
        element.playbackRate = currentSpeed;
        applyPitchSettings(element);
      }
    } else {
      element.playbackRate = 1.0;
    }
  }
  function applyPitchSettings(element) {
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
  function updateAllMedia() {
    const elements = document.querySelectorAll('audio, video');
    elements.forEach(updateMediaElement);
  }
  const originalPlay = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function() {
    updateMediaElement(this);
    return originalPlay.apply(this, arguments);
  };
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'PATCHROME_SETTINGS') {
      if (event.data.workletUrl) {
        spectralGateWorkletUrl = event.data.workletUrl;
      }
      if (event.data.compressorWorkletUrl) {
        spectralCompressorWorkletUrl = event.data.compressorWorkletUrl;
      }
      if (event.data.pitchWorkletUrl) {
        spectralPitchWorkletUrl = event.data.pitchWorkletUrl;
      }
      const newSettings = event.data.settings;
      let needsRebuild = false;
      if (newSettings) {
        const oldEnabled = settings.enabled;
        const newEnabled = newSettings.enabled !== false;
        if (oldEnabled !== newEnabled) {
          needsRebuild = true;
        }
        if (newSettings.audioGraph) {
          const oldEdges = JSON.stringify(settings.audioGraph.edges);
          const newEdges = JSON.stringify(newSettings.audioGraph.edges);
          const oldNodes = JSON.stringify(settings.audioGraph.nodes.map(n => ({ id: n.id, type: n.type })));
          const newNodes = JSON.stringify(newSettings.audioGraph.nodes.map(n => ({ id: n.id, type: n.type })));
          if (oldEdges !== newEdges || oldNodes !== newNodes) {
            needsRebuild = true;
          }
          settings.audioGraph = newSettings.audioGraph;
        }
        settings.enabled = newEnabled;
      }
      if (needsRebuild) {
        const elements = document.querySelectorAll('audio, video');
        elements.forEach(element => setupAudioProcessing(element, true));
      } else {
        updateAllMedia();
      }
    }
  });
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.matches && (node.matches('audio, video'))) {
              updateMediaElement(node);
            }
            const mediaElements = node.querySelectorAll && node.querySelectorAll('audio, video');
            if (mediaElements) {
              mediaElements.forEach(updateMediaElement);
            }
          }
        });
      }
    }
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  let checkInterval = 100;
  setInterval(updateAllMedia, checkInterval);
  if (window.location.hostname.includes('soundcloud.com')) {
    const OriginalAudioContext = window.AudioContext || window.webkitAudioContext;
    const contexts = new WeakMap();
    const soundcloudSources = new WeakMap();
    const sourceConnections = new WeakMap();
    let needsSoundCloudRebuild = false;
    const originalMessageHandler = window.addEventListener;
    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'PATCHROME_SETTINGS') {
        const newSettings = event.data.settings;
        if (newSettings && newSettings.audioGraph) {
          needsSoundCloudRebuild = true;
        }
      }
    });
    window.AudioContext = window.webkitAudioContext = function(...args) {
      const ctx = new OriginalAudioContext(...args);
      const originalCreateMediaElementSource = ctx.createMediaElementSource;
      ctx.createMediaElementSource = function(mediaElement) {
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
        const proxySource = {
          connect: async function(destination) {
            const existingConnection = sourceConnections.get(source);
            if (existingConnection) {
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
            contexts.set(mediaElement, ctx);
            audioContexts.set(mediaElement, ctx);
            disconnectAudioGraph(mediaElement);
            const audioNodes = await buildAudioGraph(ctx, source, settings.audioGraph, destination);
            audioGraphs.set(mediaElement, audioNodes);
            applyPitchSettings(mediaElement);
            const checkPitch = () => {
              if (settings.enabled) {
                const currentSpeed = getCurrentSpeed();
                if (mediaElement.playbackRate !== currentSpeed) {
                  mediaElement.playbackRate = currentSpeed;
                }
                applyPitchSettings(mediaElement);
                updateAudioGraphParams(mediaElement);
              } else {
                if (mediaElement.playbackRate !== 1.0) {
                  mediaElement.playbackRate = 1.0;
                }
              }
              if (needsSoundCloudRebuild) {
                needsSoundCloudRebuild = false;
                this.connect(destination);
              }
            };
            const interval = setInterval(checkPitch, 50);
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
  setTimeout(updateAllMedia, 100);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateAllMedia);
  }
  window.addEventListener('load', () => {
    setTimeout(updateAllMedia, 1000);
  });
})();