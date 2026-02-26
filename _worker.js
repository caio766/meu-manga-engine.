export default {
  async fetch(request, env, ctx) {
    const ACCOUNT_ID = "a12b5489f896959e227c1ef36dc3a221";
    const KV_ID = "02b132aaf8e349b7837c713d9bea544a";
    const API_TOKEN = "5432W9Ra_46u9XhLHx6YJ95PjQ3zz1LDRLNKbfPj";

    // --- BLOCO STEALTH: GERAÇÃO DE RASTROS HUMANOS ---
    function getRandomIP() {
      const segments = [177, 179, 186, 187, 189, 191, 200, 201];
      const s1 = segments[Math.floor(Math.random() * segments.length)];
      return `${s1}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    }

    // Variar o User-Agent para não ser sempre o mesmo SM-S918B
    const userAgents = [
      "Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36",
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
      "Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.105 Mobile Safari/537.36"
    ];

    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');
    if (!targetUrl) return new Response("Envie ?url= no link", { status: 400 });

    const isImage = targetUrl.match(/\.(jpg|jpeg|png|webp|avif|gif)/i);

    async function getCookieFromKV() {
      try {
        const kvUrl = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/storage/kv/namespaces/${KV_ID}/values/mangalivre_session`;
        const res = await fetch(kvUrl, { headers: { "Authorization": `Bearer ${API_TOKEN}` } });
        return res.ok ? await res.text() : null;
      } catch (e) { return null; }
    }

    const sessionCookie = await getCookieFromKV();
    const headers = new Headers();

    // --- APLICAÇÃO DA MÁSCARA ---
    headers.set("User-Agent", userAgents[Math.floor(Math.random() * userAgents.length)]);
    headers.set("X-Forwarded-For", getRandomIP());
    headers.set("Via", "1.1 google"); // Simula um salto de rede comum
    headers.set("Accept-Language", "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7");
    headers.set("Sec-CH-UA-Mobile", "?1");
    headers.set("Sec-CH-UA-Platform", '"Android"');
    headers.set("Referer", "https://mangalivre.tv/");
    if (sessionCookie) headers.set("Cookie", sessionCookie);

    try {
      let response = await fetch(targetUrl, {
        method: "GET",
        headers: headers,
        redirect: "follow",
        cf: {
          // Desativa o cache da Cloudflare para evitar que o site original 
          // perceba que várias requisições vêm do mesmo nó de cache.
          cacheEverything: false,
          minify: { javascript: true, css: true, html: true }
        }
      });

      // Fallback para bloqueios de Referer
      if (response.status === 403) {
        headers.delete("Referer");
        response = await fetch(targetUrl, { headers, redirect: "follow" });
      }

      const newHeaders = new Headers(response.headers);
      newHeaders.set("Access-Control-Allow-Origin", "*");
      
      // Limpeza de rastros de segurança que bloqueiam o robô
      newHeaders.delete("content-security-policy");
      newHeaders.delete("x-frame-options");
      newHeaders.delete("report-to");

      if (isImage) {
        return new Response(response.body, { headers: newHeaders });
      } else {
        let html = await response.text();
        const targetUrlObj = new URL(targetUrl);

        // Ajuste de Links Relativos para passar pelo Proxy
        html = html.replace(/(src|href)=["']\s*(\/[^"']+)["']/g, (match, attr, link) => {
          if (link.startsWith('//')) return match;
          return `${attr}="${url.origin}/?url=${encodeURIComponent(targetUrlObj.origin + link)}"`;
        });

        return new Response(html, { 
          headers: { ...Object.fromEntries(newHeaders), "Content-Type": "text/html; charset=utf-8" } 
        });
      }
    } catch (error) {
      return new Response(`Erro: ${error.message}`, { status: 500 });
    }
  }
};
                
