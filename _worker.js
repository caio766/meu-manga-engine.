export default {
  async fetch(request, env, ctx) {
    const ACCOUNT_ID = "a12b5489f896959e227c1ef36dc3a221";
    const KV_ID = "02b132aaf8e349b7837c713d9bea544a";
    const API_TOKEN = "5432W9Ra_46u9XhLHx6YJ95PjQ3zz1LDRLNKbfPj";

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "*",
          "Max-Age": "86400",
        },
      });
    }

    const url = new URL(request.url);
    // Mudança importante: O robô vai enviar o link assim: ?url=https://site.com
    const targetUrl = url.searchParams.get('url');

    if (!targetUrl) return new Response("Envie ?url= no link", { status: 400 });

    async function getCookieFromKV() {
      try {
        const kvUrl = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/storage/kv/namespaces/${KV_ID}/values/mangalivre_session`;
        const res = await fetch(kvUrl, {
          headers: { "Authorization": `Bearer ${API_TOKEN}` }
        });
        return res.ok ? await res.text() : null;
      } catch (e) { return null; }
    }
    
    const sessionCookie = await getCookieFromKV();
    const headers = new Headers();

    headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36");
    headers.set("Referer", "https://mangalivre.tv/");
    if (sessionCookie) headers.set("Cookie", sessionCookie);

    try {
      let response = await fetch(targetUrl, {
        method: "GET",
        headers: headers,
        cf: { cacheEverything: true, cacheTtl: 3600 }
      });

      if (response.status === 403) {
        headers.delete("Referer");
        response = await fetch(targetUrl, { headers });
      }

      const newHeaders = new Headers(response.headers);
      newHeaders.set("Access-Control-Allow-Origin", "*");
      newHeaders.set("Access-Control-Allow-Methods", "GET, OPTIONS");
      
      // AJUSTE DINÂMICO DE CONTENT-TYPE:
      // Se for o robô pedindo a página, mantemos text/html. Se for imagem, mantemos image.
      const contentType = response.headers.get("Content-Type");
      if (contentType) {
          newHeaders.set("Content-Type", contentType);
      }

      // Se for imagem, coloca cache longo. Se for o robô (HTML), cache curto.
      if (contentType && contentType.includes("image")) {
          newHeaders.set("Cache-Control", "public, max-age=604800");
      } else {
          newHeaders.set("Cache-Control", "no-cache");
      }
      
      newHeaders.delete("content-security-policy");
      newHeaders.delete("x-frame-options");

      return new Response(response.body, { 
        status: response.status, 
        headers: newHeaders 
      });

    } catch (error) {
      return new Response(`Erro: ${error.message}`, { 
        status: 500, 
        headers: { "Access-Control-Allow-Origin": "*" } 
      });
    }
  }
};
      
