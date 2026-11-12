import os
import json
from http.server import BaseHTTPRequestHandler
import urllib.request

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8'))
            
            prompt = data.get('prompt', '')
            images = data.get('images', [])
            json_mode = data.get('json_mode', False)
            
            api_key = os.environ.get('GEMINI_API_KEY')
            if not api_key:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'success': False, 'error': '伺服器未設定 GEMINI_API_KEY'}).encode('utf-8'))
                return

            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
            
            parts = [{"text": prompt}]
            for img in images:
                base64_data = img.split(',')[1] if ',' in img else img
                parts.append({
                    "inline_data": {
                        "mime_type": "image/jpeg",
                        "data": base64_data
                    }
                })
            
            req_data = {"contents": [{"parts": parts}]}
            if json_mode:
                req_data["generationConfig"] = {"response_mime_type": "application/json"}
                
            req = urllib.request.Request(
                url,
                data=json.dumps(req_data).encode('utf-8'),
                headers={'Content-Type': 'application/json'},
                method='POST'
            )
            
            with urllib.request.urlopen(req) as response:
                result = json.loads(response.read().decode('utf-8'))
                text_res = result['candidates'][0]['content']['parts'][0]['text']
                final_data = json.loads(text_res) if json_mode else text_res
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'success': True, 'data': final_data}).encode('utf-8'))
                
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))
