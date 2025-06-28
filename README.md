# Patchrome

A powerful Chrome extension for real-time audio manipulation on web pages. Process any audio playing in your browser with a modular effects chain using visual node-based routing.

## Overview

Patchrome is a Chrome extension that intercepts and processes audio from web pages in real-time. It provides a visual node-based interface where you can build custom audio effect chains by connecting various audio processing nodes together.

### Key Features

- **Visual Node Editor**: Drag-and-drop interface for building audio effect chains
- **Real-time Processing**: All effects are applied in real-time with minimal latency
- **Multiple Effect Types**: 
  - **Input/Output**: Audio source and destination nodes
  - **Effects**: Reverb, Delay, Distortion, Phaser, Flanger, Equalizer
  - **Utilities**: Gain/Pan control, Limiter
  - **Generators**: Tone Generator
  - **Spectral Effects**: Spectral Gate (frequency-selective gating)
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

- **Right-click on any node connection** → Opens the "Add Effect" menu instantly
- **Double-click on any slider** → Enter precise values manually
- **Drag nodes** → Rearrange your effect chain visually
- **Click the power button** → Enable/disable all effects globally

### Keyboard Shortcuts

- **Delete/Backspace** → Remove selected node (except Input/Output nodes)
- **Escape** → Close dialogs

### Effect Parameters

#### Speed Control (Input Node)
- Adjust playback speed from 0.25x to 4x
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
- **Tone**: High-frequency content (0-100)
- **Mix**: Dry/wet balance (0-100%)

#### Equalizer
- **Low**: ±12 dB at 320 Hz
- **Mid**: ±12 dB at 1000 Hz  
- **High**: ±12 dB at 3200 Hz

#### Limiter
- **Threshold**: Limiting threshold in dB (-30 to 0 dB)
- **Release**: Release time in milliseconds (1-1000ms)

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

- [ ] Add more spectral effects (Spectral Compressor is prepared but not integrated)
- [ ] Implement preset system for saving/loading effect chains
- [ ] Add visualization (spectrum analyzer, waveform display)
- [ ] Optimize performance for complex effect chains
- [ ] Add MIDI control support
- [ ] Implement sidechain compression
- [ ] Add more modulation effects (Chorus, Tremolo, Vibrato)
- [ ] Create effect chain templates for common use cases
- [ ] Add A/B comparison feature
- [ ] Implement effect automation/LFO modulation

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