# AudioX — Repository Guide

Offline-first desktop voice audio cleaner using Electron, React, Vite, FFmpeg, and DeepFilterNet.
Application ID: `studio.emya.audiox`.

## Quick Commands

```bash
# Install packages
npm install

# Run unit tests (Node native runner)
npm test

# Full build (TypeScript main process + Vite renderer)
npm run build

# Start Electron application
npm start

# Build & launch app
npm run dev

# Package desktop installer for current OS
npm run package
```

## Architecture & Code Conventions

- **Main Process** (`src/main/`):
  - TypeScript compiled to ESM via `tsconfig.node.json` targeting `dist/main/`.
  - NodeNext module resolution requires explicit `.js` extensions on relative imports in `.ts` files (e.g., `import { foo } from './bar.js'`).
  - Native processes (`ffmpeg`, `ffprobe`, `deep-filter`) must spawn with `shell: false` and array arguments. Never concatenate shell strings.
- **Preload Bridge** (`src/preload/`):
  - Packaged as CommonJS (`src/preload/index.cjs` copied to `dist/preload/index.cjs`).
  - Exposes typed `window.audiox` API via `contextBridge`.
  - Renderer never has direct filesystem or Node access.
- **Renderer** (`src/renderer/`):
  - Built with Vite + React 18 to `dist/renderer/`.
  - Audio files stream via `app-audio://<token>` range-supporting protocol.
  - No filesystem paths in renderer state or URLs — only opaque UUID tokens.
  - CSS uses system font stack and automatic light/dark variables (`prefers-color-scheme`).

## Core Invariants

1. **Intermediate WAV Format**: FFmpeg intermediate WAV feeding DeepFilterNet MUST be 16-bit PCM (`pcm_s16le`) at 48,000 Hz mono. DeepFilterNet panics with `TooWide` on 24-bit input. Final WAV exports use 24-bit PCM (`pcm_s24le`).
2. **Preset Blending**:
   - `balanced`: 100% DeepFilterNet output.
   - `strong`: DeepFilterNet with `--pf`.
   - `light`: 70% denoised + 30% original ambient audio mixed via FFmpeg `amix`.
3. **Loudness Standards**: Target `-18 LUFS` (Natural) or `-16 LUFS` (Loud), capped at `-1.5 dBTP`, `LRA=7`.
4. **Engine Download Security**: Manifest only allows downloads from `github.com` and `*.githubusercontent.com`. SHA-256 is verified before atomic rename; corrupt downloads are immediately deleted.
5. **Diagnostics Sanitization**: Stderr and diagnostics must be stripped of user home directories, usernames, and raw file paths via `sanitizeStderr()` before display or clipboard copy.
