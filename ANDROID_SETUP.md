# 📱 JERRY AI — Android Setup Guide

Control your Android phone from Jerry AI using ADB (Android Debug Bridge) and Tasker automation.

---

## Part 1: ADB Setup (PC → Android Control)

### Step 1: Enable USB Debugging on Android
1. Go to **Settings → About Phone**
2. Tap **Build Number** 7 times → Developer Mode enabled
3. Go to **Settings → Developer Options**
4. Enable **USB Debugging**

### Step 2: Install ADB on PC
1. Download [Android Platform Tools](https://developer.android.com/tools/releases/platform-tools)
2. Extract to `C:\adb\`
3. Add `C:\adb\` to your System PATH

### Step 3: Connect & Verify
```bash
adb devices
```
You should see your device listed.

### Step 4: Example ADB Commands
```bash
# Open YouTube on phone
adb shell am start -a android.intent.action.VIEW -d https://youtube.com

# Open WhatsApp
adb shell am start -n com.whatsapp/.Main

# Make a phone call
adb shell am start -a android.intent.action.CALL -d tel:1234567890

# Send notification
adb shell am broadcast -a android.intent.action.SEND -t text/plain --es android.intent.extra.TEXT "Hello from Jerry"

# Take screenshot on phone
adb shell screencap /sdcard/jerry_capture.png
adb pull /sdcard/jerry_capture.png .

# Open Settings
adb shell am start -a android.settings.SETTINGS

# Turn on flashlight
adb shell cmd statusbar expand-notifications
```

---

## Part 2: Tasker Automation (No Coding)

Tasker lets you automate anything on Android using voice triggers.

### Step 1: Install Apps
1. [Tasker](https://play.google.com/store/apps/details?id=net.dinglisch.android.taskerm) — Play Store
2. [AutoVoice](https://play.google.com/store/apps/details?id=com.joaomgcd.autovoice) — Plugin

### Step 2: Create a Voice Profile
1. Open **Tasker** → Profiles → **+**
2. Select **Event** → Plugin → **AutoVoice** → Recognized
3. Set a command, e.g. `open camera`
4. Link it to a **Task:**
   - **+** → App → Launch App → **Camera**
5. Done! Say "open camera" and it launches

### Step 3: More Tasker Ideas
| Voice Command | Tasker Action |
|---------------|---------------|
| "Call mom" | Make Phone Call |
| "Open camera" | Launch Camera App |
| "Battery status" | Say battery percentage |
| "WiFi on/off" | Toggle WiFi |
| "Read messages" | Read unread SMS aloud |
| "Navigate home" | Open Google Maps with home address |

---

## Part 3: Wireless ADB (No USB Cable)

```bash
# First connect via USB, then:
adb tcpip 5555
adb connect YOUR_PHONE_IP:5555
# Now disconnect USB cable — ADB works wirelessly!
```

Find your phone IP: **Settings → WiFi → tap connected network → IP address**

---

## Part 4: Integration with Jerry AI

Jerry AI's `jerry.py` already includes ADB command support. Use voice commands like:
- **"Open YouTube on phone"** → Sends ADB command to phone
- Add more in Settings → Custom Command Builder

Or add custom ADB commands in `jerry.py`:
```python
elif "open camera on phone" in command:
    os.system("adb shell am start -a android.media.action.IMAGE_CAPTURE")
    speak("Opening camera on your phone")
```

---

*Happy automating! 🤖📱*
