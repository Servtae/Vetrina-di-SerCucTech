from http.server import SimpleHTTPRequestHandler, HTTPServer
import os

PORT = 8092
ROOT = os.path.dirname(os.path.abspath(__file__))

class Handler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        path = path.split('?')[0]
        path = path.split('#')[0]
        if path == "/":
            return os.path.join(ROOT, "index.html")
        return os.path.join(ROOT, path.lstrip("/"))

os.chdir(ROOT)
print("🔥 SerCucTech HUB ONLINE su porta", PORT)
HTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
