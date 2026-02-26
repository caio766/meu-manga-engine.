export default {
  async fetch(request, env) {
    const ACCOUNT_ID = "a12b5489f896959e227c1ef36dc3a221";
    const KV_ID = "02b132aaf8e349b7837c713d9bea544a";
    const API_TOKEN = "5432W9Ra_46u9XhLHx6YJ95PjQ3zz1LDRLNKbfPj";

    const url = new URL(request.url);
    let targetUrl = url.searchParams.get('url');

    if (!targetUrl) {
      return new Response("🚀 PROXY ATIVO! Use ?url=https://mangalivre.tv/", {
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }

    // CORREÇÃO: Garante que a URL tenha o protocolo https://
    if (!targetUrl.startsWith('http')) {
      targetUrl = 'https://' + targetUrl;
    }

    const getRandomIP = () => {
      const segments = [177, 179, 186, 187, 189, 191, 200, 201];
      const s1 = segments[Math.floor(Math.random() * segments.length)];
      return `${s1}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    };

    try {
      // 1. Busca Segura do Cookie no KV
      const kvUrl = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/storage/kv/namespaces/${KV_ID}/values/mangalivre_session`;
      const kvRes = await fetch(kvUrl, { 
        headers: { "Authorization": `Bearer ${API_TOKEN}` } 
      });
      const sessionCookie = kvRes.ok ? await kvRes.text() : null;

      const headers = new Headers();
      headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36");
      headers.set("X-Forwarded-For", getRandomIP());
      headers.set("Referer", "https://mangalivre.tv/");
      if (sessionCookie) headers.set("Cookie", sessionCookie);

      // 2. Requisição com tratamento de erro
      const response = await fetch(targetUrl, {
        method: "GET",
        headers: headers,
        redirect: "follow"
      });

      // Se for imagem ou recurso estático, repassa direto sem ler como texto
      const isImage = targetUrl.match(/\.(jpg|jpeg|png|webp|avif|gif)/i) || targetUrl.includes('r2d2storage');
      
      const newHeaders = new Headers(response.headers);
      newHeaders.set("Access-Control-Allow-Origin", "*");
      newHeaders.delete("content-security-policy");

      if (isImage) {
        return new Response(response.body, { status: response.status, headers: newHeaders });
      }

      // Se for HTML, entregamos o texto puro para o robô ler
      const html = await response.text();
      return new Response(html, {
        status: response.status,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "text/html; charset=utf-8"
        }
      });

    } catch (e) {
      return new Response("❌ Erro ao acessar o site: " + e.message, { status: 500 });
    }
  }
};
