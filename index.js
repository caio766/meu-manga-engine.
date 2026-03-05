export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');

    if (!targetUrl) return new Response("Proxy Ativo.", { status: 200 });

    const cookieFromKV = await env.mangalivre_session.get("mangalivre_cookie");
    
    // MANTIDO: Seu User Agent real
    const MY_USER_AGENT = "Mozilla/5.0 (Android 13; Mobile; rv:128.0) Gecko/128.0 Firefox/128.0";

    const isImage = targetUrl.match(/\.(webp|jpg|jpeg|png|gif|avif)/i) || targetUrl.includes('storage');

    // MANTIDO: Cabeçalhos originais de bypass
    const headers = new Headers({
      "User-Agent": MY_USER_AGENT,
      "Accept": isImage ? "image/avif,image/webp,*/*" : "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "pt-BR,pt;q=0.8,en-US;q=0.5,en;q=0.3",
      "Accept-Encoding": "gzip, deflate, br",
      "Referer": "https://mangalivre.tv/",
      "Origin": "https://mangalivre.tv",
      "DNT": "1",
      "Upgrade-Insecure-Requests": "1",
      "Sec-Fetch-Dest": isImage ? "image" : "document",
      "Sec-Fetch-Mode": isImage ? "no-cors" : "navigate",
      "Sec-Fetch-Site": "cross-site",
      "Connection": "keep-alive"
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

      if (response.status === 403) {
        return new Response("Bloqueio Cloudflare (403): O IP deste Worker pode estar na lista negra ou o cookie expirou.", { status: 403 });
      }

      let newHeaders = new Headers(response.headers);
      newHeaders.delete("X-Frame-Options");
      newHeaders.delete("Content-Security-Policy");
      newHeaders.set("Access-Control-Allow-Origin", "*");

      if (isImage) {
        const buffer = await response.arrayBuffer();
        return new Response(buffer, { status: response.status, headers: newHeaders });
      }

      let body = await response.text();
      const proxyBase = `${url.origin}/?url=`;

      // MANTIDO: Sua troca de URLs das imagens
      body = body.replace(/(https?:\/\/aws\.r2d2storage\.com\/[^\s"']+)/gi, (match) => {
        return `${proxyBase}${encodeURIComponent(match)}`;
      });

      // --- INJEÇÃO DO FILTRO SNIPER ---
      // Baseado nas imagens 12276 e 12277 (Console) e nos seus círculos vermelhos
      const styleFilter = `
        <style>
          /* 1. Mata as Divs Teimosas do Console (Image 12277) */
          .a11y-speak-region, #a11y-speak-assertive, #a11y-speak-polite {
            display: none !important;
          }

          /* 2. Mata o Topo: Capa, Título e Breadcrumb (Image 12187) */
          .entry-header, .breadcrumb, .manga-setup, .header-manga, 
          #manga-reading-nav-head, .profile-manga {
            display: none !important;
          }

          /* 3. Mata o Rodapé: Discussão e Botões Extras (Image 12186) */
          .manga-discussion, .comments-area, #disqus_thread, 
          .nav-links, .site-footer, .breadcrumb-footer {
            display: none !important;
          }

          /* 4. Limpeza Geral e Fundo Preto */
          body, html {
            background: #000 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow-x: hidden !important;
          }
          
          header, footer, .sidebar, .ads, .ad-banner {
            display: none !important;
          }

          /* 5. Força a exibição apenas do container de imagens */
          .reading-content, #manga-safe-wrapper {
            display: block !important;
            visibility: visible !important;
            width: 100% !important;
            max-width: 100% !important;
            background: #000 !important;
          }

          /* 6. Ajusta a classe identificada no console: wp-manga-chapter-img */
          .wp-manga-chapter-img, .img-responsive {
            display: block !important;
            width: 100% !important;
            max-width: 800px !important; /* Tamanho ideal para leitura */
            height: auto !important;
            margin: 0 auto 10px auto !important;
          }
        </style>
      `;

      // Insere o estilo antes do fim da tag head
      body = body.replace('</head>', `${styleFilter}</head>`);

      return new Response(body, { status: response.status, headers: newHeaders });

    } catch (e) {
      return new Response("Erro: " + e.message, { status: 500 });
    }
  }
};

