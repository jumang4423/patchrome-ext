<div align="center">
  <img src="logo.png" alt="Patchrome Logo" />
  
  # Patchrome
</div>

A Chrome extension that brings modular audio effects processing to your browser. Build custom audio effect chains with a visual node-based interface and apply them to any audio/video content in real-time.

## Features

### 🎛️ Visual Audio Routing
- Intuitive drag-and-drop node interface
- Connect audio effects in any order
- Real-time visual feedback of your signal chain
- Inspired by modular synthesizers and audio production software

### 🎵 Built-in Audio Effects

- **Speed Control** (0.5x - 1.5x)
  - Adjust playback speed with optional pitch preservation
  - Perfect for slowing down tutorials or speeding up podcasts

- **Reverb**
  - Add spatial depth to any audio
  - Adjustable room size, decay time, and wet/dry mix
  - From subtle ambience to massive halls

- **Delay**
  - Create echoes and rhythmic repeats
  - Control delay time, feedback, and mix
  - Sync to musical timing or create ambient textures

- **Utility (Gain & Pan)**
  - Precise volume control (-60dB to +12dB)
  - Stereo panning for spatial positioning
  - Phase reverse option for correcting phase issues
  - Essential for balancing your effect chain

- **Limiter**
  - Prevent audio clipping and distortion
  - Adjustable threshold (-60dB to 0dB)
  - Hard knee limiting with 20:1 ratio
  - Fast attack (3ms) for transparent limiting

- **Distortion**
  - Add harmonic richness and grit
  - Drive control (0-100%) for distortion intensity
  - Wet/dry mix for parallel processing
  - Soft clipping algorithm with 4x oversampling

### 🚀 Technical Highlights

- Built on Web Audio API for low-latency processing
- Works with all HTML5 audio/video elements
- Special optimization for SoundCloud and Web Audio API sources
- Wet/dry mixing on reverb, delay, and distortion effects
- Persistent settings across browser sessions

## Installation

### From Chrome Web Store
*(Coming soon)*

### From Source

1. Clone this repository:
```bash
git clone https://github.com/yourusername/patchrome-ext.git
cd patchrome-ext
```

2. Install dependencies:
```bash
npm install
```

3. Build the extension:
```bash
npm run build
```

4. Load in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder

## Usage

1. Click the Patchrome icon in your Chrome toolbar while on a page with audio/video
2. The side panel will open showing the audio routing interface
3. Drag effect nodes from the "Add Effect" menu
4. Connect nodes by dragging from output to input ports
5. Adjust parameters using the controls on each node
6. Your effects are applied in real-time!

## Development

### Prerequisites
- Node.js 14+
- npm or yarn

### Setup
```bash
npm install
npm run dev  # Start development build with watch mode
```

### Project Structure
```
src/
├── background.ts       # Extension background script
├── content.ts         # Content script for page injection
├── inject.js          # Injected script for audio interception
├── sidepanel/         # React-based UI
│   ├── App.tsx
│   ├── components/    # UI components
│   └── styles.css
└── shared/           # Shared types and utilities
```

### Building
```bash
npm run build    # Production build
npm run dev      # Development build with watch
```

## Use Cases

- **Education**: Slow down tutorial videos while maintaining clarity
- **Podcasts**: Add reverb for a more professional sound
- **Music Production**: Experiment with effects on reference tracks
- **Accessibility**: Adjust audio playback to personal preferences
- **Sound Design**: Create unique audio atmospheres from any source

## Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Areas for Contribution
- New audio effects (filters, compression, EQ, etc.)
- UI/UX improvements
- Performance optimizations
- Browser compatibility enhancements
- Documentation and tutorials

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [React](https://reactjs.org/) and [React Flow](https://reactflow.dev/)
- Audio processing powered by [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- UI components from [shadcn/ui](https://ui.shadcn.com/)

## Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/patchrome-ext/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/patchrome-ext/discussions)

---

Made with 🎵 by audio enthusiasts, for audio enthusiasts