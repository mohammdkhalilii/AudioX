# AGENTS.md — Agent Operational Guide

This document defines conventions, guardrails, and verification workflows for autonomous agents working in the AudioX codebase.

---

## 1. Project Invariants

- **Zero Network Ingestion of Audio**: Audio files must never be uploaded or transmitted over network sockets. Processing is 100% local.
- **Engine Setup**: The only external HTTPS call AudioX makes is downloading the official DeepFilterNet binary pinned in `resources/engine-manifest.json`.
- **Security Boundaries**:
  - `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`.
  - Renderer uses `app-audio://<token>` protocol with range support. Do not expose local file paths to the renderer DOM.
  - Subprocess execution must always use `shell: false`.

---

## 2. Directory Structure

```
AudioX/
├── src/
│   ├── common/       # Types, constants, sanitized errors (shared across main/renderer)
│   ├── main/         # Electron main process, pipeline, engine downloader, protocol, IPC
│   ├── preload/      # Preload script (index.cjs) exposing window.audiox bridge
│   └── renderer/     # React UI, views, components, CSS
├── resources/        # engine-manifest.json, icons, bundled binaries
├── tests/            # Native node --test suite
├── legal/            # MIT LICENSE & THIRD_PARTY_NOTICES.md
├── package.json
└── tsconfig.*.json
```

---

## 3. Safe Editing Rules

1. **Imports in TypeScript**:
   - `tsconfig.node.json` uses `NodeNext` module resolution.
   - All relative imports in `src/main/` and `src/common/` must end in `.js` (e.g. `import { foo } from './bar.js'`).
   - Type imports must use `import type { ... } from '...';`.
2. **Preload Script**:
   - Preload must be CommonJS (`src/preload/index.cjs`).
   - `build:main` copies `src/preload/index.cjs` into `dist/preload/index.cjs`.
3. **Audio Pipeline Safety**:
   - Intermediate audio decoded for DeepFilterNet must remain 16-bit PCM (`pcm_s16le`) at 48 kHz mono (`channels=1`).
   - Do not pass 24-bit PCM to DeepFilterNet (causes `TooWide` Rust panic in hound WAV reader).
   - Loudness normalization must enforce `-1.5 dBTP` true peak ceiling.

---

## 4. Verification Commands

Before completing any task, run:

```bash
# 1. Typecheck and compile main + preload
npm run build:main

# 2. Build Vite React renderer bundle
npm run build:renderer

# 3. Execute unit test suite
npm test
```

All 9 unit tests must pass without errors.
