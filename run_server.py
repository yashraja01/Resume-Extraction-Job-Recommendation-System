import uvicorn
import os
import webbrowser
import threading
import time
from http.server import HTTPServer, SimpleHTTPRequestHandler
import socket

def find_free_port():
    """Find a free port to use for the frontend server."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('', 0))
        s.listen(1)
        port = s.getsockname()[1]
    return port

def run_frontend_server(port):
    """Run a simple HTTP server to serve the frontend files."""
    os.chdir('.')  # Ensure we're in the current directory
    
    class CORSHTTPRequestHandler(SimpleHTTPRequestHandler):
        def end_headers(self):
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', '*')
            super().end_headers()
    
    server = HTTPServer(('localhost', port), CORSHTTPRequestHandler)
    print(f"Frontend server running at http://localhost:{port}")
    server.serve_forever()

def main():
    # Start frontend server in a separate thread
    frontend_port = find_free_port()
    frontend_thread = threading.Thread(target=run_frontend_server, args=(frontend_port,), daemon=True)
    frontend_thread.start()
    
    # Give the frontend server a moment to start
    time.sleep(1)
    
    # Open the frontend in the browser
    webbrowser.open(f'http://localhost:{frontend_port}')
    
    print("Starting Resume Matcher...")
    print(f"Frontend: http://localhost:{frontend_port}")
    print("Backend API: http://localhost:8000")
    print("API Documentation: http://localhost:8000/docs")
    print("\nPress Ctrl+C to stop the servers")
    
    # Start the FastAPI backend
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )

if __name__ == "__main__":
    main() 
