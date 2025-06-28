<div align="center">
  <img src="logo.png" alt="Patchrome Logo" width="200"/>
  
  # Patchrome

  A powerful Chrome extension for real-time audio manipulation on web pages. Process any audio playing in your browser with a modular effects chain using visual node-based routing.
</div>

## Overview

Patchrome is a Chrome extension that intercepts and processes audio from web pages in real-time. It provides a visual node-based interface where you can build custom audio effect chains by connecting various audio processing nodes together.

### Key Features

- **Visual Node Editor**: Drag-and-drop interface for building audio effect chains
- **Real-time Processing**: All effects are applied in real-time with minimal latency
- **Multiple Effect Types**: 
  - **Input/Output**: Audio source with speed control and destination nodes
  - **Effects**: Reverb, Delay, Distortion, Phaser, Flanger, Equalizer (with multiple filter types), Bitcrusher
  - **Utilities**: Gain/Pan control with phase inversion, Limiter
  - **Generators**: Tone Generator (sine, triangle, sawtooth, square waves)
  - **Spectral Effects**: Spectral Gate, Spectral Compressor, Spectral Pitch Shifter
- **Per-site Compatibility**: Works on most websites with HTML5 audio/video
- **Persistent Settings**: Your effect chains are saved per session

## Installation

1. Clone this repository
2. Run `npm install` to install dependencies
3. Run `npm run build` to build the extension
4. Open Chrome and navigate to `chrome://extensions`
5. Enable "Developer mode"
6. Click "Load unpacked" and select the `dist` folder

## Usage Tips

### Quick Actions

- **Right-click on empty space** → Opens the "Add Effect" menu instantly
- **Double-click on any slider** → Enter precise values manually
- **Drag nodes** → Rearrange your effect chain visually
- **Click the power button** → Enable/disable all effects globally

### Keyboard Shortcuts

- **Delete/Backspace** → Remove selected node (except Input/Output nodes)
- **Escape** → Close dialogs

### Effect Parameters

#### Speed Control (Input Node)
- Adjust playback speed from 0.5x to 1.5x
- Preserves pitch automatically

#### Reverb
- **Mix**: Dry/wet balance (0-100%)
- **Size**: Room size simulation (0-100%)
- **Decay**: Reverb tail length in milliseconds

#### Delay
- **Delay Time**: Echo delay in milliseconds (0-2000ms)
- **Feedback**: Echo repetitions (0-100%)
- **Mix**: Dry/wet balance (0-100%)

#### Utility
- **Volume**: Gain control in dB (-60 to +12 dB)
- **Pan**: Stereo positioning (-100 to +100)
- **Phase Reverse**: Invert right channel phase

#### Distortion
- **Drive**: Distortion amount (0-100)
- **Mix**: Dry/wet balance (0-100%)

#### Equalizer
- **Filter Type**: Choose from lowpass, highpass, bandpass, or notch filters
- **Frequency**: Adjustable from 20 Hz to 7777 Hz
- **Q Factor**: Filter resonance/width (0.1-30)

#### Limiter
- **Threshold**: Limiting threshold in dB (-60 to 0 dB)

#### Phaser
- **Rate**: LFO speed (0.1-10 Hz)
- **Depth**: Modulation depth (0-100%)
- **Feedback**: Resonance amount (0-100%)
- **Mix**: Dry/wet balance (0-100%)

#### Flanger
- **Rate**: LFO speed (0.1-10 Hz)
- **Depth**: Modulation depth (0-100%)
- **Feedback**: Resonance amount (-100 to +100%)
- **Delay**: Base delay time (1-20ms)
- **Mix**: Dry/wet balance (0-100%)

#### Tone Generator
- **Waveform**: Sine, triangle, sawtooth, or square wave
- **Frequency**: 20-20000 Hz
- **Volume**: Output level (-60 to 0 dB)

#### Bitcrusher
- **Mix**: Dry/wet balance (0-100%)
- **Sample Rate**: Reduce sample rate (2000-40000 Hz)
- **Bit Depth**: Reduce bit resolution (1-16 bits)

#### Spectral Gate
- **Cutoff**: Frequency magnitude threshold (-60 to +24 dB)

#### Spectral Compressor
- **Threshold**: Compression threshold (-60 to 0 dB)
- **Ratio**: Compression ratio (0.5-1.5)
- **Attack**: Attack time (0.1-100ms)
- **Release**: Release time (1-500ms)
- **Input Gain**: Pre-compression gain (-24 to +24 dB)

#### Spectral Pitch Shifter
- **Pitch**: Pitch shift in cents (-1200 to +1200, ±1 octave)
- **Mix**: Dry/wet balance (0-100%)

## Performance Notes

The extension uses Web Audio API for processing, which means:
- Effects are applied at the browser level
- CPU usage scales with effect complexity
- Some effects (especially spectral processing) may be CPU-intensive

## Known Issues & TODO

### Platform-Specific Issues

- **YouTube**: Heavy CPU usage when multiple effects are chained, especially with spectral effects. Consider using simpler effect chains for better performance.
- **Twitter/X**: Video players may experience higher latency with complex effect chains due to the platform's audio handling.
- **SoundCloud**: Works well with most effects. The extension has special handling for SoundCloud's audio system.

### TODO List

- [ ] Implement preset system for saving/loading effect chains
- [ ] Add visualization (spectrum analyzer, waveform display)
- [ ] Optimize performance for complex effect chains
- [ ] Create effect chain templates for common use cases
- [ ] Add A/B comparison feature
- [ ] Implement effect automation/LFO modulation
- [ ] Add more modulation effects (Chorus, Tremolo, Ring Modulator)
- [ ] Implement sidechain compression
- [ ] Add frequency analyzer node for visual feedback

## Development

### Setup
```bash
npm install
npm run dev  # Watch mode for development
npm run build  # Production build
```

### Project Structure
```
patchrome-ext/
├── src/
│   ├── background.ts      # Extension background script
│   ├── content.ts         # Content script injected into pages
│   ├── inject.js          # Main audio processing logic
│   ├── sidepanel/         # React-based side panel UI
│   │   ├── App.tsx
│   │   └── components/    # UI components
│   ├── worklets/          # Audio worklet processors
│   └── types/             # TypeScript definitions
├── manifest.json          # Chrome extension manifest
└── webpack.config.js      # Build configuration
```

### Adding New Effects

See [ADD_EFFECT_INSTRUCTIONS.md](ADD_EFFECT_INSTRUCTIONS.md) for detailed instructions on adding new effects.

For audio worklet-based effects, see [ADD_AUDIO_WORKLET_CUSTOM_EFFECT_INSTRUCTIONS.md](ADD_AUDIO_WORKLET_CUSTOM_EFFECT_INSTRUCTIONS.md).

## License

This project is open source. Feel free to use and modify as needed.

## Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues for bugs and feature requests.