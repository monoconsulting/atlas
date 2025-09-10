#!/usr/bin/env python3
"""
Simple HTTP server for TaskMasterWeb development hub.
Serves static files from the web directory on port 9652.
"""

import http.server
import socketserver
import os
from pathlib import Path

PORT = 9652
DIRECTORY = Path(__file__).parent

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
    
    def end_headers(self):
        # Add CORS headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

def main():
    with socketserver.TCPServer(("", PORT), CustomHTTPRequestHandler) as httpd:
        print(f"TaskMasterWeb Development Hub")
        print(f"Serving at http://localhost:{PORT}")
        print(f"Directory: {DIRECTORY}")
        print(f"Main App: http://localhost:8199")
        print("\n--- Available Pages ---")
        print(f"• Home: http://localhost:{PORT}/")
        print(f"• Test Results: http://localhost:{PORT}/test-results.html")
        print("\nPress Ctrl+C to stop the server")
        print("-" * 50)
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n\nServer stopped by user")

if __name__ == "__main__":
    main()