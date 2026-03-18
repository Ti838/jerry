"""
JERRY AI — Web Server + WebSocket Bridge
Serves the web UI and bridges commands between browser and Jerry AI engine.

Usage:
    python server.py
    Then open http://localhost:5000 in your browser.
"""

import asyncio
import json
import os
import sys
import threading
import webbrowser
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path

# Fix Windows console emoji printing
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

try:
    import websockets
    HAS_WEBSOCKETS = True
except ImportError:
    HAS_WEBSOCKETS = False
    print("⚠️  websockets not installed. Run: pip install websockets")

# Import Jerry AI engine
from jerry import JerryAI


# ─── HTTP Server (serves web UI) ───

class JerryHTTPHandler(SimpleHTTPRequestHandler):
    """Serve files from the jerry project directory."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(PROJECT_DIR), **kwargs)

    def log_message(self, format, *args):
        """Suppress default HTTP logs for cleaner output."""
        pass


def start_http_server(port=5000):
    """Start the HTTP server on the given port."""
    server = HTTPServer(('127.0.0.1', port), JerryHTTPHandler)
    print(f"  🌐 Web UI:       http://127.0.0.1:{port}")
    server.serve_forever()


# ─── WebSocket Server (bridges browser ↔ Jerry AI) ───

jerry_engine = None
connected_clients = set()


async def ws_handler(websocket):
    """Handle incoming WebSocket connections."""
    connected_clients.add(websocket)
    client_ip = websocket.remote_address[0] if websocket.remote_address else "unknown"
    print(f"  📡 Client connected: {client_ip}")

    try:
        async for message in websocket:
            print(f"  📥 Received message: {message}")
            try:
                data = json.loads(message)
                action = data.get('action', '')
                response = ""

                if action == 'create_pdf':
                    response = jerry_engine.process_command("create pdf")
                elif action == 'screenshot':
                    response = jerry_engine.process_command("take screenshot")
                elif action == 'open_notepad':
                    response = jerry_engine.process_command("open notepad")
                elif action == 'lock_screen':
                    response = jerry_engine.process_command("lock screen")
                elif action == 'shutdown':
                    response = "Jerry AI shutting down..."
                    jerry_engine.running = False
                elif action == 'add_custom_command':
                    trigger = data.get('trigger', '')
                    cmd = data.get('command', '')
                    jerry_engine.add_custom_command(trigger, cmd)
                    response = f"Custom command '{trigger}' added!"
                elif action == 'custom':
                    cmd = data.get('command', '')
                    response = jerry_engine.process_command(cmd)
                else:
                    response = f"Unknown action: {action}"

                await websocket.send(json.dumps({
                    "status": "ok",
                    "response": response
                }))

            except json.JSONDecodeError:
                await websocket.send(json.dumps({
                    "status": "error",
                    "response": "Invalid JSON"
                }))

    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        connected_clients.discard(websocket)
        print(f"  📡 Client disconnected: {client_ip}")


async def start_ws_server(port=8765):
    """Start the WebSocket server."""
    print(f"  🔌 WebSocket:    ws://127.0.0.1:{port}")
    async with websockets.serve(ws_handler, "127.0.0.1", port):
        await asyncio.Future()  # Run forever


# ─── Main ───

PROJECT_DIR = Path(__file__).parent


def main():
    global jerry_engine

    print()
    print("========================================")
    print("     JERRY AI - Server v1.0.0         ")
    print("   Web UI + Voice Assistant Engine     ")
    print("========================================")
    print()

    # Initialize Jerry AI engine (without standalone voice loop)
    jerry_engine = JerryAI()

    http_port = 5000
    ws_port = 8765

    # Start HTTP server in a separate thread
    http_thread = threading.Thread(target=start_http_server, args=(http_port,), daemon=True)
    http_thread.start()

    # Start the Voice Assistant (Wake Word detection) in a background thread
    # This allows 'Hey Jerry' to work even if you are using the Website
    print("  🎙️  Starting Voice Assistant Background Thread...")
    voice_thread = threading.Thread(target=jerry_engine.run_standalone, daemon=True)
    voice_thread.start()

    print()
    print("  ✅ Jerry AI server is running!")
    print(f"  👉 Open http://localhost:{http_port} in your browser")
    print("  Press Ctrl+C to stop")
    print()

    # Auto-open browser
    webbrowser.open(f"http://localhost:{http_port}")

    # Start WebSocket server (blocks main thread)
    if HAS_WEBSOCKETS:
        try:
            asyncio.run(start_ws_server(ws_port))
        except KeyboardInterrupt:
            print("\n  Jerry AI server stopped. Goodbye! 👋")
    else:
        print("  ⚠️  WebSocket disabled (install websockets: pip install websockets)")
        print("  Running HTTP-only mode. Voice features limited to browser-only.")
        try:
            while True:
                input()
        except KeyboardInterrupt:
            print("\n  Jerry AI server stopped. Goodbye! 👋")


if __name__ == "__main__":
    main()
