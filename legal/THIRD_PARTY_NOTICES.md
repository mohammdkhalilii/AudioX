# Third-Party Notices and Licenses

AudioX relies on the following open-source software projects and components:

---

## 1. FFmpeg and FFprobe

- **Project:** FFmpeg (https://ffmpeg.org)
- **License:** GNU Lesser General Public License (LGPL) version 2.1 or later
- **Usage:** Audio decoding, stream probing, format conversion, delay compensation, loudness normalization, and AAC/WAV/FLAC/MP3 encoding.
- **Compliance:**
  - FFmpeg binaries distributed with release packages are built with an LGPL-compatible configuration without `--enable-gpl` or `--enable-nonfree`.
  - Corresponding source code archives, configuration parameters, and build scripts for the exact bundled binaries are published alongside each GitHub release.
  - License text: See https://www.gnu.org/licenses/old-licenses/lgpl-2.1.html

---

## 2. DeepFilterNet

- **Project:** DeepFilterNet (https://github.com/Rikorose/DeepFilterNet)
- **Authors:** Hendrik Schröter and contributors
- **License:** MIT License / Apache License 2.0
- **Distribution Notice:**
  - AudioX does not redistribute or bundle the DeepFilterNet binary or model weights.
  - The executable is downloaded on-demand directly from the official upstream GitHub release (`https://github.com/Rikorose/DeepFilterNet/releases`) upon user confirmation.
  - DeepFilterNet is verified against pinned cryptographic SHA-256 checksums before execution.

---

## 3. Electron and Runtime Dependencies

- **Electron:** MIT License (Copyright (c) Electron contributors)
- **React & React DOM:** MIT License (Copyright (c) Meta Platforms, Inc. and affiliates)
- **Vite:** MIT License (Copyright (c) 2019-present Evan You & Vite Contributors)
- **TypeScript:** Apache License 2.0 (Copyright (c) Microsoft Corporation)
