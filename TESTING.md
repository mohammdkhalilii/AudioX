# Cross-Platform Testing Guide: Windows, Linux & macOS

This guide explains how to test AudioX on **Windows** and **Linux** (both locally and via automated CI), stage native binaries, and run audio acceptance checks.

---

## 1. Platform Matrix

| Platform | Target Architecture | Distribution Package | Engine Executable |
| :--- | :--- | :--- | :--- |
| **macOS** | Apple Silicon (`arm64`) | `.dmg` | `deep-filter` |
| **Windows** | Intel/AMD (`x64`) | `.exe` (NSIS) | `deep-filter.exe` |
| **Linux** | Intel/AMD (`x64`) | `.AppImage`, `.deb` | `deep-filter` |

---

## 2. Automated Testing with GitHub Actions CI

The fastest and most consistent way to test Windows and Linux without local VMs is GitHub Actions. Create `.github/workflows/ci.yml`:

```yaml
name: CI Test & Build

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    name: Test on ${{ matrix.os }}
    runs-on: ${{ matrix.os }}
    strategy:
      fail-fast: false
      matrix:
        os: [macos-14, windows-latest, ubuntu-latest]
        node-version: [22]

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit test suite
        run: npm test

      - name: Build application
        run: npm run build

      - name: Package desktop installer
        run: npm run package
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Upload installer artifact
        uses: actions/upload-artifact@v4
        with:
          name: audiox-${{ matrix.os }}
          path: release/*.*
          if-no-files-found: error
```

When pushed to GitHub, this runs the test suite and packages artifacts on native Windows, Ubuntu, and macOS runners automatically.

---

## 3. Testing on Windows (Local)

### Option A: Windows Sandbox (Fastest on Windows 10/11 Pro/Enterprise)
1. Press `Win + R`, type `optionalfeatures`, and ensure **Windows Sandbox** is checked.
2. Launch **Windows Sandbox** (creates a pristine, disposable Windows environment).
3. Copy `release/AudioX Setup 1.0.0.exe` into the Sandbox window.
4. Run the installer:
   - Microsoft Defender SmartScreen will show: *"Windows protected your PC"*.
   - Click **More info → Run anyway**.
5. Launch AudioX:
   - Verify setup screen displays **Download & Continue**.
   - Click download: verify byte progress, SHA-256 validation, and health check.
   - Verify file drag-and-drop or selection of `.mp3`, `.wav`, `.m4a`, `.flac`.
   - Test **Clean Audio** and synchronized A/B comparison.
   - Save output file and test **Open Folder**.

### Option B: Virtual Machine (Parallels, VMware, VirtualBox, UTM)
1. Create a Windows 10 or 11 x64 VM.
2. Install Node.js v22 and Git.
3. Clone the repo and run:
   ```cmd
   npm install
   npm test
   npm run dev
   ```

---

## 4. Testing on Linux (Local)

### Option A: Docker (Headless Test & Build Verification)
You can test the Linux build and headless test suite in Docker on any machine:

```bash
# Run Ubuntu container with Node 22
docker run -it --rm -v "$(pwd)":/app -w /app node:22-bookworm bash

# Inside container:
apt-get update && apt-get install -y ffmpeg libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libgtk-3-0 libasound2
npm install
npm test
npm run build
npm run package
```

### Option B: Ubuntu / Debian VM or Native Linux
1. Copy or build `AudioX-1.0.0.AppImage` or `audiox_1.0.0_amd64.deb`.
2. For **AppImage**:
   ```bash
   chmod +x AudioX-1.0.0.AppImage
   ./AudioX-1.0.0.AppImage
   ```
   *(Note: If running inside a container or VM without FUSE, run with `./AudioX-1.0.0.AppImage --no-sandbox --appimage-extract-and-run`)*
3. For **DEB**:
   ```bash
   sudo dpkg -i audiox_1.0.0_amd64.deb
   audiox
   ```
4. Perform the manual verification checklist below.

---

## 5. Acceptance Checklist

For any release on macOS, Windows, or Linux, verify:

- [ ] **Setup Flow**: First launch prompts for DeepFilterNet download; progresses with visible byte count; completes without admin rights.
- [ ] **Offline Operation**: Disconnect network after setup; verify audio still processes completely offline.
- [ ] **Input Formats**: Test at least one valid `.wav`, `.mp3`, `.m4a`, and `.flac`.
- [ ] **Presets**:
  - `Balanced`: Standard clean output.
  - `Light`: 70/30 blend with audible natural room ambience.
  - `Strong`: Aggressive post-filtering.
- [ ] **Loudness**: Output integrated loudness matches target (Natural: `-18 LUFS`, Loud: `-16 LUFS`) within ±1.0 LU tolerance, true-peak ceiling does not clip beyond `-1.5 dBTP`.
- [ ] **Player**: Original vs Cleaned toggle switches seamlessly at matching playhead timestamp.
- [ ] **Export**: Output saves to selected destination with correct extension. Source file remains unmodified.
- [ ] **Error Recovery**: Feed invalid or corrupt file; verify sanitized error message and functional **Copy Diagnostics** button.
