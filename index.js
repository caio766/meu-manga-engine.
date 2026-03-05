export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');
    const mangaId = url.searchParams.get('manga');

    if (!targetUrl) return new Response("Erro: Use ?url=LINK", { status: 400 });

    const cookieFromKV = await env.mangalivre_session.get("mangalivre_cookie");
    const MY_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

    const isImage = targetUrl.match(/\.(webp|jpg|jpeg|png|gif|avif)/i) || targetUrl.includes('storage');

    const headers = new Headers({
      "User-Agent": MY_USER_AGENT,
      "Referer": "https://mangalivre.tv/",
      "Origin": "https://mangalivre.tv",
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

      let newHeaders = new Headers(response.headers);
      newHeaders.delete("X-Frame-Options");
      newHeaders.delete("Content-Security-Policy");
      newHeaders.delete("Frame-Options");
      newHeaders.set("Access-Control-Allow-Origin", "*");
      newHeaders.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      newHeaders.set("Access-Control-Allow-Headers", "*");

      if (isImage) {
        const buffer = await response.arrayBuffer();
        return new Response(buffer, { status: response.status, headers: newHeaders });
      }

      let body = await response.text();
      const proxyBase = `${url.origin}/?url=`;

      // 1. Sua reescrita original de imagens
      body = body.replace(/(https?:\/\/aws\.r2d2storage\.com\/[^\s"']+)/gi, (match) => {
        return `${proxyBase}${encodeURIComponent(match)}`;
      });

      // 2. APLICAÇÃO DO FILTRO (Injeção de CSS)
      // Aqui nós escondemos o "lixo" baseado no que você inspecionou
      const styleFilter = `
        <style>
          /* Esconde tudo o que não é o conteúdo da leitura */
          body > *:not(.reading-content):not(script):not(style),
          header, footer, .main-header, .site-footer, .comments-area,
          #disqus_thread, .sidebar, .nav-links, .manga-setup {
            display: none !important;
          }

          /* Remove especificamente o aviso de AdBlock e pixels de anúncio que você achou */
          #adblock-overlay, #ad-bait-pixel, .ads, .ad-banner {
            display: none !important;
          }

          /* Força o fundo a ser preto total para imersão */
          body, html {
            background-color: #000 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow-x: hidden !important;
          }

          /* Centraliza e limpa o container das imagens */
          .reading-content, #manga-safe-wrapper, .chapter-images {
            display: block !important;
            visibility: visible !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            padding: 0 !important;
          }

          /* Ajusta as imagens para ficarem perfeitas no celular/pc */
          .wp-manga-chapter-img {
            display: block !important;
            width: 100% !important;
            max-width: 900px !important; /* Tamanho confortável para leitura */
            height: auto !important;
            margin: 0 auto 5px auto !important; /* Espaço pequeno entre as páginas */
            border: none !important;
          }
        </style>
      `;

      // Inserimos o estilo logo antes de fechar o cabeçalho
      body = body.replace('</head>', `${styleFilter}</head>`);

      return new Response(body, { status: response.status, headers: newHeaders });

    } catch (e) {
      return new Response("Erro no Worker: " + e.message, { status: 500 });
    }
  }
};
