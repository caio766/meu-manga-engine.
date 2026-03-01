export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');

    if (!targetUrl) {
      return new Response("Erro: Use ?url=https://mangalivre.tv/seu-manga", { status: 400 });
    }

    // 1. Busca o cookie atualizado do seu KV
    const cookieFromKV = await env.mangalivre_session.get("mangalivre_cookie");
    const MY_USER_AGENT = "Mozilla/5.0 (Android 13; Mobile; rv:128.0) Gecko/128.0 Firefox/128.0";

    // 2. Montagem dos cabeçalhos de elite
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
      "Viewport-Width": "1920",
      "Device-Memory": "8",
      "Service-Worker-Navigation-Preload": "true"
    });

    // --- ALTERAÇÃO CRUCIAL: LIMPEZA DE CABEÇALHOS ---
    // Removemos rastros que a Cloudflare adiciona automaticamente e que denunciam o uso de Proxy/Worker
    headers.delete("cf-connecting-ip");
    headers.delete("x-forwarded-for");
    headers.delete("x-real-ip");
    headers.delete("cf-worker");

    try {
      // Faz a requisição "limpa" para o site
      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: headers,
        redirect: 'follow'
      });

      // Se der 403, a Cloudflare detectou o IP do Datacenter do Worker
      if (response.status === 403) {
        return new Response("❌ Bloqueio Cloudflare (403): O IP deste Worker foi marcado ou o cookie expirou.", { 
          status: 403,
          headers: { "Access-Control-Allow-Origin": "*" }
        });
      }

      const body = await response.text();

      // Retorna o HTML com cabeçalhos que permitem que sua automação leia tudo
      return new Response(body, {
        status: response.status,
        headers: {
          "Content-Type": "text/html; charset=UTF-8",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-cache"
        }
      });

    } catch (e) {
      return new Response("Erro no Worker: " + e.message, { status: 500 });
    }
  }
};
