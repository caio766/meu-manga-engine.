export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');
    const purge = url.searchParams.get('purge');

    if (!targetUrl) {
      return new Response("Proxy Ativo - Use ?url=https://...", { status: 200 });
    }

    const cache = caches.default;
    const cacheKey = new Request(url.toString(), { method: 'GET', headers: {} });

    if (purge !== 'true') {
      const cachedResponse = await cache.match(cacheKey);
      if (cachedResponse) {
        const responseWithHeader = new Response(cachedResponse.body, cachedResponse);
        responseWithHeader.headers.set('X-Cache-Status', 'HIT');
        return responseWithHeader;
      }
    }

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

      const proxyBase = `${url.origin}/?url=`;
      let finalResponse;

      if (isImage) {
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
        let body = await response.text();
        
        // SUBSTITUIÇÃO MAIS AGRESSIVA - Procura em strings JSON também
        // Isso vai pegar URLs que estão em scripts JavaScript
        body = body.replace(/(["'])(https?:\/\/aws\.r2d2storage\.com\/[^\s"']+)(["'])/gi, (match, quote, url, quote2) => {
          return `${quote}${proxyBase}${encodeURIComponent(url)}${quote2}`;
        });
        
        // Também mantém a substituição normal para HTML
        body = body.replace(/(https?:\/\/aws\.r2d2storage\.com\/[^\s"']+)/gi, (match) => {
          return `${proxyBase}${encodeURIComponent(match)}`;
        });

        // NOVO SCRIPT SNIPER - Adaptado para sites dinâmicos
        const cleanScript = `
          <script>
            (function() {
              console.log('🚀 Sniper ativado - Site dinâmico detectado');
              
              // Função principal para limpar a interface
              function cleanInterface() {
                // Procurar pelo container principal (encontramos: main.flex-1)
                const mangaContainer = document.querySelector('main.flex-1') || 
                                       document.querySelector('.reading-content') || 
                                       document.querySelector('#manga-safe-wrapper') ||
                                       document.querySelector('[class*="manga"]') ||
                                       document.querySelector('[class*="chapter"]');
                
                if (mangaContainer) {
                  console.log('✅ Container encontrado:', mangaContainer.className);
                  
                  // Verificar se já tem imagens
                  const imagens = mangaContainer.querySelectorAll('img');
                  console.log('📸 Imagens no container:', imagens.length);
                  
                  // Guardar o container
                  window.mangaContainer = mangaContainer;
                  
                  // Função para aplicar quando as imagens carregarem
                  function aplicarEstilo() {
                    if (!window.mangaContainer) return;
                    
                    // Clonar o container para preservar as imagens
                    const containerClone = window.mangaContainer.cloneNode(true);
                    
                    // Limpar o body e adicionar o clone
                    document.body.innerHTML = '';
                    document.body.appendChild(containerClone);
                    
                    // Estilizar
                    document.body.style.backgroundColor = 'black';
                    document.body.style.margin = '0';
                    containerClone.style.display = 'block';
                    containerClone.style.margin = '0 auto';
                    containerClone.style.maxWidth = '1000px';
                    
                    // Estilizar imagens
                    containerClone.querySelectorAll('img').forEach(img => {
                      img.style.display = 'block';
                      img.style.width = '100%';
                      img.style.height = 'auto';
                      img.style.marginBottom = '10px';
                    });
                    
                    console.log('✨ Interface limpa com sucesso!');
                  }
                  
                  // Tentar aplicar agora
                  aplicarEstilo();
                  
                  // Observar novas imagens
                  const observer = new MutationObserver(() => {
                    if (window.mangaContainer) {
                      aplicarEstilo();
                    }
                  });
                  
                  observer.observe(mangaContainer, {
                    childList: true,
                    subtree: true,
                    attributes: true,
                    attributeFilter: ['src']
                  });
                }
              }
              
              // Tentar várias vezes em momentos diferentes
              if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', cleanInterface);
              } else {
                cleanInterface();
              }
              
              // Tentar com intervalos progressivos
              setTimeout(cleanInterface, 1000);
              setTimeout(cleanInterface, 2000);
              setTimeout(cleanInterface, 3000);
              setTimeout(cleanInterface, 5000);
              setTimeout(cleanInterface, 8000);
              setTimeout(cleanInterface, 12000);
              
              // Também tentar quando a página completar
              window.addEventListener('load', cleanInterface);
              
              console.log('⏲️ Sniper configurado com múltiplas tentativas');
            })();
          </script>
          <style>
            body { background: black !important; margin: 0 !important; }
            header, footer, nav, aside, .sidebar, .comments, .ads { display: none !important; }
          </style>
        `;
        
        // Inserir o script no head
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

      ctx.waitUntil(cache.put(cacheKey, finalResponse.clone()));
      return finalResponse;

    } catch (e) {
      return new Response(`Erro: ${e.message}`, { status: 500 });
    }
  }
};
