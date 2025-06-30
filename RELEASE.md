# GitHub Release Guide

## Creating a Release

### 1. Build the Extension

```bash
# Make sure you have a clean build
npm run build
```

### 2. Create Distribution Package

```bash
# Create a zip file containing the built extension
zip -r patchrome-ext.zip dist/ manifest.json icon*.png logo.png
```

### 3. Create GitHub Release

1. Go to your repository on GitHub
2. Click on "Releases" → "Create a new release"
3. Choose a tag (e.g., `v1.0.0`)
4. Fill in release details:
   - **Release title**: `Patchrome v1.0.0`
   - **Description**: Include changelog and features
5. Upload `patchrome-ext.zip` as a release asset
6. Publish release

### 4. Update README

Update the version badge in README.md to match the new release version.

## Release Checklist

- [ ] Update version in `manifest.json`
- [ ] Update version in `package.json`
- [ ] Test the extension thoroughly
- [ ] Build production version (`npm run build`)
- [ ] Create zip file
- [ ] Create GitHub release
- [ ] Upload zip file to release
- [ ] Update README version badge
- [ ] Announce release (optional)

## Version Naming

Follow semantic versioning:
- `MAJOR.MINOR.PATCH` (e.g., 1.0.0)
- MAJOR: Breaking changes
- MINOR: New features
- PATCH: Bug fixes

## Example Release Description

```markdown
## 🎉 Patchrome v1.0.0

First public release of Patchrome - Real-time audio effects for any website!

### ✨ Features
- Visual node-based audio routing
- 15+ audio effects including reverb, delay, distortion, and more
- Real-time processing with minimal latency
- Per-site effect chains
- Works with YouTube, SoundCloud, and any HTML5 audio/video

### 📦 Installation
1. Download `patchrome-ext.zip` from the assets below
2. Unzip the file
3. Open `chrome://extensions/`
4. Enable "Developer mode"
5. Click "Load unpacked" and select the folder

Enjoy transforming your browser audio! 🎵
```