# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

- `npm run dev` - Build in development mode with file watching
- `npm run build` - Build for production
- `npm run clean` - Remove the dist directory

## Architecture Overview

This is a Chrome extension (Manifest V3) that provides audio speed and reverb control for web pages. The extension consists of:

### Core Components

1. **Background Service Worker** (`src/background.ts`)
   - Manages global settings state
   - Handles communication between extension components
   - Persists settings to Chrome storage
   - Opens side panel when action button clicked

2. **Content Script** (`src/content.ts`)
   - Injected into all web pages
   - Bridges communication between page context and extension
   - Injects the main audio processing script

3. **Injected Script** (`src/inject.js`)
   - Runs in page context with access to DOM and audio APIs
   - Intercepts and modifies audio/video elements
   - Applies speed and reverb effects using Web Audio API
   - Special handling for SoundCloud integration

4. **Side Panel UI** (`src/sidepanel/`)
   - React-based interface using ReactFlow for visual node editor
   - Components:
     - `App.tsx` - Main app component managing settings state
     - `FlowDiagram.tsx` - Visual audio processing flow diagram
     - `nodes/` - Custom ReactFlow nodes for audio inputs/outputs/effects
     - `Slider.tsx` - Reusable slider component

### Build Configuration

- **Webpack** bundles three entry points: sidepanel, background, content
- TypeScript compilation with `ts-loader` (transpileOnly mode)
- CSS handled with style-loader/css-loader
- Copies manifest.json, icons, and inject.js to dist

### Extension Permissions

- `storage` - For persisting user settings
- `sidePanel` - For the control interface
- `activeTab` - For current tab access
- Host permissions for all URLs to inject scripts

### Key Technical Details

- Uses Web Audio API for real-time audio processing
- Implements convolution reverb with custom impulse responses
- Maintains WeakMaps/WeakSets to track processed elements
- Handles both regular media elements and platform-specific APIs (e.g., SoundCloud)