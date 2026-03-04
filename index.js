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

    const isAjax = targetUrl.includes('admin-ajax.php');
    
    // DETECTAR SE É IMAGEM DO R2D2STORAGE
    const isR2D2Image = targetUrl.includes('r2d2storage.com') || 
                        targetUrl.match(/\.(webp|jpg|jpeg|png|gif|avif)(\?.*)?$/i);

    // HEADERS ESPECÍFICOS PARA CADA TIPO
    const headers = new Headers({
      "User-Agent": MY_USER_AGENT,
      "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
      "Cache-Control": "no-cache",
      "Pragma": "no-cache",
    });

    // CONFIGURAÇÃO CRÍTICA PARA IMAGENS DO R2D2STORAGE
    if (isR2D2Image) {
      headers.set("Accept", "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8");
      headers.set("Referer", "https://mangalivre.tv/"); // REFERER OBRIGATÓRIO!
      headers.set("Origin", "https://mangalivre.tv");
      headers.set("Sec-Fetch-Dest", "image");
      headers.set("Sec-Fetch-Mode", "no-cors");
      headers.set("Sec-Fetch-Site", "cross-site");
      
      // Headers modernos do Chrome
      headers.set("Sec-Ch-Ua", "\"Not_A Brand\";v=\"8\", \"Chromium\";v=\"120\", \"Google Chrome\";v=\"120\"");
      headers.set("Sec-Ch-Ua-Mobile", "?0");
      headers.set("Sec-Ch-Ua-Platform", "\"Windows\"");
    } 
    // CONFIGURAÇÃO PARA PÁGINAS HTML
    else if (!isAjax) {
      headers.set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8");
      headers.set("Referer", "https://mangalivre.tv/");
      headers.set("Origin", "https://mangalivre.tv");
      headers.set("Sec-Fetch-Dest", "document");
      headers.set("Sec-Fetch-Mode", "navigate");
      headers.set("Sec-Fetch-Site", "same-origin");
      headers.set("Upgrade-Insecure-Requests", "1");
      
      if (cookieFromKV) {
        headers.set("Cookie", cookieFromKV);
      }
    } 
    // CONFIGURAÇÃO PARA AJAX
    else {
      headers.set("Accept", "*/*");
      headers.set("Referer", "https://mangalivre.tv/");
      headers.set("Origin", "https://mangalivre.tv");
      headers.set("X-Requested-With", "XMLHttpRequest");
      headers.set("Sec-Fetch-Dest", "empty");
      headers.set("Sec-Fetch-Mode", "cors");
      headers.set("Sec-Fetch-Site", "same-origin");
      
      if (cookieFromKV) {
        headers.set("Cookie", cookieFromKV);
      }
    }

    // Remove headers problemáticos
    headers.delete("cf-connecting-ip");
    headers.delete("x-forwarded-for");
    headers.delete("x-real-ip");

    try {
      let fetchOptions = {
        method: isAjax ? 'POST' : 'GET',
        headers: headers,
        redirect: 'follow'
      };

      // Se for requisição AJAX com mangaId
      if (isAjax && mangaId) {
        headers.set("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8");
        const formData = new URLSearchParams();
        formData.append('action', 'manga_get_chapters');
        formData.append('manga', mangaId);
        fetchOptions.body = formData.toString();
      }

      // FAZ A REQUISIÇÃO
      const response = await fetch(targetUrl, fetchOptions);
      
      // SE FOR IMAGEM DO R2D2, RETORNA O BUFFER
      if (isR2D2Image) {
        const imageBuffer = await response.arrayBuffer();
        
        // Log para debug (opcional)
        console.log(`Imagem carregada: ${targetUrl.substring(0, 50)}... Status: ${response.status}`);
        
        return new Response(imageBuffer, {
          status: response.status,
          headers: {
            "Content-Type": response.headers.get('content-type') || "image/webp",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "*",
            "Cache-Control": "public, max-age=86400",
            "Content-Length": imageBuffer.byteLength.toString()
          }
        });
      }

      // PARA HTML, PRECISAMOS REWRITE DAS URLs DAS IMAGENS
      let body = await response.text();
      
      if (!isAjax) {
        // Regex para capturar URLs das imagens do r2d2storage
        const r2d2Regex = /(https?:\/\/[^"'\s]*r2d2storage\.com[^"'\s]*\.webp[^"'\s]*)/gi;
        
        // Substitui todas as URLs de imagens para passar pelo proxy
        body = body.replace(r2d2Regex, (match) => {
          const proxiedUrl = `${url.origin}?url=${encodeURIComponent(match)}`;
          console.log(`URL da imagem substituída: ${match.substring(0, 50)}...`);
          return proxiedUrl;
        });

        // Também substitui URLs em atributos src e srcset
        body = body.replace(
          /(src|srcset)="([^"]*r2d2storage\.com[^"]*)"/gi,
          (match, attr, imgUrl) => {
            const proxiedUrl = `${url.origin}?url=${encodeURIComponent(imgUrl)}`;
            return `${attr}="${proxiedUrl}"`;
          }
        );
      }

      // Verifica resposta AJAX inválida
      if (isAjax && body === "0") {
        return new Response(JSON.stringify({
          error: "Falha na requisição Ajax",
          mangaId: mangaId,
          cookiePresent: !!cookieFromKV
        }), { 
          status: 200,
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        });
      }

      return new Response(body, {
        status: response.status,
        headers: {
          "Content-Type": response.headers.get('content-type') || "text/html; charset=UTF-8",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "*"
        }
      });

    } catch (e) {
      return new Response(JSON.stringify({
        error: "Erro no proxy: " + e.message,
        targetUrl: targetUrl.substring(0, 100)
      }), { 
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }
  }
};
