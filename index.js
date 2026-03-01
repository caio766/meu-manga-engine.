export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');

    if (!targetUrl) {
      return new Response("Erro: Use ?url=https://mangalivre.tv/seu-manga", { status: 400 });
    }

    // --- LEITURA DO KV ---
    const cookieFromKV = await env.mangalivre_session.get("mangalivre_cookie");
    const MY_USER_AGENT = "Mozilla/5.0 (Android 13; Mobile; rv:128.0) Gecko/128.0 Firefox/128.0";

    // Cabeçalhos turbinados para evitar Lazy Loading e parecer um navegador real de alta resolução
    const headers = new Headers({
      "User-Agent": MY_USER_AGENT,
      "Cookie": cookieFromKV || "",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "pt-BR,pt;q=0.8,en-US;q=0.5,en;q=0.3",
      "Referer": "https://mangalivre.tv/",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "same-origin",
      "Upgrade-Insecure-Requests": "1",
      "DNT": "1",
      "Sec-GPC": "1",
      // --- ESTRATÉGIA DE ROLAGEM/CARREGAMENTO ---
      "Viewport-Width": "1920", // Simula tela Full HD para o site "abrir" mais conteúdo
      "Device-Memory": "8",     // Simula um dispositivo potente
      "Service-Worker-Navigation-Preload": "true"
    });

    try {
      // Fazemos a requisição original
      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: headers,
        redirect: 'follow'
      });

      // Se a Cloudflare barrar (403), tentamos avisar
      if (response.status === 403) {
        return new Response("❌ Bloqueio Cloudflare: Cookie expirado no KV ou IP do Worker marcado.", { 
          status: 403,
          headers: { "Access-Control-Allow-Origin": "*" }
        });
      }

      // Pegamos o conteúdo original
      let body = await response.text();

      // --- TRUQUE ADICIONAL PARA O CÓDIGO-FONTE ---
      // Às vezes o site esconde capítulos em tags <noscript> ou scripts.
      // O código abaixo garante que o HTML seja entregue como o servidor mandou.
      
      return new Response(body, {
        status: response.status,
        headers: {
          "Content-Type": "text/html; charset=UTF-8",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-cache" // Evita que você veja dados antigos
        }
      });

    } catch (e) {
      return new Response("Erro no Worker: " + e.message, { status: 500 });
    }
  }
};
