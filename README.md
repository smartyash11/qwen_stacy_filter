# 🕷️ Multiverse L-Frame AR (Spider-Gwen Era)

A browser-based real-time AR filter inspired by the viral Spider-Verse / Gwen Stacy hand-gesture transition.

Form an **L-shape with both hands** in front of your webcam to open a glowing neon multiverse portal that reveals your character counterpart seamlessly aligned with your real-time body movements, distance, and face!

---

## 🌟 Key Features

- **Real-Time Hand Gesture Portal**: Uses MediaPipe Hand Landmarker to detect L-shape framing between both hands.
- **Dynamic 1:1 Face & Body Distance Sync**: MediaPipe Face Landmarker tracks human proportion and scale. Move closer ➔ character zooms in; step back ➔ character zooms out.
- **Laptop vs Mobile Categorization**:
  - 💻 **Laptop / Widescreen Mode**: 16:9 Landscape wallpapers (1920×1080).
  - 📱 **Mobile Mode**: 9:16 Portrait wallpapers (1080×1920) for handheld smartphones.
- **Custom Filter Upload + Auto Color Theming**: Upload any photo — the app extracts dominant colors to dynamically re-theme the glowing neon borders, corner brackets, and particles!
- **📸 1-Click Snapshot Downloader**: Snap and download high-resolution PNG captures with a watermark and synthesized shutter sound.
- **Synthesized Audio Effects**: Uses Web Audio API for futuristic portal whooshes and camera clicks without extra audio downloads.
- **Privacy First**: 100% of camera processing occurs locally in the browser via WebAssembly and GPU acceleration. No video feeds or images are ever stored or uploaded to servers.

---

## 🚀 Quick Start Locally

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/gwen-multiverse-ar.git
cd gwen-multiverse-ar
```

### 2. Install dependencies
```bash
npm install
```

### 3. Run development server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in Chrome or Safari.

### 4. Build for production
```bash
npm run build
```

---

## ☁️ Deployment on Vercel

This project includes a pre-configured `vercel.json` file for 1-click zero-config deployment.

### Option A: Via GitHub (Recommended)
1. Push this repository to GitHub.
2. Go to [Vercel.com](https://vercel.com) and click **"Add New Project"**.
3. Import your GitHub repository.
4. Framework Preset will auto-detect as **Vite**.
5. Click **Deploy**!

### Option B: Via Vercel CLI
```bash
npm install -g vercel
vercel
```

---

## 🛠️ Tech Stack
- **React 18 + Vite + TypeScript**
- **MediaPipe Tasks Vision** (`@mediapipe/tasks-vision` 0.10.x)
- **HTML5 Canvas 2D / WebGL**
- **Web Audio API**
