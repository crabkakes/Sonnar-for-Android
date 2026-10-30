# Sonarr Mobile for Android

A sleek, mobile-optimized recreation of the **Sonarr** web interface built specifically for Android displays of all sizes. Built with React 19, TypeScript, Express, and Tailwind CSS.

---

## 📱 Features

- **Android-First Responsive Design**:
  - Engineered for one-handed thumb navigation on mobile phones (360px–430px) while scaling cleanly to foldables, tablets, and desktop displays.
  - Native Android status bar simulation with real-time clock, Wi-Fi, battery, and download notification badges.
  - Material 3 navigation drawer / bottom bar with live activity counters.
  - View switcher: **Poster Grid** (2–5 columns), **Banner Cards**, and **Compact List**.
  - Floating Action Button (FAB) for rapid show addition.

- **TV Series Management**:
  - Full collection view with season/episode completion progress meters (e.g. `14 / 18 episodes · 78%`).
  - Search & Add new series with instant lookup across TVDB/SkyHook.
  - Granular add configuration: Root Storage Folder, Quality Profile, Monitor status, Series Type (*Standard, Daily, Anime*), and automatic search triggers.
  - Expandable season accordions with video/audio codecs (`WEBRip-2160p HDR`, `1080p WEB-DL`, `HEVC`, `Atmos`).
  - Interactive Release Search: One-tap manual search to browse indexer releases and grab files directly into your download client.

- **Download Monitoring (Live Activity & History)**:
  - Live queue with animated striped progress bars, transfer speeds (e.g. `18.4 MB/s`), and ETA countdowns.
  - Interactive controls: Pause, resume, and remove downloads from the client.
  - Blocklist support: Option to blacklist bad release files upon cancellation to prevent unwanted re-grabs.
  - Complete history timeline of grabbed releases, imported episodes, and failed downloads.

- **Calendar & Airing Schedule**:
  - Horizontal week-view date carousel with indicators for days with scheduled broadcasts.
  - Air times formatted in the local device timezone.

- **Sonarr API & CORS Proxy**:
  - Connects to any Sonarr v3/v4 instance via Host URL and API Key.
  - Includes an Express backend proxy (`/api/sonarr/proxy`) to eliminate browser CORS restrictions when accessing local network IPs (`http://192.168.x.x:8989`).
  - Built-in **Demo Mode**: Pre-loaded with rich series, active downloads, and upcoming calendar episodes for immediate offline or pre-connection testing.

---

## 📥 How to Install the App on Android

You have two simple ways to test and install the app on your Android device:

### Option 1: Instant PWA Install (Recommended — Zero Build Steps)

The app is a fully compliant Progressive Web App (PWA). You can install it on your Android phone immediately without building an APK:

1. Open your deployed app URL on your Android device in **Google Chrome**, **Brave**, or **Samsung Internet**.
2. Tap the **"Install on Android"** button inside the app header or settings, or tap the browser's menu (**⋮** three dots).
3. Select **"Install app"** or **"Add to Home screen"**.
4. Confirm the installation.

**Result**: A dedicated Sonarr icon is added to your Android app drawer and home screen. The app opens in standalone full-screen mode without any browser address bar, running like a native Android app.

---

### Option 2: Build an Android APK (.apk)

#### A. Automated via GitHub Actions (CI/CD)
This repository includes a pre-configured workflow at `.github/workflows/build-apk.yml`.
When you push this repository to GitHub or create a release tag (e.g. `v1.0.0`), GitHub Actions will:
1. Build the web assets.
2. Package the app using Bubblewrap (Trusted Web Activity).
3. Generate the Android `.apk` and attach it as a downloadable release artifact on your GitHub repository page.

#### B. Build Locally using Bubblewrap CLI
You can compile a signed `.apk` on your development machine in under 2 minutes:

```bash
# 1. Install Bubblewrap CLI
npm install -g @bubblewrap/cli

# 2. Initialize from your deployed app URL or local manifest
bubblewrap init --manifest=https://<your-app-url>/manifest.json

# 3. Build the Android package
bubblewrap build
```

This will produce `app-release-signed.apk`, which you can install onto any connected Android phone via ADB:
```bash
adb install app-release-signed.apk
```

---

## ⚙️ Configuration & Connecting to Sonarr

1. Launch the app and navigate to the **System** tab in the bottom bar.
2. In the **Sonarr API Connection** panel:
   - **Host URL**: Enter your Sonarr address (e.g., `http://192.168.1.50:8989` or `https://sonarr.yourdomain.com`).
   - **API Key**: Enter your 32-character API key from Sonarr (*Settings > General > Security > API Key*).
   - **Backend Proxy**: Keep enabled if accessing an internal IP from a browser to prevent CORS issues.
3. Tap **Test Connection** to verify communication.
4. Tap **Save Settings** to switch from Demo mode to your live server.

---

## 🛠️ Local Development & Self-Hosting

### Requirements
- Node.js 20+

### Setup
```bash
# Clone the repository
git clone https://github.com/your-username/sonarr-android.git
cd sonarr-android

# Install dependencies
npm install

# Start the full-stack development server on port 3000
npm run dev
```

Visit `http://localhost:3000` in your browser.

### Production Build
```bash
# Compile client assets
npm run build

# Start the Node.js production server
npm start
```
