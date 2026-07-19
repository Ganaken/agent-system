import os, subprocess, threading
from http.server import HTTPServer, BaseHTTPRequestHandler

# Simple listener: CRM button POSTs here -> we run run-revisions.py
# Protected by a secret token so only the CRM can trigger it.

SECRET = os.environ.get("REVISION_SECRET", "changeme")
SCRIPT = os.path.expanduser("~/agents/poster/run-revisions.py")
PYTHON = os.path.expanduser("~/agents/poster/venv/bin/python")

running = threading.Lock()

def run_revisions():
    with running:
        subprocess.run([PYTHON, SCRIPT])

class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path != f"/revise/{SECRET}":
            self.send_response(404); self.end_headers(); return
        if running.locked():
            self.send_response(200); self.end_headers()
            self.wfile.write(b'{"status":"already_running"}')
            return
        threading.Thread(target=run_revisions, daemon=True).start()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(b'{"status":"started"}')

    def log_message(self, *a):
        pass

if __name__ == "__main__":
    print("Revision listener on port 8787")
    HTTPServer(("0.0.0.0", 8787), Handler).serve_forever()
