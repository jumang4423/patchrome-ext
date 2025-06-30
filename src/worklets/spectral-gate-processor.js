// Spectral Gate AudioWorkletProcessor
// Uses FFT with proper windowing and overlap-add for smooth processing

class SpectralGateProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    
    // Parameters
    this.cutoffDb = -20; // Higher default for more aggressive gating
    this.targetFftSize = 2048; // Default FFT size
    
    // FFT settings
    this.fftSize = 2048; // Current FFT size
    this.hopSize = this.fftSize / 4; // 75% overlap (4x overlap)
    this.needsReinit = false;
    
    // Initialize with default FFT size
    this.initializeBuffers();
  }
  
  initializeBuffers() {
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
        inputPos: 0,
        outputPos: 0,
        hopCounter: 0
      };
    }
  }
  
  // FFT implementation
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
    
    // Apply spectral gate
    const threshold = Math.pow(10, this.cutoffDb / 20);
    
    for (let i = 0; i <= this.fftSize / 2; i++) {
      const magnitude = Math.sqrt(data.real[i] * data.real[i] + data.imag[i] * data.imag[i]);
      
      if (magnitude < threshold) {
        // Gate this frequency bin - reduce to 0% for aggressive gating (complete silence)
        const gateAmount = 0.0;
        data.real[i] = 0;
        data.imag[i] = 0;
        
        // Mirror for negative frequencies (except DC and Nyquist)
        if (i > 0 && i < this.fftSize / 2) {
          data.real[this.fftSize - i] = data.real[i];
          data.imag[this.fftSize - i] = -data.imag[i];
        }
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
    
    // Update parameters
    if (parameters.cutoff && parameters.cutoff.length > 0) {
      this.cutoffDb = parameters.cutoff[0];
    }
    if (parameters.fftSize && parameters.fftSize.length > 0) {
      const newFftSize = Math.round(parameters.fftSize[0]);
      // Ensure FFT size is power of 2 and within valid range
      const validSizes = [512, 1024, 2048, 4096, 8192, 16384, 32768];
      const closestSize = validSizes.reduce((prev, curr) => 
        Math.abs(curr - newFftSize) < Math.abs(prev - newFftSize) ? curr : prev
      );
      
      if (closestSize !== this.fftSize) {
        this.targetFftSize = closestSize;
        this.needsReinit = true;
      }
    }
    
    // Reinitialize buffers if FFT size changed
    if (this.needsReinit) {
      this.fftSize = this.targetFftSize;
      this.hopSize = this.fftSize / 4;
      this.initializeBuffers();
      this.needsReinit = false;
      console.log(`Patchrome: SpectralGateProcessor FFT size changed to ${this.fftSize}`);
    }
    
    const numChannels = Math.min(input.length, output.length);
    const blockSize = input[0].length;
    
    // Process each channel
    for (let ch = 0; ch < numChannels; ch++) {
      const inputChannel = input[ch];
      const outputChannel = output[ch];
      const data = this.channelData[ch];
      
      if (!data) continue; // Skip if we don't have buffers for this channel
      
      // Process each sample
      for (let i = 0; i < blockSize; i++) {
        // Add input sample to buffer
        data.inputBuffer[data.inputPos] = inputChannel[i];
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
      name: 'cutoff',
      defaultValue: -20,
      minValue: -60,
      maxValue: 24,
      automationRate: 'k-rate'
    }, {
      name: 'fftSize',
      defaultValue: 2048,
      minValue: 512,
      maxValue: 32768,
      automationRate: 'k-rate'
    }];
  }
}

registerProcessor('spectral-gate-processor', SpectralGateProcessor);