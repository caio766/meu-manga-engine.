export default {
  async fetch(request, env, ctx) {
    // Configurações de Identidade do KV (Mantidas exatamente como as suas)
    const ACCOUNT_ID = "a12b5489f896959e227c1ef36dc3a221";
    const KV_ID = "02b132aaf8e349b7837c713d9bea544a";
    const API_TOKEN = "5432W9Ra_46u9XhLHx6YJ95PjQ3zz1LDRLNKbfPj";

    // Lógica de IP Brasileiro (Sua função original)
    function getRandomBrasilianIP() {
      const segments = [177, 179, 186, 187, 189, 191, 200, 201];
      const s1 = segments[Math.floor(Math.random() * segments.length)];
      return `${s1}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    }

    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');
    // Detecta se é o robô pedindo (podemos passar um parâmetro &bot=true no robô)
    const isBot = url.searchParams.get('bot') === 'true';

    if (!targetUrl) return new Response("Envie ?url= no link", { status: 400 });

    const targetUrlObj = new URL(targetUrl);
    const isImage = targetUrl.match(/\.(jpg|jpeg|png|webp|avif|gif)/i) || targetUrl.includes('r2d2storage');

    // --- LÓGICA DE BURLA: BUSCA DE COOKIES NO KV ---
    async function getCookieFromKV() {
      try {
        const kvUrl = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/storage/kv/namespaces/${KV_ID}/values/mangalivre_session`;
        const res = await fetch(kvUrl, { headers: { "Authorization": `Bearer ${API_TOKEN}` } });
        return res.ok ? await res.text() : null;
      } catch (e) { return null; }
    }

    const sessionCookie = await getCookieFromKV();
    const headers = new Headers();
    const fakeIP = getRandomBrasilianIP();

    // Headers de Alta Fidelidade (Sua lógica Mobile)
    headers.set("User-Agent", "Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36");
    headers.set("Accept-Language", "pt-BR,pt;q=0.9");
    headers.set("X-Forwarded-For", fakeIP);
    headers.set("Referer", "https://mangalivre.tv/");
    if (sessionCookie) headers.set("Cookie", sessionCookie);

    try {
      let response = await fetch(targetUrl, {
        method: "GET",
        headers: headers,
        cf: { cacheEverything: false, cacheTtl: 0 }
      });

      // Bypass de erro 403 (Sua lógica original)
      if (response.status === 403) {
        headers.delete("Referer");
        response = await fetch(targetUrl, { headers });
      }

      const newHeaders = new Headers(response.headers);
      newHeaders.set("Access-Control-Allow-Origin", "*");
      newHeaders.delete("content-security-policy");
      newHeaders.delete("x-frame-options");

      if (isImage) return new Response(response.body, { headers: newHeaders });

      if (response.headers.get("Content-Type")?.includes("text/html")) {
        let html = await response.text();
        
        // --- SE FOR O ROBÔ: NÃO INJETA O CSS QUE ESCONDE TUDO ---
        if (isBot) {
          return new Response(html, { headers: newHeaders });
        }

        // --- SE FOR HUMANO: MANTÉM SUA LÓGICA DE LIMPEZA VISUAL ---
        const cleanCSS = `<style>* { display: none !important; } html, body, div, img { display: block !important; visibility: visible !important; opacity: 1 !important; } img { max-width: 100%; margin-bottom: 5px; }</style>`;
        
        if (html.toLowerCase().includes("</head>")) {
          html = html.replace(/<\/head>/i, `${cleanCSS}</head>`);
        }
        return new Response(html, { headers: newHeaders });
      }

      return new Response(response.body, { status: response.status, headers: newHeaders });

    } catch (error) {
      return new Response(`Erro no Proxy: ${error.message}`, { status: 500 });
    }
  }
};
    
