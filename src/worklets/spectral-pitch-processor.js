class SpectralPitchProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.pitchShift = 0; 
    this.mix = 0; 
    this.targetFftSize = 2048; 
    this.fftSize = 2048; 
    this.hopSize = this.fftSize / 4; 
    this.needsReinit = false;
    this.initializeBuffers();
  }
  initializeBuffers() {
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
        magnitude: new Float32Array(this.fftSize),
        phase: new Float32Array(this.fftSize),
        lastPhase: new Float32Array(this.fftSize),
        sumPhase: new Float32Array(this.fftSize),
        inputPos: 0,
        outputPos: 0,
        hopCounter: 0
      };
    }
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
  processFrame(channel) {
    const data = this.channelData[channel];
    for (let i = 0; i < this.fftSize; i++) {
      data.real[i] = data.inputBuffer[i] * this.window[i];
      data.imag[i] = 0;
    }
    this.fft(data.real, data.imag, false);
    for (let i = 0; i < this.fftSize; i++) {
      data.magnitude[i] = Math.sqrt(data.real[i] * data.real[i] + data.imag[i] * data.imag[i]);
      data.phase[i] = Math.atan2(data.imag[i], data.real[i]);
    }
    const pitchRatio = Math.pow(2, this.pitchShift / 1200); 
    const expectedPhaseInc = 2 * Math.PI * this.hopSize / this.fftSize;
    for (let i = 0; i < this.fftSize; i++) {
      data.real[i] = 0;
      data.imag[i] = 0;
    }
    for (let i = 0; i <= this.fftSize / 2; i++) {
      const shiftedBin = Math.round(i * pitchRatio);
      if (shiftedBin > 0 && shiftedBin <= this.fftSize / 2) {
        const phaseDiff = data.phase[i] - data.lastPhase[i];
        data.lastPhase[i] = data.phase[i];
        let wrappedPhaseDiff = phaseDiff - i * expectedPhaseInc;
        wrappedPhaseDiff = wrappedPhaseDiff - 2 * Math.PI * Math.round(wrappedPhaseDiff / (2 * Math.PI));
        const trueFreq = i * expectedPhaseInc + wrappedPhaseDiff;
        data.sumPhase[shiftedBin] += trueFreq * pitchRatio;
        data.real[shiftedBin] += data.magnitude[i] * Math.cos(data.sumPhase[shiftedBin]);
        data.imag[shiftedBin] += data.magnitude[i] * Math.sin(data.sumPhase[shiftedBin]);
        if (shiftedBin > 0 && shiftedBin < this.fftSize / 2) {
          data.real[this.fftSize - shiftedBin] = data.real[shiftedBin];
          data.imag[this.fftSize - shiftedBin] = -data.imag[shiftedBin];
        }
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
    if (parameters.pitch && parameters.pitch.length > 0) {
      this.pitchShift = parameters.pitch[0];
    }
    if (parameters.mix && parameters.mix.length > 0) {
      this.mix = parameters.mix[0];
    }
    if (parameters.fftSize && parameters.fftSize.length > 0) {
      const newFftSize = Math.round(parameters.fftSize[0]);
      const validSizes = [512, 1024, 2048, 4096, 8192, 16384, 32768];
      const closestSize = validSizes.reduce((prev, curr) => 
        Math.abs(curr - newFftSize) < Math.abs(prev - newFftSize) ? curr : prev
      );
      if (closestSize !== this.fftSize) {
        this.targetFftSize = closestSize;
        this.needsReinit = true;
      }
    }
    if (this.needsReinit) {
      this.fftSize = this.targetFftSize;
      this.hopSize = this.fftSize / 4;
      this.initializeBuffers();
      this.needsReinit = false;
    }
    const numChannels = Math.min(input.length, output.length);
    const blockSize = input[0].length;
    for (let ch = 0; ch < numChannels; ch++) {
      const inputChannel = input[ch];
      const outputChannel = output[ch];
      const data = this.channelData[ch];
      if (!data) continue;
      for (let i = 0; i < blockSize; i++) {
        const drySample = inputChannel[i];
        data.inputBuffer[data.inputPos] = inputChannel[i];
        data.inputPos++;
        if (data.inputPos >= this.hopSize && data.hopCounter === 0) {
          this.processFrame(ch);
          for (let j = 0; j < this.fftSize - this.hopSize; j++) {
            data.inputBuffer[j] = data.inputBuffer[j + this.hopSize];
          }
          data.inputPos = this.fftSize - this.hopSize;
          data.hopCounter = this.hopSize;
        }
        let wetSample = 0;
        if (data.hopCounter > 0) {
          wetSample = data.overlapBuffer[data.outputPos];
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
        }
        const mixAmount = this.mix / 100;
        outputChannel[i] = drySample * (1 - mixAmount) + wetSample * mixAmount;
      }
    }
    return true;
  }
  static get parameterDescriptors() {
    return [{
      name: 'pitch',
      defaultValue: 0,
      minValue: -1200,
      maxValue: 1200,
      automationRate: 'k-rate'
    }, {
      name: 'mix',
      defaultValue: 100,
      minValue: 0,
      maxValue: 100,
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
registerProcessor('spectral-pitch-processor', SpectralPitchProcessor);