import os
import json
import requests
from flask import Flask, Response, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app) # Isso permite que o site do Lovable fale com esse código

# Carrega o mapa que você extraiu
with open('mapa_manga_final.json', 'r') as f:
    mapa_dados = json.load(f)

# Rota para o Lovable saber quais são os capítulos
@app.route('/mapa_manga_final.json')
def get_mapa():
    return jsonify(mapa_dados)

# O Proxy que faz o cache da Cloudflare
@app.route('/cdn/<path:url>')
def proxy(url):
    target = "https://" + url
    headers = {
        "User-Agent": "Mozilla/5.0",
        "Referer": "https://mediocrescan.com/" # Engana o site original
    }
    try:
        r = requests.get(target, headers=headers, stream=True, timeout=10)
        # s-maxage=2592000 é o que manda a Cloudflare guardar por 30 dias
        headers_cache = {
            "Cache-Control": "public, max-age=2592000, s-maxage=2592000",
            "Access-Control-Allow-Origin": "*"
        }
        return Response(r.content, content_type=r.headers.get('Content-Type'), headers=headers_cache)
    except:
        return "Erro ao carregar imagem", 404

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)
  
