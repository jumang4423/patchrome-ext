<div align="center">
  <img src="logo.png" alt="Patchrome Logo" width="200"/>
  
  # Patchrome

  **🎛️ Real-time audio effects for any website**
  
  Transform your browser into a powerful audio processor. Add reverb to YouTube videos, pitch-shift podcasts, or create unique soundscapes from any web audio.

  [![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/jumang4423/patchrome-ext/releases)
  [![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
</div>

## 🚀 Quick Start

### Install from GitHub Release

1. Download the latest `patchrome-ext.zip` from [Releases](https://github.com/jumang4423/patchrome-ext/releases)
2. Unzip the file
3. Open Chrome and go to `chrome://extensions/`
4. Enable "Developer mode" (top right)
5. Click "Load unpacked" and select the unzipped folder
6. Click the extension icon in your toolbar to start!

### How to Use

1. **Open any website** with audio/video (YouTube, SoundCloud, etc.)
2. **Click the Patchrome icon** in your toolbar
3. **Right-click in the panel** to add effects
4. **Connect nodes** by dragging from output to input
5. **Adjust parameters** with sliders or double-click for precise values

## ✨ Features

<div align="center">
  <img src="https://github.com/jumang4423/patchrome-ext/assets/demo.gif" alt="Demo" width="600"/>
</div>

### 🎵 Audio Effects
- **Reverb** - Add space and ambience
- **Delay** - Create echoes and rhythmic patterns  
- **Distortion** - Add grit and warmth
- **EQ** - Shape your sound with filters
- **Phaser/Flanger** - Classic modulation effects
- **Bitcrusher** - Lo-fi digital destruction
- **Spectral Effects** - Advanced frequency manipulation

### 🎛️ Visual Node Editor
- Drag & drop interface
- Real-time parameter control
- Save effect chains per session
- Visual signal flow

### ⚡ Performance
- Low-latency processing
- Minimal CPU usage
- Works with all HTML5 audio/video

## 🎮 Keyboard Shortcuts

- `Space` - Toggle global bypass
- `Delete` - Remove selected node
- `Ctrl+Z` - Undo last action

## 🌟 Examples

### YouTube Enhancement
```
Input → EQ (boost bass) → Reverb (small room) → Output
```

### Podcast Production
```
Input → EQ (voice enhance) → Limiter → Output
```

### Creative Sound Design
```
Input → Pitch Shift → Delay → Phaser → Reverb → Output
```

## 🤝 Contributing

We welcome contributions! Feel free to:
- Report bugs
- Suggest new effects
- Submit pull requests
- Share your effect presets

## 📝 Development

### Building from Source

```bash
# Clone the repository
git clone https://github.com/jumang4423/patchrome-ext.git
cd patchrome-ext

# Install dependencies
npm install

# Development build (with watch mode)
npm run dev

# Production build
npm run build
```

### Project Structure
```
patchrome-ext/
├── src/
│   ├── inject.js          # Core audio processing
│   ├── sidepanel/         # React UI
│   ├── worklets/          # Audio worklet processors
│   └── types/             # TypeScript definitions
├── manifest.json          # Extension manifest
└── webpack.config.js      # Build configuration
```

### Adding New Effects

See [ADD_EFFECT_INSTRUCTIONS.md](ADD_EFFECT_INSTRUCTIONS.md) for detailed instructions.

## 📄 License

MIT License - feel free to use in your own projects!

---

<div align="center">
  Made with ❤️ by <a href="https://github.com/jumang4423">jumang4423</a>
</div>