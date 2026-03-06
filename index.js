export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');
    if (!targetUrl) return new Response("Proxy Sniper Ativo.", { status: 200 });

    const cache = caches.default;
    const cacheKey = new Request(url.toString(), request);
    
    // Tenta buscar no cache da Cloudflare
    let cachedResponse = await cache.match(cacheKey);
    if (cachedResponse) return cachedResponse;

    const MY_USER_AGENT = "Mozilla/5.0 (Android 13; Mobile; rv:128.0) Gecko/128.0 Firefox/128.0";
    const isImage = targetUrl.match(/\.(webp|jpg|jpeg|png|gif|avif)/i) || targetUrl.includes('storage');

    const headers = new Headers({
      "User-Agent": MY_USER_AGENT,
      "Referer": "https://mangalivre.tv/",
      "Origin": "https://mangalivre.tv"
    });

    const cookieFromKV = await env.mangalivre_session.get("mangalivre_cookie");
    if (cookieFromKV) headers.set("Cookie", cookieFromKV);

    try {
      const response = await fetch(targetUrl, { method: "GET", headers });

      // Criamos novos cabeçalhos DO ZERO para garantir que o max-age=0 suma
      let newHeaders = new Headers();
      newHeaders.set("Access-Control-Allow-Origin", "*");
      newHeaders.set("Content-Type", response.headers.get("Content-Type") || (isImage ? "image/jpeg" : "text/html"));
      
      // --- AQUI NÓS MATAMOS O DYNAMIC ---
      // Forçamos 90 dias (7776000 segundos) e removemos o que o Mangalivre mandou
      newHeaders.set("Cache-Control", "public, max-age=7776000, s-maxage=7776000, immutable");

      let finalResponse;
      if (isImage) {
        const buffer = await response.arrayBuffer();
        finalResponse = new Response(buffer, { status: 200, headers: newHeaders });
      } else {
        let body = await response.text();
        const proxyBase = `${url.origin}/?url=`;
        body = body.replace(/(https?:\/\/aws\.r2d2storage\.com\/[^\s"']+)/gi, (m) => `${proxyBase}${encodeURIComponent(m)}`);

        // Seu script Sniper (simplificado para não bugar)
        const sniper = `<script>
          window.addEventListener('load', () => {
            const c = document.querySelector('.reading-content') || document.querySelector('#manga-safe-wrapper');
            if(c) { document.body.innerHTML = ''; document.body.appendChild(c); document.body.style.background='black'; }
          });
        </script><style>body{background:black!important} header,footer,.sidebar{display:none!important}</style>`;
        
        body = body.replace('</head>', `${sniper}</head>`);
        finalResponse = new Response(body, { status: 200, headers: newHeaders });
      }

      // Salva a resposta "limpa" e com 90 dias no cache
      ctx.waitUntil(cache.put(cacheKey, finalResponse.clone()));
      return finalResponse;

    } catch (e) {
      return new Response("Erro: " + e.message, { status: 500 });
    }
  }
};
