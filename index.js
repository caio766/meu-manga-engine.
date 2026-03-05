export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');

    if (!targetUrl) return new Response("Proxy Ativo. Aguardando comando...", { status: 200 });

    // 1. Busca o Cookie do seu KV (Sincronizado com o Termux)
    const cookieFromKV = await env.mangalivre_session.get("mangalivre_cookie");
    
    // 2. Identidade Visual (User Agent e Client Hints)
    const MY_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

    const isImage = targetUrl.match(/\.(webp|jpg|jpeg|png|gif|avif)/i) || targetUrl.includes('storage');

    // 3. Montagem dos Headers "Camaleão"
    const headers = new Headers({
      "User-Agent": MY_USER_AGENT,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
      "Referer": "https://mangalivre.tv/",
      "Origin": "https://mangalivre.tv",
      // Cabeçalhos que o Chrome 120 envia obrigatoriamente:
      "sec-ch-ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
      "Sec-Fetch-Dest": isImage ? "image" : "document",
      "Sec-Fetch-Mode": isImage ? "no-cors" : "navigate",
      "Sec-Fetch-Site": "cross-site",
      "Upgrade-Insecure-Requests": "1"
    });

    if (cookieFromKV) {
      headers.set("Cookie", cookieFromKV);
    }

    try {
      const response = await fetch(targetUrl, { 
        method: request.method, 
        headers: headers,
        redirect: "follow"
      });

      // --- PASSO 1: LIMPEZA DOS BLOQUEIOS ---
      let newHeaders = new Headers(response.headers);
      
      // Deleta as ordens que impedem o Iframe no seu site
      newHeaders.delete("X-Frame-Options");
      newHeaders.delete("Content-Security-Policy");
      newHeaders.delete("Frame-Options");
      
      // Permite que o seu domínio (nuvoxtoons) acesse os dados
      newHeaders.set("Access-Control-Allow-Origin", "*");
      newHeaders.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

      // --- PASSO 2: TRATAMENTO DE IMAGEM ---
      if (isImage) {
        const buffer = await response.arrayBuffer();
        return new Response(buffer, { status: response.status, headers: newHeaders });
      }

      // --- PASSO 3: TRATAMENTO DE HTML (Reescrita de Links) ---
      let body = await response.text();
      const proxyBase = `${url.origin}/?url=`;

      // Substitui URLs do storage para passarem pelo seu proxy automaticamente
      body = body.replace(/(https?:\/\/aws\.r2d2storage\.com\/[^\s"']+)/gi, (match) => {
        return `${proxyBase}${encodeURIComponent(match)}`;
      });

      return new Response(body, { status: response.status, headers: newHeaders });

    } catch (e) {
      return new Response("Erro no Worker: " + e.message, { status: 500 });
    }
  }
};
        
