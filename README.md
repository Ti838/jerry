# 🤖 JERRY AI — Personal Voice Assistant

> A full-featured AI voice assistant with a futuristic JARVIS-inspired HUD web interface.
> Built with Python + Web Speech API. Designed with Google Stitch.

![Jerry AI](https://img.shields.io/badge/Jerry_AI-v1.0.0-00f2ff?style=for-the-badge&labelColor=050a12)

---

## ✨ Features

- 🎙️ **Voice Commands** — Speak to control your PC
- 🌐 **Web Dashboard** — Futuristic glassmorphism HUD interface
- ⚡ **Quick Actions** — YouTube, Google, PDF, WhatsApp, Music & more
- 📱 **Android Control** — ADB bridge for phone automation
- 🎨 **Customizable** — Accent colors, voice settings, custom commands
- 🔊 **Text-to-Speech** — Jerry speaks back to you

---

## 🚀 Quick Start

### 1. Install Python Dependencies
```bash
pip install -r requirements.txt
```

### 2. Start Jerry AI Server
```bash
python server.py
```
This starts:
- 🌐 Web UI at `http://localhost:5000`
- 🔌 WebSocket at `ws://localhost:8765`

### 3. Open Dashboard
Your browser will auto-open. Or navigate to: `http://localhost:5000`

---

## 🎙️ Standalone Voice Mode (No Web UI)
```bash
python jerry.py
```

---

## 📋 Voice Commands

| Command | Action |
|---------|--------|
| "Open YouTube" | Opens YouTube |
| "Open Google" | Opens Chrome |
| "Create PDF" / "Make PDF" | Generates a timestamped PDF |
| "Take screenshot" | Captures screen |
| "Open Notepad" | Opens Notepad |
| "Play music" | Opens Spotify |
| "Open WhatsApp" | Opens WhatsApp Web |
| "Lock screen" | Locks Windows |
| "What time is it" | Speaks current time |
| "Search for [query]" | Google search |
| "Play [song name]" | Plays on YouTube |
| "Stop Jerry" / "Goodbye" | Shuts down |

---

## 📁 Project Structure

```
jerry/
├── index.html        # Dashboard (main page)
├── commands.html      # Commands browser
├── settings.html      # Settings panel
├── index.css          # Design system (JARVIS HUD theme)
├── app.js             # Frontend logic (Web Speech API)
├── jerry.py           # Python voice engine
├── server.py          # HTTP + WebSocket server
├── requirements.txt   # Python dependencies
├── README.md          # This file
└── ANDROID_SETUP.md   # Android automation guide
```

---

## 📱 Android Setup

See [ANDROID_SETUP.md](ANDROID_SETUP.md) for ADB commands and Tasker automation.

---

## 🛠️ Tech Stack

- **Frontend:** HTML, CSS, JavaScript (Vanilla)
- **Backend:** Python, pyttsx3, SpeechRecognition
- **Realtime:** WebSocket (websockets library)
- **Design:** Google Stitch
- **Voice:** Web Speech API + Python SpeechRecognition

---

*Designed with Google Stitch • Built with ❤️*
