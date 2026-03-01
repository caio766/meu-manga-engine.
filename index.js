export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');

    if (!targetUrl) {
      return new Response("Erro: Use ?url=https://mangalivre.tv/seu-manga", { status: 400 });
    }

    // --- LEITURA DO KV ---
    // Tentamos buscar o cookie no seu namespace KV (mangalivre_session)
    // Se não existir, ele usa um valor vazio.
    const cookieFromKV = await env.mangalivre_session.get("mangalivre_cookie");
    
    // O User-Agent também pode ser dinâmico se você quiser, 
    // mas manteremos o seu Firefox Android fixo por enquanto.
    const MY_USER_AGENT = "Mozilla/5.0 (Android 13; Mobile; rv:128.0) Gecko/128.0 Firefox/128.0";

    const headers = new Headers({
      "User-Agent": MY_USER_AGENT,
      "Cookie": cookieFromKV || "", // Usa o cookie do KV aqui!
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "pt-BR,pt;q=0.8,en-US;q=0.5,en;q=0.3",
      "Alt-Used": "mangalivre.tv",
      "Referer": "https://mangalivre.tv/",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "same-origin",
      "Upgrade-Insecure-Requests": "1",
      "DNT": "1",
      "Sec-GPC": "1"
    });

    try {
      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: headers,
        redirect: 'follow'
      });

      if (response.status === 403) {
        return new Response("❌ Bloqueio Cloudflare: Cookie expirado no KV. Atualize via Termux!", { 
          status: 403,
          headers: { "Access-Control-Allow-Origin": "*" }
        });
      }

      const body = await response.text();
      return new Response(body, {
        status: response.status,
        headers: {
          "Content-Type": "text/html; charset=UTF-8",
          "Access-Control-Allow-Origin": "*"
        }
      });

    } catch (e) {
      return new Response("Erro no Worker: " + e.message, { status: 500 });
    }
  }
};
