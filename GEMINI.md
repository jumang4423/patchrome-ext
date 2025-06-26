# Patchrome Chrome Extension Summary

This is a sophisticated Chrome extension project named "Patchrome" designed for real-time audio manipulation on web pages.

Here's a breakdown of its key aspects:

*   **Core Functionality**: The extension allows users to control and modify audio playing in their browser. The description "Simple audio speed and delay control" and the name "Patchrome" (a portmanteau of "patch" and "Chrome") suggest it intercepts the browser's audio pipeline to apply effects.

*   **User Interface**: The primary user interface is a Chrome Side Panel built with **React** and **TypeScript**. A central feature of the UI is a node-based graph editor, powered by the **ReactFlow** library. This allows users to visually construct an audio processing pipeline by connecting different nodes (representing audio sources or effects) and edges. The UI is styled with **Tailwind CSS**, and it uses `shadcn/ui` conventions and components (`dropdown-menu.tsx`, `tailwind-merge`, etc.) for a modern look and feel.

*   **Technical Architecture**:
    *   **Manifest V3**: The project uses the modern Manifest V3 standard for Chrome extensions.
    *   **Build System**: **Webpack** is used to compile and bundle the TypeScript, React, and CSS assets into the final `dist` directory.
    *   **Content & Injected Scripts**: The extension uses a multi-layered approach to interact with web page content:
        1.  `content.ts`: A content script that runs in the isolated context of the web page. Its primary role is likely to inject the `inject.js` script.
        2.  `inject.js`: This script is a "web accessible resource" that gets injected into the main execution world of the web page. This is a critical step, as it allows the extension to directly access and patch the page's native JavaScript objects, specifically the **Web Audio API** (`AudioContext`, `HTMLMediaElement`, etc.), which is necessary for intercepting and modifying audio.
    *   **Background Service Worker**: `background.ts` runs persistently in the background, managing the extension's state, coordinating communication between the side panel UI and the content scripts, and handling the opening/closing of the side panel.

In essence, a user opens the side panel, builds an audio effect graph (e.g., "source -> delay -> output"), and the extension translates that graph into a real Web Audio API pipeline on the current page to modify the sound in real-time.
