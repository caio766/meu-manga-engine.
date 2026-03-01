export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');

    if (!targetUrl) {
      return new Response("Erro: Use ?url=https://mangalivre.tv/seu-manga", { status: 400 });
    }

    // Configuração baseada nos seus dados reais
    const MY_USER_AGENT = "Mozilla/5.0 (Android 13; Mobile; rv:128.0) Gecko/128.0 Firefox/128.0";
    const MY_COOKIE = "cf_clearance=2IlQXO1RXfZ.TRopE2J1BXrZH30GkO8kXvvOJY_ZS78-1772330744-1.2.1.1-Qmm_TNU7uvHJH5e4uYnUyelRKWozzjH468EzFWudh8NJe5EFCCet.sUQyLkjvRc6YdIwHggrP2phI4NBkLbBd.aP0INy.KFyMEsyzjnQVURLy4_QzW_Ys2XfZ2Z95myA6HtncwwQlWcKGaddFHfXgCRNhs4MvSciACaiLtebUkvMbL5TN8BELjjcI2CxJg.Z_KdFuetSwDvZxCAEUG8pmJBapj5wQq36lKOnK9WGSyA";

    // Cabeçalhos que simulam perfeitamente o seu Firefox Mobile
    const headers = new Headers({
      "User-Agent": MY_USER_AGENT,
      "Cookie": MY_COOKIE,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "pt-BR,pt;q=0.8,en-US;q=0.5,en;q=0.3",
      "Alt-Used": "mangalivre.tv",
      "Referer": "https://mangalivre.tv/", // Simula que você veio da home
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "same-origin", // ESSENCIAL para links profundos
      "Upgrade-Insecure-Requests": "1",
      "DNT": "1", // Do Not Track
      "Sec-GPC": "1"
    });

    try {
      // Faz a requisição "disfarçada"
      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: headers,
        redirect: 'follow'
      });

      // Se retornar 403, significa que o cookie expirou ou a Cloudflare detectou o IP do Worker
      if (response.status === 403) {
        return new Response("❌ Bloqueio Cloudflare: O cookie cf_clearance expirou ou foi invalidado. Gere um novo no seu Firefox Android.", { 
          status: 403,
          headers: { "Access-Control-Allow-Origin": "*" }
        });
      }

      // Retorna o conteúdo para sua automação (GitHub Actions/Script)
      const body = await response.text();
      return new Response(body, {
        status: response.status,
        headers: {
          "Content-Type": "text/html; charset=UTF-8",
          "Access-Control-Allow-Origin": "*" // Permite que seu script leia os dados sem erro de CORS
        }
      });

    } catch (e) {
      return new Response("Erro no Worker: " + e.message, { status: 500 });
    }
  }
};
