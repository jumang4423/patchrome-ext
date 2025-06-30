class SpectralCompressorProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.thresholdDb = -45.1; 
    this.ratio = 1.2; 
    this.attackMs = 30;
    this.releaseMs = 200;
    this.inputGainDb = 10.0;
    this.windowSize = 2048; 
    this.fftSize = this.windowSize;
    this.hopSize = this.fftSize / 4; 
    this.window = new Float32Array(this.fftSize);
    for (let i = 0; i < this.fftSize; i++) {
      this.window[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (this.fftSize - 1));
    }
    this.channelData = [];
    for (let ch = 0; ch < 2; ch++) { 
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
      this.channelData[ch].smoothedGains.fill(1.0);
    }
    this.sampleRate = 48000; 
  }
  fft(real, imag, inverse = false) {
    const n = real.length;
    const bits = Math.log2(n);
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
    if (inverse) {
      const scale = 1 / n;
      for (let i = 0; i < n; i++) {
        real[i] *= scale;
        imag[i] *= scale;
      }
    }
  }
  dbToLinear(db) {
    return Math.pow(10, db / 20);
  }
  linearToDb(linear) {
    return 20 * Math.log10(Math.max(1e-10, linear));
  }
  applyCompression(magnitudeDb) {
    if (magnitudeDb > this.thresholdDb) {
      const excess = magnitudeDb - this.thresholdDb;
      const compressedExcess = excess / this.ratio;
      return this.thresholdDb + compressedExcess;
    }
    return magnitudeDb;
  }
  processFrame(channel) {
    const data = this.channelData[channel];
    for (let i = 0; i < this.fftSize; i++) {
      data.real[i] = data.inputBuffer[i] * this.window[i];
      data.imag[i] = 0;
    }
    this.fft(data.real, data.imag, false);
    const attackSamples = (this.attackMs * this.sampleRate) / (1000 * this.hopSize);
    const releaseSamples = (this.releaseMs * this.sampleRate) / (1000 * this.hopSize);
    const attackCoeff = Math.exp(-1 / Math.max(1, attackSamples));
    const releaseCoeff = Math.exp(-1 / Math.max(1, releaseSamples));
    for (let i = 0; i <= this.fftSize / 2; i++) {
      const real = data.real[i];
      const imag = data.imag[i];
      const magnitude = Math.sqrt(real * real + imag * imag);
      const phase = Math.atan2(imag, real);
      data.magnitudes[i] = magnitude;
      data.phases[i] = phase;
      const magnitudeDb = this.linearToDb(magnitude);
      const compressedDb = this.applyCompression(magnitudeDb);
      const gainDb = compressedDb - magnitudeDb;
      const targetGain = this.dbToLinear(gainDb);
      const currentGain = data.smoothedGains[i];
      let newGain;
      if (targetGain < currentGain) {
        newGain = targetGain + (currentGain - targetGain) * attackCoeff;
      } else {
        newGain = targetGain + (currentGain - targetGain) * releaseCoeff;
      }
      data.smoothedGains[i] = newGain;
      data.compressionGains[i] = newGain;
      const compressedMagnitude = magnitude * newGain;
      data.real[i] = compressedMagnitude * Math.cos(phase);
      data.imag[i] = compressedMagnitude * Math.sin(phase);
      if (i > 0 && i < this.fftSize / 2) {
        data.real[this.fftSize - i] = data.real[i];
        data.imag[this.fftSize - i] = -data.imag[i];
      }
    }
    this.fft(data.real, data.imag, true);
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
    if (this.sampleRate !== sampleRate) {
      this.sampleRate = sampleRate;
    }
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
    for (let ch = 0; ch < numChannels; ch++) {
      const inputChannel = input[ch];
      const outputChannel = output[ch];
      const data = this.channelData[ch];
      if (!data) continue;
      for (let i = 0; i < blockSize; i++) {
        data.inputBuffer[data.inputPos] = inputChannel[i] * inputGainLinear;
        data.inputPos++;
        if (data.inputPos >= this.hopSize && data.hopCounter === 0) {
          this.processFrame(ch);
          for (let j = 0; j < this.fftSize - this.hopSize; j++) {
            data.inputBuffer[j] = data.inputBuffer[j + this.hopSize];
          }
          data.inputPos = this.fftSize - this.hopSize;
          data.hopCounter = this.hopSize;
        }
        if (data.hopCounter > 0) {
          outputChannel[i] = data.overlapBuffer[data.outputPos];
          data.outputPos++;
          data.hopCounter--;
          if (data.hopCounter === 0) {
            for (let j = 0; j < this.fftSize - this.hopSize; j++) {
              data.overlapBuffer[j] = data.overlapBuffer[j + this.hopSize];
            }
            for (let j = this.fftSize - this.hopSize; j < this.fftSize; j++) {
              data.overlapBuffer[j] = 0;
            }
            data.outputPos = 0;
          }
        } else {
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