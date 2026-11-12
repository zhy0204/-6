import os
from flask import Flask, request, jsonify
import urllib.request
import json

app = Flask(__name__)

@app.route('/api/gemini', methods=['POST'])
def gemini_proxy():
    try:
        data = request.get_json() or {}
        prompt = data.get('prompt', '')
        images = data.get('images', [])
        json_mode = data.get('json_mode', False)
        
        api_key = os.environ.get('GEMINI_API_KEY')
        if not api_key:
            return jsonify({'success': False, 'error': '伺服器未設定 GEMINI_API_KEY'}), 500

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
            return jsonify({'success': True, 'data': final_data})
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# 支援 Vercel 執行
def handler(request, response):
    return app(request, response)
