export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');
    const purge = url.searchParams.get('purge');

    if (!targetUrl) {
      return new Response("Proxy Ativo - Use ?url=https://...", { status: 200 });
    }

    // --- CACHE COM CHAVE SIMPLES (APENAS URL) ---
    const cache = caches.default;
    // Criar uma chave baseada APENAS na URL, sem headers
    const cacheKey = new Request(url.toString(), {
      method: 'GET',
      headers: {} // Sem headers na chave!
    });

    // Tentar servir do cache (a menos que seja purge)
    if (purge !== 'true') {
      const cachedResponse = await cache.match(cacheKey);
      if (cachedResponse) {
        // Adicionar header de debug
        const responseWithHeader = new Response(cachedResponse.body, cachedResponse);
        responseWithHeader.headers.set('X-Cache-Status', 'HIT');
        return responseWithHeader;
      }
    }

    // --- BUSCAR DO ORIGEM ---
    const cookieFromKV = await env.mangalivre_session.get("mangalivre_cookie");
    const MY_USER_AGENT = "Mozilla/5.0 (Android 13; Mobile; rv:128.0) Gecko/128.0 Firefox/128.0";
    const isImage = targetUrl.match(/\.(webp|jpg|jpeg|png|gif|avif)/i) || targetUrl.includes('storage');

    const headers = new Headers({
      "User-Agent": MY_USER_AGENT,
      "Accept": isImage ? "image/avif,image/webp,*/*" : "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "pt-BR,pt;q=0.8,en-US;q=0.5,en;q=0.3",
      "Referer": "https://mangalivre.tv/",
      "Origin": "https://mangalivre.tv",
      "DNT": "1"
    });

    if (cookieFromKV) {
      headers.set("Cookie", cookieFromKV);
    }

    try {
      const response = await fetch(targetUrl, { 
        method: 'GET', 
        headers: headers,
        redirect: "follow"
      });

      if (!response.ok) {
        return new Response(`Erro na origem: ${response.status}`, { status: response.status });
      }

      // --- PROCESSAR RESPOSTA PARA CACHE ---
      const proxyBase = `${url.origin}/?url=`;
      let finalResponse;

      if (isImage) {
        // Para imagens: manter binário, headers limpos
        const buffer = await response.arrayBuffer();
        const newHeaders = new Headers({
          'Content-Type': response.headers.get('Content-Type') || 'image/webp',
          'Cache-Control': 'public, max-age=7776000, immutable',
          'Access-Control-Allow-Origin': '*',
          'X-Cache-Status': 'MISS'
        });
        
        finalResponse = new Response(buffer, { 
          status: response.status,
          headers: newHeaders
        });
      } else {
        // Para HTML: reescrever URLs e adicionar script
        let body = await response.text();

        // Reescrever URLs das imagens
        body = body.replace(/(https?:\/\/aws\.r2d2storage\.com\/[^\s"']+)/gi, (match) => {
          return `${proxyBase}${encodeURIComponent(match)}`;
        });

        // Seu script sniper
        const cleanScript = `
          <script>
            (function() {
              const clearInterface = () => {
                const mangaContainer = document.querySelector('.reading-content') || document.querySelector('#manga-safe-wrapper');
                if (mangaContainer) {
                  document.body.innerHTML = '';
                  document.body.appendChild(mangaContainer);
                  document.body.style.backgroundColor = 'black';
                  document.body.style.margin = '0';
                  mangaContainer.style.display = 'block';
                  mangaContainer.style.margin = '0 auto';
                  mangaContainer.style.maxWidth = '1000px';
                  document.querySelectorAll('img').forEach(img => {
                     img.style.display = 'block'; 
                     img.style.width = '100%'; 
                     img.style.marginBottom = '10px';
                  });
                }
              };
              window.addEventListener('load', clearInterface);
              setTimeout(clearInterface, 500);
              setTimeout(clearInterface, 2000);
              setTimeout(clearInterface, 5000);
            })();
          </script>
          <style>
            body { background: black !important; margin:0 !important; }
            header, footer, .sidebar, .manga-discussion, .nav-links { display: none !important; }
          </style>
        `;
        
        body = body.replace('</head>', `${cleanScript}</head>`);
        
        const newHeaders = new Headers({
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=7776000, immutable',
          'Access-Control-Allow-Origin': '*',
          'X-Cache-Status': 'MISS'
        });
        
        finalResponse = new Response(body, { 
          status: response.status,
          headers: newHeaders
        });
      }

      // --- ARMAZENAR NO CACHE (IMPORTANTE: CLONAR) ---
      ctx.waitUntil(cache.put(cacheKey, finalResponse.clone()));

      return finalResponse;

    } catch (e) {
      return new Response(`Erro: ${e.message}`, { status: 500 });
    }
  }
};
