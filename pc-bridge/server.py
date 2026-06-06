# AURA PC Bridge — Laptop "Muscle" Server
# Runs locally on the laptop to offload heavy text processing and route API requests.

from http.server import HTTPServer, SimpleHTTPRequestHandler
import json
import os
import hashlib
import sys

# Ensure UTF-8 output formatting for Windows console hosts
try:
    if sys.stdout.encoding != 'utf-8':
        sys.stdout.reconfigure(encoding='utf-8')
except AttributeError:
    pass

PORT = 8765

class AuraBridgeHandler(SimpleHTTPRequestHandler):
    """
    HTTP server endpoint router communicating on the local Wi-Fi subnet.
    """
    
    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def do_POST(self):
        """Route incoming payload requests"""
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length).decode('utf-8')
        
        try:
            data = json.loads(body) if body else {}
        except json.JSONDecodeError:
            data = {}
        
        # Router map
        if self.path == '/api/process-text':
            self._handle_process_text(data)
        elif self.path == '/api/search':
            self._handle_search(data)
        elif self.path == '/api/health':
            self._handle_health()
        elif self.path == '/api/sync':
            self._handle_sync(data)
        elif self.path == '/api/claude':
            self._handle_claude(data)
        else:
            self._send_json(404, {"error": "Endpoint not found"})
    
    def do_GET(self):
        """Route simple status queries"""
        if self.path == '/api/health':
            self._handle_health()
        elif self.path == '/api/status':
            self._send_json(200, {
                "status": "online",
                "server": "AURA PC Bridge",
                "version": "1.1.0",
                "capabilities": ["text-processing", "keyword-indexing", "claude-proxy"]
            })
        else:
            self._send_json(200, {"message": "AURA PC Bridge is active"})
    
    def _handle_health(self):
        self._send_json(200, {
            "status": "healthy",
            "server": "AURA PC Bridge",
            "uptime": "active"
        })
    
    def _handle_process_text(self, data):
        """Break down notes into clean chunks and extract indices"""
        text = data.get('text', '')
        if not text:
            self._send_json(400, {"error": "No text provided"})
            return
        
        # Create 500-word overlap chunks
        chunks = self._chunk_text(text, chunk_size=500)
        keywords = self._extract_keywords(text)
        
        self._send_json(200, {
            "chunks": len(chunks),
            "keywords": keywords[:15],
            "text_hash": hashlib.md5(text.encode('utf-8')).hexdigest()[:8],
            "status": "success"
        })
    
    def _handle_search(self, data):
        """Run localized word search query"""
        query = data.get('query', '')
        self._send_json(200, {
            "query": query,
            "results": [
                {"text": f"Found matching context: {query}", "score": 0.9}
            ]
        })
    
    def _handle_sync(self, data):
        """Persist phone lectures locally on laptop"""
        lectures = data.get('lectures', [])
        print(f"[AURA Bridge] Syncing {len(lectures)} lecture(s) to laptop file storage...")
        
        # Optional: Save lectures as local txt files
        os.makedirs("synced_notes", exist_ok=True)
        for index, lect in enumerate(lectures):
            title = "".join(c for c in lect.get('title', 'lecture') if c.isalnum() or c in (' ', '_', '-')).strip()
            filename = f"synced_notes/{lect.get('id', index)}_{title}.txt"
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(f"Title: {lect.get('title')}\n")
                f.write(f"Date: {lect.get('date')}\n")
                f.write("=" * 40 + "\n")
                f.write(lect.get('transcript', ''))
                
        self._send_json(200, {
            "synced": len(lectures),
            "status": "success",
            "message": f"Successfully backed up {len(lectures)} lecture(s) on your laptop!"
        })

    def _handle_claude(self, data):
        """CORS-safe proxy to route Anthropic requests to Anthropic servers"""
        prompt = data.get('prompt', '')
        key = data.get('key', '')
        max_tokens = data.get('max_tokens', 1500)

        if not key:
            self._send_json(400, {"error": "API key missing."})
            return

        import urllib.request
        import urllib.error

        url = 'https://api.anthropic.com/v1/messages'
        headers = {
            'Content-Type': 'application/json',
            'x-api-key': key,
            'anthropic-version': '2023-06-01'
        }
        body = json.dumps({
            'model': 'claude-3-5-sonnet-20241022',
            'max_tokens': max_tokens,
            'messages': [{'role': 'user', 'content': prompt}]
        }).encode('utf-8')

        req = urllib.request.Request(url, data=body, headers=headers, method='POST')
        try:
            with urllib.request.urlopen(req) as response:
                res_data = json.loads(response.read().decode('utf-8'))
                text = res_data.get('content', [{}])[0].get('text', '')
                self._send_json(200, {"text": text})
        except urllib.error.HTTPError as e:
            err_body = e.read().decode('utf-8')
            try:
                err_json = json.loads(err_body)
                err_msg = err_json.get('error', {}).get('message', 'Anthropic API error.')
            except:
                err_msg = err_body
            self._send_json(e.code, {"error": err_msg})
        except Exception as e:
            self._send_json(500, {"error": str(e)})
            
    def _chunk_text(self, text, chunk_size=500):
        words = text.split()
        chunks = []
        for i in range(0, len(words), chunk_size - 50):
            chunk = ' '.join(words[i:i + chunk_size])
            if chunk:
                chunks.append(chunk)
        return chunks
    
    def _extract_keywords(self, text):
        words = text.lower().split()
        stop_words = {'the', 'is', 'at', 'which', 'and', 'a', 'an', 'in', 'on', 'to', 'for', 'of', 'with', 'it', 'this', 'that', 'are', 'was', 'were', 'be', 'been', 'has', 'have', 'had', 'do', 'does', 'did', 'but', 'or', 'not', 'so', 'if', 'then', 'than', 'too', 'very', 'can', 'will'}
        
        freq = {}
        for word in words:
            clean = ''.join(c for c in word if c.isalnum())
            if clean and len(clean) > 3 and clean not in stop_words:
                freq[clean] = freq.get(clean, 0) + 1
        
        sorted_freq = sorted(freq.items(), key=lambda x: x[1], reverse=True)
        return [w[0] for w in sorted_freq]

    def _send_json(self, status, data):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))
        
    def log_message(self, format, *args):
        # Override to log cleanly in UTF-8
        print(f"[AURA Bridge] {args[0]}")

def main():
    print("=" * 55)
    print("  AURA PC Bridge — Laptop Muscle Service")
    print("=" * 55)
    print(f"  Starting local server on http://0.0.0.0:{PORT}")
    print()
    print("  Sync, index, and proxy endpoints are ready.")
    print("=" * 55)
    
    server = HTTPServer(('0.0.0.0', PORT), AuraBridgeHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[AURA Bridge] Shutting down server...")
        server.server_close()

if __name__ == '__main__':
    main()
