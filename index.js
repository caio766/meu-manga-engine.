export default {
  async fetch(request, env) { // Removido o 'ctx' que causava erro se não usado
    const ACCOUNT_ID = "a12b5489f896959e227c1ef36dc3a221";
    const KV_ID = "02b132aaf8e349b7837c713d9bea544a";
    const API_TOKEN = "5432W9Ra_46u9XhLHx6YJ95PjQ3zz1LDRLNKbfPj";

    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');

    // Teste de vida para evitar que o worker rode sem URL
    if (!targetUrl) {
      return new Response("🚀 PROXY ATIVO! Use ?url=https://mangalivre.tv/", {
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }

    // Lógica de IP Brasileiro (Mantida 100%)
    const getRandomIP = () => {
      const segments = [177, 179, 186, 187, 189, 191, 200, 201];
      const s1 = segments[Math.floor(Math.random() * segments.length)];
      return `${s1}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    };

    try {
      // --- LOGICA DE BURLA KV (VIA API HTTP) ---
      // Usamos fetch para o KV para não depender de bindings que dão erro 1101
      const kvUrl = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/storage/kv/namespaces/${KV_ID}/values/mangalivre_session`;
      const kvRes = await fetch(kvUrl, { 
        headers: { "Authorization": `Bearer ${API_TOKEN}` } 
      });
      const sessionCookie = kvRes.ok ? await kvRes.text() : null;

      const headers = new Headers();
      headers.set("User-Agent", "Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36");
      headers.set("X-Forwarded-For", getRandomIP());
      headers.set("Referer", "https://mangalivre.tv/");
      if (sessionCookie) headers.set("Cookie", sessionCookie);

      const response = await fetch(targetUrl, {
        method: "GET",
        headers: headers,
        redirect: "follow"
      });

      // Se o site original der erro, repassamos
      if (response.status === 403) {
        headers.delete("Referer");
        const retry = await fetch(targetUrl, { headers });
        return new Response(retry.body, { status: retry.status, headers: { "Access-Control-Allow-Origin": "*" } });
      }

      const contentType = response.headers.get("Content-Type") || "";
      const newHeaders = new Headers(response.headers);
      newHeaders.set("Access-Control-Allow-Origin", "*");

      // Se for imagem, entrega direto (Sua lógica de r2d2)
      if (targetUrl.match(/\.(jpg|jpeg|png|webp|avif|gif)/i) || targetUrl.includes('r2d2storage')) {
        return new Response(response.body, { headers: newHeaders });
      }

      // Se for HTML, entrega o código para o Robô (Sem o CSS que esconde tudo)
      let html = await response.text();
      return new Response(html, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "text/html; charset=utf-8"
        }
      });

    } catch (e) {
      // Este bloco captura o erro e impede o 1101, mostrando o que houve
      return new Response("Erro interno no Worker: " + e.message, { status: 500 });
    }
  }
};
