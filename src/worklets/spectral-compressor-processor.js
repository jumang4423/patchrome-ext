// Spectral Compressor AudioWorkletProcessor
// Uses FFT with windowing and overlap-add for smooth frequency-domain compression

class SpectralCompressorProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    
    // Parameters that can be controlled
    this.thresholdDb = -45.1; // Default threshold
    this.ratio = 1.2; // Default compression ratio (1.2:1)
    this.attackMs = 30;
    this.releaseMs = 200;
    this.inputGainDb = 10.0;
    
    // Fixed parameters
    this.windowSize = 2048; // From the image
    
    // FFT settings
    this.fftSize = this.windowSize;
    this.hopSize = this.fftSize / 4; // 75% overlap
    
    // Window function (Hann window)
    this.window = new Float32Array(this.fftSize);
    for (let i = 0; i < this.fftSize; i++) {
      this.window[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (this.fftSize - 1));
    }
    
    // Per-channel buffers
    this.channelData = [];
    for (let ch = 0; ch < 2; ch++) { // Support stereo
      this.channelData[ch] = {
        inputBuffer: new Float32Array(this.fftSize),
        outputBuffer: new Float32Array(this.fftSize),
        overlapBuffer: new Float32Array(this.fftSize),
        real: new Float32Array(this.fftSize),
        imag: new Float32Array(this.fftSize),
        magnitudes: new Float32Array(this.fftSize / 2 + 1),
        phases: new Float32Array(this.fftSize / 2 + 1),
        compressionGains: new Float32Array(this.fftSize / 2 + 1),
        smoothedGains: new Float32Array(this.fftSize / 2 + 1),
        inputPos: 0,
        outputPos: 0,
        hopCounter: 0
      };
      
      // Initialize smoothed gains to 1.0
      this.channelData[ch].smoothedGains.fill(1.0);
    }
    
    // Sample rate will be set when process is called
    this.sampleRate = 48000; // Default
    
    console.log('Patchrome: SpectralCompressorProcessor initialized');
  }
  
  // FFT implementation (same as spectral gate)
  fft(real, imag, inverse = false) {
    const n = real.length;
    const bits = Math.log2(n);
    
    // Bit reversal
    for (let i = 0; i < n; i++) {
      let j = 0;
      let x = i;
      for (let k = 0; k < bits; k++) {
        j = (j << 1) | (x & 1);
        x >>= 1;
      }
      if (j > i) {
        [real[i], real[j]] = [real[j], real[i]];
        [imag[i], imag[j]] = [imag[j], imag[i]];
      }
    }
    
    // Cooley-Tukey FFT
    for (let size = 2; size <= n; size *= 2) {
      const halfSize = size / 2;
      const angle = (inverse ? 2 : -2) * Math.PI / size;
      const wReal = Math.cos(angle);
      const wImag = Math.sin(angle);
      
      for (let start = 0; start < n; start += size) {
        let tmpReal = 1;
        let tmpImag = 0;
        
        for (let i = 0; i < halfSize; i++) {
          const even = start + i;
          const odd = even + halfSize;
          
          const evenReal = real[even];
          const evenImag = imag[even];
          const oddReal = real[odd];
          const oddImag = imag[odd];
          
          real[even] = evenReal + tmpReal * oddReal - tmpImag * oddImag;
          imag[even] = evenImag + tmpReal * oddImag + tmpImag * oddReal;
          real[odd] = evenReal - (tmpReal * oddReal - tmpImag * oddImag);
          imag[odd] = evenImag - (tmpReal * oddImag + tmpImag * oddReal);
          
          const nextTmpReal = tmpReal * wReal - tmpImag * wImag;
          const nextTmpImag = tmpReal * wImag + tmpImag * wReal;
          tmpReal = nextTmpReal;
          tmpImag = nextTmpImag;
        }
      }
    }
    
    // Normalize for inverse transform
    if (inverse) {
      const scale = 1 / n;
      for (let i = 0; i < n; i++) {
        real[i] *= scale;
        imag[i] *= scale;
      }
    }
  }
  
  // Convert dB to linear
  dbToLinear(db) {
    return Math.pow(10, db / 20);
  }
  
  // Convert linear to dB
  linearToDb(linear) {
    return 20 * Math.log10(Math.max(1e-10, linear));
  }
  
  // Apply compression to a magnitude value
  applyCompression(magnitudeDb) {
    if (magnitudeDb > this.thresholdDb) {
      // Above threshold - apply compression
      const excess = magnitudeDb - this.thresholdDb;
      const compressedExcess = excess / this.ratio;
      return this.thresholdDb + compressedExcess;
    }
    // Below threshold - no compression
    return magnitudeDb;
  }
  
  // Process one frame for a channel
  processFrame(channel) {
    const data = this.channelData[channel];
    
    // Apply window to input
    for (let i = 0; i < this.fftSize; i++) {
      data.real[i] = data.inputBuffer[i] * this.window[i];
      data.imag[i] = 0;
    }
    
    // Forward FFT
    this.fft(data.real, data.imag, false);
    
    // Convert attack/release from ms to smoothing coefficients
    const attackSamples = (this.attackMs * this.sampleRate) / (1000 * this.hopSize);
    const releaseSamples = (this.releaseMs * this.sampleRate) / (1000 * this.hopSize);
    const attackCoeff = Math.exp(-1 / Math.max(1, attackSamples));
    const releaseCoeff = Math.exp(-1 / Math.max(1, releaseSamples));
    
    // Apply spectral compression
    for (let i = 0; i <= this.fftSize / 2; i++) {
      // Calculate magnitude and phase
      const real = data.real[i];
      const imag = data.imag[i];
      const magnitude = Math.sqrt(real * real + imag * imag);
      const phase = Math.atan2(imag, real);
      
      data.magnitudes[i] = magnitude;
      data.phases[i] = phase;
      
      // Convert to dB and apply compression
      const magnitudeDb = this.linearToDb(magnitude);
      const compressedDb = this.applyCompression(magnitudeDb);
      
      // Calculate gain reduction
      const gainDb = compressedDb - magnitudeDb;
      const targetGain = this.dbToLinear(gainDb);
      
      // Apply smoothing with attack/release
      const currentGain = data.smoothedGains[i];
      let newGain;
      
      if (targetGain < currentGain) {
        // Attack (gain reduction)
        newGain = targetGain + (currentGain - targetGain) * attackCoeff;
      } else {
        // Release (gain restoration)
        newGain = targetGain + (currentGain - targetGain) * releaseCoeff;
      }
      
      data.smoothedGains[i] = newGain;
      data.compressionGains[i] = newGain;
      
      // Apply compression gain
      const compressedMagnitude = magnitude * newGain;
      
      // Convert back to real/imag
      data.real[i] = compressedMagnitude * Math.cos(phase);
      data.imag[i] = compressedMagnitude * Math.sin(phase);
      
      // Mirror for negative frequencies (except DC and Nyquist)
      if (i > 0 && i < this.fftSize / 2) {
        data.real[this.fftSize - i] = data.real[i];
        data.imag[this.fftSize - i] = -data.imag[i];
      }
    }
    
    // Inverse FFT
    this.fft(data.real, data.imag, true);
    
    // Apply window to output and add to overlap buffer
    for (let i = 0; i < this.fftSize; i++) {
      data.outputBuffer[i] = data.real[i] * this.window[i];
      data.overlapBuffer[i] += data.outputBuffer[i];
    }
  }
  
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    
    if (!input || input.length === 0 || !output || output.length === 0) {
      return true;
    }
    
    // Update sample rate
    if (this.sampleRate !== sampleRate) {
      this.sampleRate = sampleRate;
    }
    
    // Update parameters
    if (parameters.attack && parameters.attack.length > 0) {
      this.attackMs = parameters.attack[0];
    }
    if (parameters.release && parameters.release.length > 0) {
      this.releaseMs = parameters.release[0];
    }
    if (parameters.inputGain && parameters.inputGain.length > 0) {
      this.inputGainDb = parameters.inputGain[0];
    }
    if (parameters.threshold && parameters.threshold.length > 0) {
      this.thresholdDb = parameters.threshold[0];
    }
    if (parameters.ratio && parameters.ratio.length > 0) {
      this.ratio = parameters.ratio[0];
    }
    
    const numChannels = Math.min(input.length, output.length);
    const blockSize = input[0].length;
    const inputGainLinear = this.dbToLinear(this.inputGainDb);
    
    // Process each channel
    for (let ch = 0; ch < numChannels; ch++) {
      const inputChannel = input[ch];
      const outputChannel = output[ch];
      const data = this.channelData[ch];
      
      if (!data) continue;
      
      // Process each sample
      for (let i = 0; i < blockSize; i++) {
        // Add input sample to buffer with input gain
        data.inputBuffer[data.inputPos] = inputChannel[i] * inputGainLinear;
        data.inputPos++;
        
        // Check if we have enough samples to process a frame
        if (data.inputPos >= this.hopSize && data.hopCounter === 0) {
          // Process frame
          this.processFrame(ch);
          
          // Shift input buffer by hop size
          for (let j = 0; j < this.fftSize - this.hopSize; j++) {
            data.inputBuffer[j] = data.inputBuffer[j + this.hopSize];
          }
          data.inputPos = this.fftSize - this.hopSize;
          
          // Reset hop counter
          data.hopCounter = this.hopSize;
        }
        
        // Output from overlap buffer
        if (data.hopCounter > 0) {
          outputChannel[i] = data.overlapBuffer[data.outputPos];
          data.outputPos++;
          data.hopCounter--;
          
          // If we've output a hop's worth of samples, shift the overlap buffer
          if (data.hopCounter === 0) {
            // Shift overlap buffer
            for (let j = 0; j < this.fftSize - this.hopSize; j++) {
              data.overlapBuffer[j] = data.overlapBuffer[j + this.hopSize];
            }
            // Clear the end
            for (let j = this.fftSize - this.hopSize; j < this.fftSize; j++) {
              data.overlapBuffer[j] = 0;
            }
            data.outputPos = 0;
          }
        } else {
          // Output silence until we have processed data
          outputChannel[i] = 0;
        }
      }
    }
    
    return true;
  }
  
  static get parameterDescriptors() {
    return [{
      name: 'attack',
      defaultValue: 30,
      minValue: 0.1,
      maxValue: 100,
      automationRate: 'k-rate'
    }, {
      name: 'release',
      defaultValue: 200,
      minValue: 1,
      maxValue: 500,
      automationRate: 'k-rate'
    }, {
      name: 'inputGain',
      defaultValue: 10,
      minValue: -24,
      maxValue: 24,
      automationRate: 'k-rate'
    }, {
      name: 'threshold',
      defaultValue: -45.1,
      minValue: -60,
      maxValue: 0,
      automationRate: 'k-rate'
    }, {
      name: 'ratio',
      defaultValue: 1.2,
      minValue: 0.5,
      maxValue: 1.5,
      automationRate: 'k-rate'
    }];
  }
}

registerProcessor('spectral-compressor-processor', SpectralCompressorProcessor);