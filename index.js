export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');
    const mangaId = url.searchParams.get('manga');
    
    if (!targetUrl) {
      return new Response("Erro: Use ?url=LINK", { status: 400 });
    }

    const cookieFromKV = await env.mangalivre_session.get("mangalivre_cookie");
    const MY_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

    // Detectores de tipo de conteúdo
    const isImage = targetUrl.match(/\.(webp|jpg|jpeg|png|gif|avif|bmp|svg)(\?.*)?$/i) || targetUrl.includes('r2d2storage.com');
    const isAjax = targetUrl.includes('admin-ajax.php');

    // Montagem dos Headers (Disfarce de Navegador Windows)
    const headers = new Headers({
      "User-Agent": MY_USER_AGENT,
      "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8",
      "Cache-Control": "no-cache",
      "Referer": "https://mangalivre.tv/",
      "Origin": "https://mangalivre.tv",
      "X-Requested-With": isAjax ? "XMLHttpRequest" : ""
    });

    if (cookieFromKV) headers.set("Cookie", cookieFromKV);

    // Limpeza de rastros de Proxy/Worker
    headers.delete("cf-connecting-ip");
    headers.delete("x-forwarded-for");
    headers.delete("x-real-ip");

    try {
      let fetchOptions = {
        method: isAjax ? 'POST' : 'GET',
        headers: headers,
        redirect: 'follow'
      };

      if (isAjax && mangaId) {
        headers.set("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8");
        const formData = new URLSearchParams();
        formData.append('action', 'manga_get_chapters');
        formData.append('manga', mangaId);
        fetchOptions.body = formData.toString();
      }

      const response = await fetch(targetUrl, fetchOptions);

      // --- TRATAMENTO DE IMAGENS ---
      if (isImage) {
        const imageBuffer = await response.arrayBuffer();
        
        // Retorna a imagem com CORS liberado para o navegador não bloquear
        return new Response(imageBuffer, {
          status: response.status,
          headers: {
            "Content-Type": response.headers.get('content-type') || "image/webp",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Cache-Control": "public, max-age=604800", // Cache de 7 dias para carregar rápido
            "Vary": "Origin"
          }
        });
      }

      // --- TRATAMENTO DE PÁGINAS HTML ---
      let body = await response.text();
      
      // 1. REESCRITA DE IMAGENS: Faz o navegador pedir as fotos pelo SEU PROXY
      const proxyBase = `${url.origin}/?url=`;
      
      // Procura URLs do armazenamento de imagens e injeta o proxy na frente
      const r2d2Regex = /(https?:\/\/[^"'\s]*r2d2storage\.com[^"'\s]*)/gi;
      body = body.replace(r2d2Regex, (match) => {
        return `${proxyBase}${encodeURIComponent(match)}`;
      });

      // 2. INJEÇÃO ANTI-ERRO: Impede a tela preta caso um script falhe
      const antiBlockScript = `
        <script>
          // Ignora erros de cross-origin que travam o leitor
          window.onerror = function() { return true; };
          // Força as imagens que falharem a tentarem carregar de novo via proxy
          document.addEventListener('error', function(e) {
            if(e.target.tagName === 'IMG' && !e.target.src.includes('${url.origin}')) {
              e.target.src = '${proxyBase}' + encodeURIComponent(e.target.src);
            }
          }, true);
        </script>
      `;
      body = body.replace("<head>", `<head>${antiBlockScript}`);

      return new Response(body, {
        status: response.status,
        headers: {
          "Content-Type": "text/html; charset=UTF-8",
          "Access-Control-Allow-Origin": "*"
        }
      });

    } catch (e) {
      return new Response("Erro no Worker: " + e.message, { status: 500 });
    }
  }
};
