/* ============================================
   JERRY AI — Frontend Application Logic
   Web Speech API + WebSocket + UI Controller
   ============================================ */

(() => {
  'use strict';

  // ─── Configuration ───
  const CONFIG = {
    wsUrl: localStorage.getItem('jerry_ws_url') || 'ws://127.0.0.1:8765',
    speechRate: parseInt(localStorage.getItem('jerry_speech_rate') || '170'),
    volume: parseInt(localStorage.getItem('jerry_volume') || '80'),
    wakeWord: localStorage.getItem('jerry_wake_word') || 'Hey Jerry',
    accentColor: localStorage.getItem('jerry_accent') || 'cyan',
  };

  let ws = null;
  let isListening = false;
  let recognition = null;
  let synthVoices = [];

  // ─── Initialize on DOM Ready ───
  document.addEventListener('DOMContentLoaded', () => {
    // Theme setup
    if (localStorage.getItem('jerry_theme') === 'light') {
      document.body.classList.add('light-theme');
    }

    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => {
        synthVoices = window.speechSynthesis.getVoices();
      };
      synthVoices = window.speechSynthesis.getVoices();
    }

    initWaveform();
    initVoiceButton();
    initQuickActions();
    initCommandsPage();
    initSettingsPage();
    initToggles();
    tryWebSocketConnect();
    applyAccentColor(CONFIG.accentColor);
    registerServiceWorker();
    initInstallPrompt();
  });

  // ============================================
  //  PWA SERVICE WORKER & INSTALL
  // ============================================

  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js')
        .then((reg) => {
          console.log('[Jerry] Service Worker registered, scope:', reg.scope);
        })
        .catch((err) => {
          console.log('[Jerry] SW registration failed:', err);
        });
    }
  }

  let deferredInstallPrompt = null;

  function initInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;
      showInstallBanner();
    });

    window.addEventListener('appinstalled', () => {
      console.log('[Jerry] App installed!');
      hideInstallBanner();
      deferredInstallPrompt = null;
    });
  }

  function showInstallBanner() {
    // Don't show if already dismissed
    if (localStorage.getItem('jerry_install_dismissed') === 'true') return;

    let banner = document.getElementById('pwa-install-banner');
    if (banner) { banner.style.display = 'flex'; return; }

    banner = document.createElement('div');
    banner.id = 'pwa-install-banner';
    banner.style.cssText = `
      position: fixed; top: 70px; left: 50%; transform: translateX(-50%);
      z-index: 150; display: flex; align-items: center; gap: 16px;
      padding: 14px 24px; border-radius: 12px;
      background: rgba(10, 22, 40, 0.95); border: 1px solid rgba(0, 242, 255, 0.3);
      backdrop-filter: blur(20px); box-shadow: 0 0 30px rgba(0, 242, 255, 0.15);
      font-family: 'Rajdhani', sans-serif; color: #e0f0ff;
      animation: fadeIn 0.5s ease;
    `;
    banner.innerHTML = `
      <span style="font-size:1.5rem;">📲</span>
      <div>
        <div style="font-family:'Orbitron',monospace;font-size:0.7rem;font-weight:700;letter-spacing:2px;color:#00f2ff;text-transform:uppercase;">Install Jerry AI</div>
        <div style="font-size:0.85rem;color:#8ba4c0;">Add to home screen for app experience</div>
      </div>
      <button id="pwa-install-btn" style="
        padding:8px 20px; border-radius:6px; border:1px solid #00f2ff;
        background:rgba(0,242,255,0.1); color:#00f2ff;
        font-family:'Share Tech Mono',monospace; font-size:0.75rem;
        letter-spacing:1px; cursor:pointer; text-transform:uppercase;
        transition: all 0.2s ease;
      ">Install</button>
      <button id="pwa-dismiss-btn" style="
        background:none; border:none; color:#4a6a8a; font-size:1.2rem;
        cursor:pointer; padding:4px 8px;
      ">✕</button>
    `;
    document.body.appendChild(banner);

    document.getElementById('pwa-install-btn').addEventListener('click', async () => {
      if (!deferredInstallPrompt) return;
      deferredInstallPrompt.prompt();
      const result = await deferredInstallPrompt.userChoice;
      if (result.outcome === 'accepted') {
        console.log('[Jerry] Install accepted');
      }
      deferredInstallPrompt = null;
      hideInstallBanner();
    });

    document.getElementById('pwa-dismiss-btn').addEventListener('click', () => {
      hideInstallBanner();
      localStorage.setItem('jerry_install_dismissed', 'true');
    });
  }

  function hideInstallBanner() {
    const banner = document.getElementById('pwa-install-banner');
    if (banner) banner.style.display = 'none';
  }

  // ============================================
  //  WAVEFORM VISUALIZER
  // ============================================

  function initWaveform() {
    const container = document.getElementById('waveform');
    if (!container) return;

    const barCount = 32;
    for (let i = 0; i < barCount; i++) {
      const bar = document.createElement('div');
      bar.classList.add('waveform-bar');
      bar.style.setProperty('--wave-height', `${8 + Math.random() * 25}px`);
      bar.style.animationDelay = `${(i * 0.05).toFixed(2)}s`;
      container.appendChild(bar);
    }
  }

  function setWaveformActive(active) {
    const bars = document.querySelectorAll('.waveform-bar');
    bars.forEach(bar => {
      if (active) {
        bar.classList.add('active');
        bar.style.setProperty('--wave-height', `${10 + Math.random() * 35}px`);
      } else {
        bar.classList.remove('active');
      }
    });
  }

  // ============================================
  //  VOICE RECOGNITION (Web Speech API)
  // ============================================

  function initVoiceButton() {
    const btn = document.getElementById('voice-btn');
    if (!btn) return;

    btn.addEventListener('click', toggleListening);

    // Initialize Web Speech API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        updateVoiceStatus(`"${transcript}"`);

        if (event.results[event.resultIndex].isFinal) {
          processCommand(transcript.toLowerCase());
        }
      };

      recognition.onend = () => {
        stopListening();
      };

      recognition.onerror = (event) => {
        console.error('Speech error:', event.error);
        updateVoiceStatus('Error — Try again');
        stopListening();
      };
    } else {
      btn.querySelector('.btn-label').textContent = 'Not supported';
      btn.disabled = true;
    }
  }

  function toggleListening() {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }

  function startListening() {
    if (!recognition) return;
    isListening = true;
    const btn = document.getElementById('voice-btn');
    if (btn) btn.classList.add('listening');
    updateVoiceStatus('Listening...');
    setWaveformActive(true);

    try {
      recognition.start();
    } catch (e) {
      // Already started
    }
  }

  function stopListening() {
    isListening = false;
    const btn = document.getElementById('voice-btn');
    if (btn) btn.classList.remove('listening');
    setWaveformActive(false);

    try {
      recognition.stop();
    } catch (e) {
      // Already stopped
    }

    setTimeout(() => {
      updateVoiceStatus('Awaiting command');
    }, 2000);
  }

  function updateVoiceStatus(text) {
    const el = document.getElementById('voice-status');
    if (el) {
      el.textContent = text;
      el.classList.toggle('active', text === 'Listening...');
    }
  }

  // ============================================
  //  COMMAND PROCESSING
  // ============================================

  function processCommand(cmd) {
    addChatBubble(cmd, 'user');

    let response = '';

    if (cmd.includes('open youtube') || cmd.includes('youtube')) {
      response = 'Opening YouTube for you! 🎬';
      window.open('https://youtube.com', '_blank');
    } else if (cmd.includes('open google') || cmd.includes('google')) {
      response = 'Opening Google! 🔍';
      window.open('https://google.com', '_blank');
    } else if (cmd.includes('whatsapp')) {
      response = 'Opening WhatsApp Web! 💬';
      window.open('https://web.whatsapp.com', '_blank');
    } else if (cmd.includes('music') || cmd.includes('spotify')) {
      response = 'Playing music! 🎵';
      window.open('https://open.spotify.com', '_blank');
    } else if (cmd.includes('weather')) {
      response = 'Checking weather conditions! 🌤️';
      window.open('https://weather.google.com', '_blank');
    } else if (cmd.includes('netflix')) {
      response = 'Opening Netflix! 🎬';
      window.open('https://netflix.com', '_blank');
    } else if (cmd.includes('pdf') || cmd.includes('make pdf')) {
      response = 'PDF creation command sent to backend! 📄';
      sendToBackend({ action: 'create_pdf' });
    } else if (cmd.includes('screenshot')) {
      response = 'Screenshot command sent to backend! 📸';
      sendToBackend({ action: 'screenshot' });
    } else if (cmd.includes('notepad') || cmd.includes('note')) {
      response = 'Opening Notepad! 📝';
      sendToBackend({ action: 'open_notepad' });
    } else if (cmd.includes('lock') || cmd.includes('lock screen')) {
      response = 'Locking screen! 🔒';
      sendToBackend({ action: 'lock_screen' });
    } else if (cmd.includes('stop jerry') || cmd.includes('goodbye')) {
      response = 'Goodbye! Shutting down... 👋';
      sendToBackend({ action: 'shutdown' });
    } else {
      response = `I heard: "${cmd}". Sending to backend for processing... 🤔`;
      sendToBackend({ action: 'custom', command: cmd });
    }

    if (response) {
      setTimeout(() => {
        addChatBubble(response, 'jerry');
        speak(response.replace(/[🎬🔍💬🎵🌤️📄📸📝🔒👋🤔]/g, ''));
      }, 500);
    }
  }

  // ============================================
  //  TEXT-TO-SPEECH (Browser API)
  // ============================================

  function speak(text) {
    if (!('speechSynthesis' in window)) return;

    // Stop any currently speaking audio first to prevent queue jams
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = CONFIG.speechRate / 170;
    utterance.volume = CONFIG.volume / 100;
    utterance.pitch = 1;

    if (synthVoices.length > 0) {
      // Find a natural English female voice, or fallback to the very first available voice
      let voice = synthVoices.find(v => v.name.includes('Zira') || v.name.includes('Female') || v.name.includes('Google UK English Female'));
      if (!voice) {
        voice = synthVoices.find(v => v.lang.startsWith('en')) || synthVoices[0];
      }
      utterance.voice = voice;
      console.log(`🗣️ Speaking using voice: ${voice.name}`);
    } else {
      console.warn("⚠️ No voices loaded yet in synthVoices array!");
    }

    utterance.onerror = (e) => console.error("Speech Synthesis Error:", e);

    speechSynthesis.speak(utterance);
  }

  // ============================================
  //  CHAT PANEL
  // ============================================

  function addChatBubble(text, sender) {
    const panel = document.getElementById('chat-panel');
    if (!panel) return;

    const bubble = document.createElement('div');
    bubble.classList.add('chat-bubble', sender);
    bubble.innerHTML = `
      <div class="bubble-label">${sender === 'jerry' ? 'Jerry' : 'You'}</div>
      ${sender === 'user' ? `"${text}"` : text}
    `;
    panel.appendChild(bubble);
    panel.scrollTop = panel.scrollHeight;
  }

  // ============================================
  //  QUICK ACTIONS (Dashboard)
  // ============================================

  function initQuickActions() {
    const cards = document.querySelectorAll('.action-card');
    cards.forEach(card => {
      card.addEventListener('click', () => {
        const action = card.dataset.action;
        // Trigger ripple effect
        card.style.transform = 'scale(0.95)';
        setTimeout(() => { card.style.transform = ''; }, 150);

        // Process action
        const actionMap = {
          'open-youtube': () => { window.open('https://youtube.com', '_blank'); addChatBubble('Opening YouTube', 'jerry'); },
          'open-google': () => { window.open('https://google.com', '_blank'); addChatBubble('Opening Google', 'jerry'); },
          'create-pdf': () => { sendToBackend({ action: 'create_pdf' }); addChatBubble('Creating PDF via backend...', 'jerry'); },
          'send-whatsapp': () => { window.open('https://web.whatsapp.com', '_blank'); addChatBubble('Opening WhatsApp', 'jerry'); },
          'play-music': () => { window.open('https://open.spotify.com', '_blank'); addChatBubble('Playing music', 'jerry'); },
          'weather': () => { window.open('https://weather.google.com', '_blank'); addChatBubble('Checking weather', 'jerry'); },
          'screenshot': () => { sendToBackend({ action: 'screenshot' }); addChatBubble('Taking screenshot...', 'jerry'); },
          'notepad': () => { sendToBackend({ action: 'open_notepad' }); addChatBubble('Opening Notepad', 'jerry'); },
        };

        if (actionMap[action]) actionMap[action]();
      });
    });
  }

  // ============================================
  //  COMMANDS PAGE
  // ============================================

  function initCommandsPage() {
    // Category filter tabs
    const tabs = document.querySelectorAll('.tab-pill');
    const cards = document.querySelectorAll('.command-card');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const cat = tab.dataset.cat;

        cards.forEach(card => {
          if (cat === 'all' || card.dataset.category === cat) {
            card.style.display = '';
            card.style.animation = 'fadeIn 0.4s ease forwards';
          } else {
            card.style.display = 'none';
          }
        });
      });
    });

    // Search filter
    const searchInput = document.getElementById('cmd-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        cards.forEach(card => {
          const name = card.querySelector('.command-name');
          const trigger = card.querySelector('.command-trigger');
          const text = (name?.textContent || '') + ' ' + (trigger?.textContent || '');
          card.style.display = text.toLowerCase().includes(query) ? '' : 'none';
        });
      });
    }

    // FAB (Add command)
    const fab = document.getElementById('fab-add');
    if (fab) {
      fab.addEventListener('click', () => {
        const modal = document.getElementById('add-cmd-modal');
        if (modal) modal.style.display = 'flex';
      });
    }
  }

  // Add custom command
  window.addCustomCommand = function () {
    const name = document.getElementById('new-cmd-name')?.value;
    const trigger = document.getElementById('new-cmd-trigger')?.value;
    const category = document.getElementById('new-cmd-category')?.value;

    if (!name || !trigger) {
      alert('Please fill in all fields');
      return;
    }

    const grid = document.getElementById('command-grid');
    if (grid) {
      const card = document.createElement('div');
      card.classList.add('command-card', 'glass', 'hud-frame');
      card.dataset.category = category;
      card.innerHTML = `
        <div class="command-card-header">
          <div class="cmd-icon">⭐</div>
          <div class="toggle-switch on"></div>
        </div>
        <div class="command-name">${name}</div>
        <div class="command-trigger">"${trigger}"</div>
      `;
      card.style.animation = 'fadeIn 0.5s ease';
      grid.appendChild(card);
    }

    // Close modal & clear inputs
    document.getElementById('add-cmd-modal').style.display = 'none';
    document.getElementById('new-cmd-name').value = '';
    document.getElementById('new-cmd-trigger').value = '';
  };

  // ============================================
  //  SETTINGS PAGE
  // ============================================

  function initSettingsPage() {
    // Theme Toggle
    const themeToggle = document.getElementById('theme-toggle');
    const themeLabel = document.getElementById('theme-label');
    const isLight = localStorage.getItem('jerry_theme') === 'light';

    if (themeToggle) {
      if (isLight) {
        themeToggle.classList.remove('on');
        if (themeLabel) themeLabel.textContent = 'Light';
      } else {
        themeToggle.classList.add('on');
        if (themeLabel) themeLabel.textContent = 'Dark';
      }

      themeToggle.addEventListener('click', () => {
        setTimeout(() => {
          const isNowDark = themeToggle.classList.contains('on');
          if (isNowDark) {
            document.body.classList.remove('light-theme');
            localStorage.setItem('jerry_theme', 'dark');
            if (themeLabel) themeLabel.textContent = 'Dark';
          } else {
            document.body.classList.add('light-theme');
            localStorage.setItem('jerry_theme', 'light');
            if (themeLabel) themeLabel.textContent = 'Light';
          }
        }, 10);
      });
    }

    // Speech rate slider
    const rateSlider = document.getElementById('speech-rate');
    const rateValue = document.getElementById('rate-value');
    if (rateSlider && rateValue) {
      rateSlider.value = CONFIG.speechRate;
      rateValue.textContent = CONFIG.speechRate;
      rateSlider.addEventListener('input', (e) => {
        rateValue.textContent = e.target.value;
      });
    }

    // Volume slider
    const volSlider = document.getElementById('volume');
    const volValue = document.getElementById('vol-value');
    if (volSlider && volValue) {
      volSlider.value = CONFIG.volume;
      volValue.textContent = CONFIG.volume + '%';
      volSlider.addEventListener('input', (e) => {
        volValue.textContent = e.target.value + '%';
      });
    }

    // Color picker
    const dots = document.querySelectorAll('.color-dot');
    dots.forEach(dot => {
      if (dot.dataset.color === CONFIG.accentColor) {
        dots.forEach(d => d.classList.remove('selected'));
        dot.classList.add('selected');
      }
      dot.addEventListener('click', () => {
        dots.forEach(d => d.classList.remove('selected'));
        dot.classList.add('selected');
        applyAccentColor(dot.dataset.color);
      });
    });

    // Populate microphone devices
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then(devices => {
        const micSelect = document.getElementById('mic-input');
        if (!micSelect) return;

        const mics = devices.filter(d => d.kind === 'audioinput');
        micSelect.innerHTML = '';
        mics.forEach((mic, i) => {
          const opt = document.createElement('option');
          opt.value = mic.deviceId;
          opt.textContent = mic.label || `Microphone ${i + 1}`;
          micSelect.appendChild(opt);
        });
      }).catch(() => { });
    }
  }

  // Save all settings
  window.saveAllSettings = function () {
    const rate = document.getElementById('speech-rate')?.value || '170';
    const vol = document.getElementById('volume')?.value || '80';
    const wake = document.getElementById('wake-word')?.value || 'Hey Jerry';
    const wsUrl = document.getElementById('ws-server')?.value || 'ws://127.0.0.1:8765';

    const selectedColor = document.querySelector('.color-dot.selected');
    const accent = selectedColor?.dataset.color || 'cyan';

    localStorage.setItem('jerry_speech_rate', rate);
    localStorage.setItem('jerry_volume', vol);
    localStorage.setItem('jerry_wake_word', wake);
    localStorage.setItem('jerry_ws_url', wsUrl);
    localStorage.setItem('jerry_accent', accent);

    // Visual feedback
    const btn = document.getElementById('save-settings');
    if (btn) {
      const original = btn.textContent;
      btn.textContent = '✓ Settings Saved!';
      btn.style.borderColor = 'var(--green)';
      btn.style.color = 'var(--green)';
      setTimeout(() => {
        btn.textContent = original;
        btn.style.borderColor = '';
        btn.style.color = '';
      }, 2000);
    }

    speak('Settings saved successfully');
  };

  // Save custom command from settings page
  window.saveCustomCommand = function () {
    const trigger = document.getElementById('custom-trigger')?.value;
    const action = document.getElementById('custom-action')?.value;
    if (!trigger || !action) {
      alert('Please fill in trigger phrase and action');
      return;
    }

    // Save to localStorage
    const customs = JSON.parse(localStorage.getItem('jerry_custom_commands') || '[]');
    customs.push({ trigger, action });
    localStorage.setItem('jerry_custom_commands', JSON.stringify(customs));

    // Send to backend
    sendToBackend({ action: 'add_custom_command', trigger, command: action });

    // Clear fields
    document.getElementById('custom-trigger').value = '';
    document.getElementById('custom-action').value = '';

    speak('Custom command added');
  };

  // ============================================
  //  ACCENT COLOR SYSTEM
  // ============================================

  function applyAccentColor(color) {
    const colors = {
      cyan: { main: '#00f2ff', glow: 'rgba(0,242,255,0.25)' },
      purple: { main: '#a855f7', glow: 'rgba(168,85,247,0.25)' },
      green: { main: '#00ff88', glow: 'rgba(0,255,136,0.25)' },
      orange: { main: '#ff8c00', glow: 'rgba(255,140,0,0.25)' },
    };

    const c = colors[color] || colors.cyan;
    document.documentElement.style.setProperty('--cyan', c.main);
    document.documentElement.style.setProperty('--cyan-glow', c.glow);
    document.documentElement.style.setProperty('--cyan-subtle', c.glow.replace('0.25', '0.08'));
    document.documentElement.style.setProperty('--border-default', c.glow.replace('0.25', '0.12'));
    document.documentElement.style.setProperty('--border-hover', c.glow.replace('0.25', '0.35'));
    document.documentElement.style.setProperty('--border-active', c.glow.replace('0.25', '0.6'));
  }

  // ============================================
  //  TOGGLE SWITCHES
  // ============================================

  function initToggles() {
    document.querySelectorAll('.toggle-switch').forEach(toggle => {
      toggle.addEventListener('click', () => {
        toggle.classList.toggle('on');
      });
    });
  }

  // ============================================
  //  WEBSOCKET CONNECTION
  // ============================================

  function tryWebSocketConnect() {
    try {
      ws = new WebSocket(CONFIG.wsUrl);

      ws.onopen = () => {
        console.log('[Jerry] WebSocket connected');
        updateADBStatus(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.response) {
            addChatBubble(data.response, 'jerry');
            speak(data.response);
          }
        } catch (e) {
          console.error('[Jerry] WS parse error:', e);
        }
      };

      ws.onclose = () => {
        console.log('[Jerry] WebSocket disconnected');
        updateADBStatus(false);
        // Auto-reconnect after 5s
        setTimeout(tryWebSocketConnect, 5000);
      };

      ws.onerror = () => {
        console.log('[Jerry] WebSocket not available — running in standalone mode');
      };
    } catch (e) {
      console.log('[Jerry] Running in standalone mode (no backend)');
    }
  }

  function sendToBackend(data) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    } else {
      console.log('[Jerry] Backend not connected. Command:', data);
      addChatBubble('⚠️ Backend not connected. Start the Python server to enable this command.', 'jerry');
    }
  }

  function updateADBStatus(connected) {
    const el = document.getElementById('adb-status');
    if (el) {
      el.className = `adb-status ${connected ? 'connected' : 'disconnected'}`;
      el.innerHTML = connected
        ? '<span>✓ Connected to Backend</span>'
        : '<span>⊘ Not Connected</span>';
    }
  }

  // ============================================
  //  ABOUT MODAL
  // ============================================

  window.showAbout = function () {
    const modal = document.getElementById('about-modal');
    if (modal) modal.style.display = 'flex';
  };

  window.closeAbout = function () {
    const modal = document.getElementById('about-modal');
    if (modal) modal.style.display = 'none';
  };

})();
