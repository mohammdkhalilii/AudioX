# AudioX

**AudioX** is a free, open-source, offline-first desktop voice audio cleaner. It removes background noise, hum, and room reverb from spoken-word recordings while preserving vocal clarity and standardizing broadcast loudness.

AudioX runs locally on your machine using [Electron](https://www.electronjs.org/), [React](https://react.dev/), [FFmpeg](https://ffmpeg.org/), and [DeepFilterNet](https://github.com/Rikorose/DeepFilterNet). No cloud accounts, no subscriptions, and your audio files never leave your computer.

---

## Features

- **Offline-First Voice Denoising**: Removes fan noise, traffic, hiss, and room echo using deep learning.
- **Three Noise Presets**:
  - **Balanced (Default)**: Standard 100% DeepFilterNet cleanup.
  - **Light**: Blends 70% denoised audio with 30% original ambient sound for natural results.
  - **Strong**: Applies deep post-filtering (`--pf`) for aggressive noise suppression.
- **Broadcast Loudness Normalization**:
  - **Natural**: `-18 LUFS` (Podcasts, audiobooks).
  - **Loud**: `-16 LUFS` (YouTube, streaming, social video).
  - **Custom**: Adjustable `-24` through `-12 LUFS`.
  - True-peak ceiling capped at `-1.5 dBTP` with `LRA=7` (EBU R128).
- **Synchronized A/B Comparison**: Seamlessly switch between original and cleaned audio before saving.
- **Supported Formats**:
  - **Inputs**: `.wav`, `.m4a`, `.mp3`, `.flac` (auto-standardized to speech-optimized 48 kHz mono).
  - **Exports**: WAV (24-bit PCM), M4A (192 kb/s AAC), MP3 (192 kb/s), FLAC (lossless level 8).
- **Security & Privacy**: Zero analytics, zero network telemetry, sandboxed renderer, and opaque file tokens.

---

## Supported Operating Systems

Version 1 targets:
- **macOS**: Apple Silicon (`arm64`), `.dmg` installer.
- **Windows**: Windows 10/11 (`x64`), `.exe` NSIS installer.
- **Linux**: Ubuntu / Debian / Fedora / Arch (`x64`), `.AppImage` and `.deb` packages.

### First-Time OS Approval (Unsigned Releases)

Because Version 1 releases are unsigned community builds:
- **macOS**: Double-click app. If macOS blocks it, open **System Settings → Privacy & Security**, scroll down, and click **Open Anyway**.
- **Windows**: When Microsoft Defender SmartScreen displays a warning, click **More info → Run anyway**.
- **Linux**: For AppImage, make it executable (`chmod +x AudioX-*.AppImage`) or install `.deb` via `sudo dpkg -i AudioX-*.deb`.

### One-Time Engine Setup

AudioX bundles FFmpeg but does not redistribute the DeepFilterNet binary. On first launch, click **Download & Continue**:
1. AudioX detects your OS and CPU architecture.
2. Downloads the official DeepFilterNet release binary directly from GitHub Releases.
3. Cryptographically verifies its SHA-256 hash before saving.
4. Stores it in your user data directory without requiring administrator privileges.
5. All future processing runs 100% offline.

---

## Development Setup

### Prerequisites

- **Node.js**: v20 or v22 LTS (`node -v`)
- **npm**: v10+ (`npm -v`)
- **FFmpeg & FFprobe**: Installed on host PATH for development, or placed in `resources/binaries/<os>-<arch>/`.

### Installation & Running

```bash
# Clone the repository
git clone https://github.com/your-username/AudioX.git
cd AudioX

# Install dependencies
npm install

# Run the test suite
npm test

# Build and launch development app
npm run dev
```

### Build Commands

```bash
# Build TypeScript main process and Vite renderer
npm run build

# Run unit tests
npm test

# Package native installer for your current OS
npm run package
```

Release packages are generated in the `release/` directory.

---

## Architecture & Security

- **Sandboxed Renderer**: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`.
- **Opaque File Tokens**: Real filesystem paths never touch renderer DOM or URLs. Files are accessed via `app-audio://<token>` range-streaming protocol.
- **Safe Process Spawning**: Child processes (`ffmpeg`, `ffprobe`, `deep-filter`) execute strictly with `shell: false` and sanitized string arrays. No shell interpolation.
- **Diagnostics Sanitizer**: Crash diagnostics strip usernames, home directories, and filenames before copying.

---

## Testing on Windows & Linux

See [TESTING.md](TESTING.md) for step-by-step instructions on verifying AudioX across Windows and Linux environments (Virtual Machines, Windows Sandbox, Docker, and GitHub Actions CI).

---

## License & Third-Party Notices

- **AudioX** is licensed under the [MIT License](legal/LICENSE).
- Uses **FFmpeg** under the GNU Lesser General Public License (LGPL) v2.1.
- Uses **DeepFilterNet** (MIT/Apache 2.0) downloaded from upstream official releases.
- Full notices available in [THIRD_PARTY_NOTICES.md](legal/THIRD_PARTY_NOTICES.md).
