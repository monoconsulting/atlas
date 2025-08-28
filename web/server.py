#!/usr/bin/env python3
"""
Development web server for TaskMaster Web project.
Serves static files and test reports on port 9652.
"""

import os
import http.server
import socketserver
from pathlib import Path

# Configuration
PORT = 9652
DIRECTORY = Path(__file__).parent

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIRECTORY), **kwargs)
    
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def log_message(self, format, *args):
        print(f"[{self.log_date_time_string()}] {format % args}")

def main():
    print(f"Starting development server...")
    print(f"Directory: {DIRECTORY}")
    print(f"Port: {PORT}")
    
    # Change to the web directory
    os.chdir(DIRECTORY)
    
    # Create server
    with socketserver.TCPServer(("", PORT), CustomHTTPRequestHandler) as httpd:
        print(f"Server running at http://localhost:{PORT}")
        print(f"Test Results: http://localhost:{PORT}/test-results.html")
        print(f"Admin Panel: http://localhost:{PORT}/admin.html")
        print("Press Ctrl+C to stop the server")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")

if __name__ == "__main__":
    main()