"""
JERRY AI — Core Voice Assistant Engine
Handles speech recognition, text-to-speech, and command execution.
"""

try:
    import speech_recognition as sr
    HAS_SPEECH_RECOGNITION = True
except ImportError:
    HAS_SPEECH_RECOGNITION = False
import pyttsx3
import pywhatkit
import sys
import json
from datetime import datetime
import os
import requests
import queue
import threading
import os
import requests

try:
    from dotenv import load_dotenv
    # Load API keys from .env
    load_dotenv()
    hf_token = os.getenv("HUGGINGFACE_TOKEN")
    if hf_token and hf_token != "your_free_hf_token_here":
        # Free API inference model
        HF_API_URL = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2"
        HF_HEADERS = {"Authorization": f"Bearer {hf_token}"}
    else:
        HF_API_URL = None
        HF_HEADERS = None
except ImportError:
    HF_API_URL = None
    HF_HEADERS = None

# Fix Windows console emoji printing
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

try:
    from reportlab.pdfgen import canvas
    HAS_REPORTLAB = True
except ImportError:
    HAS_REPORTLAB = False

try:
    import pyautogui
    HAS_PYAUTOGUI = True
except ImportError:
    HAS_PYAUTOGUI = False


class JerryAI:
    """Core Jerry AI assistant engine."""

    def __init__(self):
        # Text-to-Speech engine
        self.engine = pyttsx3.init()
        self.engine.setProperty('rate', 170)
        self.engine.setProperty('volume', 0.8)

        # Speech recognizer
        if HAS_SPEECH_RECOGNITION:
            self.recognizer = sr.Recognizer()
        else:
            self.recognizer = None

        # Custom commands store
        self.custom_commands = {}

        # Running state
        self.running = True

        # Thread-safe speech queue
        self._speech_queue = queue.Queue()
        self._speech_thread = threading.Thread(target=self._speech_worker, daemon=True)
        self._speech_thread.start()

        print("========================================")
        print("        JERRY AI - v1.0.0             ")
        print("   Your Personal Voice Assistant       ")
        print("========================================")
        print()

    def speak(self, text):
        """Queue text for speech conversion."""
        print(f"  🤖 Jerry: {text}")
        self._speech_queue.put(text)

    def _speech_worker(self):
        """Dedicated thread to process speech requests sequentially."""
        while self.running:
            try:
                # Wait for text to speak (blocking with timeout)
                text = self._speech_queue.get(timeout=1)
                if text:
                    self.engine.say(text)
                    self.engine.runAndWait()
                self._speech_queue.task_done()
            except queue.Empty:
                continue
            except Exception as e:
                print(f"  ❌ Speech Worker Error: {e}")
                # Reset engine on critical failure
                try:
                    self.engine = pyttsx3.init()
                    self.engine.setProperty('rate', 170)
                except:
                    pass

    def listen(self, background_mode=False):
        """Listen for voice commands via microphone."""
        if not HAS_SPEECH_RECOGNITION:
            print("  ⚠️ SpeechRecognition not installed. Web UI voice commands will still work.")
            return ""
            
        with sr.Microphone() as source:
            if not background_mode:
                print("  🎙️  Listening...")
            self.recognizer.adjust_for_ambient_noise(source, duration=0.5)
            try:
                # Shorter timeout for background listening so it loops faster
                timeout_val = 2 if background_mode else 5
                audio = self.recognizer.listen(source, timeout=timeout_val, phrase_time_limit=8)
                command = self.recognizer.recognize_google(audio).lower()
                
                if background_mode:
                    if "hey jerry" in command or "jerry" in command:
                        print(f"  🔔 Wake word detected! (Heard: '{command}')")
                        self.speak("Yes, boss?")
                        return "WAKE_WORD_DETECTED"
                    return "" # Ignore other chatter
                
                print(f"  👤 You: \"{command}\"")
                return command
            except sr.WaitTimeoutError:
                return ""
            except sr.UnknownValueError:
                return ""
            except sr.RequestError:
                print("  ⚠️  Speech recognition service unavailable")
                return ""

    def process_command(self, command):
        """
        Process a voice command and execute the action.
        Returns the response text.
        """
        if not command:
            return ""

        response = ""

        # ─── YouTube ───
        if "open youtube" in command or "play youtube" in command:
            response = "Opening YouTube"
            self.speak(response)
            pywhatkit.playonyt("youtube")

        # ─── Google ───
        elif "open google" in command:
            response = "Opening Google Chrome"
            self.speak(response)
            os.system("start chrome")

        # ─── WhatsApp ───
        elif "open whatsapp" in command:
            response = "Opening WhatsApp"
            self.speak(response)
            os.system("start chrome https://web.whatsapp.com")

        # ─── Create PDF ───
        elif "make pdf" in command or "create pdf" in command:
            if HAS_REPORTLAB:
                filename = f"jerry_created_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
                c = canvas.Canvas(filename)
                c.setFont("Helvetica-Bold", 20)
                c.drawString(100, 750, "PDF Created by Jerry AI")
                c.setFont("Helvetica", 12)
                c.drawString(100, 720, f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
                c.drawString(100, 700, "Your personal AI assistant at work!")
                c.save()
                response = f"PDF created successfully as {filename}"
            else:
                response = "PDF library not installed. Run: pip install reportlab"
            self.speak(response)

        # ─── Screenshot ───
        elif "screenshot" in command or "take screenshot" in command:
            if HAS_PYAUTOGUI:
                filename = f"jerry_screenshot_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
                pyautogui.screenshot(filename)
                response = f"Screenshot saved as {filename}"
            else:
                response = "Screenshot library not installed. Run: pip install pyautogui"
            self.speak(response)

        # ─── Notepad ───
        elif "open notepad" in command or "notepad" in command:
            response = "Opening Notepad"
            self.speak(response)
            os.system("start notepad")

        # ─── Calculator ───
        elif "open calculator" in command or "calculator" in command:
            response = "Opening Calculator"
            self.speak(response)
            os.system("start calc")

        # ─── Lock Screen ───
        elif "lock screen" in command or "lock" in command:
            response = "Locking screen"
            self.speak(response)
            os.system("rundll32.exe user32.dll,LockWorkStation")

        # ─── Play Music ───
        elif "play music" in command or "music" in command:
            response = "Opening Spotify"
            self.speak(response)
            os.system("start chrome https://open.spotify.com")

        # ─── Media Controls ───
        elif "volume up" in command or "increase volume" in command:
            if HAS_PYAUTOGUI:
                for _ in range(5): pyautogui.press("volumeup")
                response = "Volume increased"
            else:
                response = "PyAutoGUI not installed"
            self.speak(response)

        elif "volume down" in command or "decrease volume" in command:
            if HAS_PYAUTOGUI:
                for _ in range(5): pyautogui.press("volumedown")
                response = "Volume decreased"
            else:
                response = "PyAutoGUI not installed"
            self.speak(response)

        elif "mute" in command:
            if HAS_PYAUTOGUI:
                pyautogui.press("volumemute")
                response = "Muted"
            else:
                response = "PyAutoGUI not installed"
            self.speak(response)

        elif "pause" in command or "resume" in command or "play video" in command:
            if HAS_PYAUTOGUI:
                pyautogui.press("playpause")
                response = "Toggling playback"
            else:
                response = "PyAutoGUI not installed"
            self.speak(response)

        # ─── Netflix ───
        elif "open netflix" in command or "netflix" in command:
            response = "Opening Netflix"
            self.speak(response)
            os.system("start chrome https://netflix.com")

        # ─── Time ───
        elif "what time" in command or "time" in command:
            now = datetime.now().strftime("%I:%M %p")
            response = f"The current time is {now}"
            self.speak(response)

        # ─── Date ───
        elif "what date" in command or "date" in command:
            today = datetime.now().strftime("%B %d, %Y")
            response = f"Today's date is {today}"
            self.speak(response)

        # ─── Search ───
        elif "search for" in command:
            query = command.replace("search for", "").strip()
            response = f"Searching for {query}"
            self.speak(response)
            pywhatkit.search(query)

        # ─── Play on YouTube ───
        elif "play" in command:
            query = command.replace("play", "").strip()
            response = f"Playing {query} on YouTube"
            self.speak(response)
            pywhatkit.playonyt(query)

        # ─── ADB Android Commands ───
        elif "phone" in command and "youtube" in command:
            response = "Opening YouTube on your phone"
            self.speak(response)
            os.system("adb shell am start -a android.intent.action.VIEW -d https://youtube.com")

        elif "phone call" in command or "make a call" in command:
            response = "Opening phone dialer on Android"
            self.speak(response)
            os.system("adb shell am start -a android.intent.action.DIAL")

        elif "send whatsapp" in command or "whatsapp message" in command:
            response = "Opening WhatsApp on your Android phone"
            self.speak(response)
            os.system("adb shell am start -n com.whatsapp/.Main")
        elif command in self.custom_commands:
            action = self.custom_commands[command]
            response = f"Running custom command: {command}"
            self.speak(response)
            try:
                exec(action)
            except Exception as e:
                response = f"Error executing command: {e}"
                self.speak(response)

        # ─── Stop ───
        elif "stop jerry" in command or "goodbye" in command or "quit" in command:
            response = "Goodbye! Shutting down Jerry AI."
            self.speak(response)
            self.running = False

        else:
            # Fallback to Hugging Face Free API if connected
            if 'HF_API_URL' in globals() and HF_API_URL is not None:
                try:
                    self.speak("Thinking...")
                    print("  🧠 Sending query to AI...")
                    payload = {
                        "inputs": f"<s>[INST] You are Jerry, a highly advanced AI voice assistant. Keep your answer brief, conversational, and easy to speak out loud (under 2 sentences). User says: {command} [/INST]",
                        "parameters": {"max_new_tokens": 100, "temperature": 0.7}
                    }
                    response = requests.post(HF_API_URL, headers=HF_HEADERS, json=payload, timeout=10)
                    response.raise_for_status()
                    
                    # Extract generated text from HF return structure
                    result_raw = response.json()[0]['generated_text']
                    reply = result_raw.split("[/INST]")[1].strip()
                    
                    # Strip out asterisks or markdown so it reads cleanly
                    reply = reply.replace('*', '').replace('#', '').replace('"', '')
                    response_text = reply
                    self.speak(response_text)
                    return response_text
                except Exception as e:
                    print(f"  ❌ AI Error: {e}")
                    response_text = "I couldn't connect to my AI brain. Please check your free Hugging Face token."
                    self.speak(response_text)
                    return response_text
            else:
                response_text = f"I heard: {command}. My AI module is disconnected, so I don't know what to do."
                self.speak(response_text)
                return response_text

        return response

    def add_custom_command(self, trigger, action):
        """Add a custom voice command."""
        self.custom_commands[trigger.lower()] = action
        print(f"  ✅ Custom command added: '{trigger}'")

    def run_standalone(self):
        """Run Jerry in standalone voice mode (no web UI) with Wake Word."""
        self.speak("Jerry AI is online. Listening for wake word 'Hey Jerry'...")
        print("  ⏳ Background listening active. Say 'Hey Jerry' to wake me up.")

        while self.running:
            # 1. Background listening loop
            wake_status = self.listen(background_mode=True)
            
            # 2. If woken up, listen for the actual command
            if wake_status == "WAKE_WORD_DETECTED":
                command = self.listen(background_mode=False)
                if command:
                    self.process_command(command)
                else:
                    self.speak("I didn't catch that. Going back to sleep.")
                    print("  ⏳ Returning to background listening...")

        print("\n  Jerry AI shut down. Goodbye! 👋")


# ─── Standalone Execution ───
if __name__ == "__main__":
    if "--test" in sys.argv:
        print("✅ Jerry AI imports OK — all modules loaded")
        print(f"  - ReportLab: {'✅' if HAS_REPORTLAB else '❌ (pip install reportlab)'}")
        print(f"  - PyAutoGUI: {'✅' if HAS_PYAUTOGUI else '❌ (pip install pyautogui)'}")
        sys.exit(0)

    jerry = JerryAI()
    jerry.run_standalone()
