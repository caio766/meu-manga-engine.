// Worker para Proxy no Mangalivre.tv
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // 1. Pega os parâmetros da sua URL
    const targetUrl = url.searchParams.get('url');
    const userCookie = url.searchParams.get('cookie'); // O cookie que você pegou
    const userAgent = url.searchParams.get('ua');     // O User-Agent do seu navegador

    if (!targetUrl) {
      return new Response("Erro: Adicione ?url=LINK_DO_MANGA ao final da URL do proxy", { status: 400 });
    }

    // 2. Montamos os cabeçalhos para parecer um humano real
    const newHeaders = new Headers({
      "User-Agent": userAgent || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Cookie": userCookie || "",
      "Referer": "https://mangalivre.tv/", // Mentimos que estamos vindo da home
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
      "Cache-Control": "max-age=0",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "same-origin", // Diz que estamos navegando dentro do próprio site
      "Upgrade-Insecure-Requests": "1"
    });

    try {
      // 3. Faz a requisição "disfarçada"
      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: newHeaders,
        redirect: 'follow'
      });

      // 4. Se a Cloudflare barrar mesmo assim (erro 403), avisamos
      if (response.status === 403) {
        return new Response("Bloqueado pela Cloudflare: O Cookie ou o User-Agent expiraram.", { status: 403 });
      }

      // 5. Retorna o conteúdo do site para você processar
      return new Response(response.body, {
        status: response.status,
        headers: {
          "Content-Type": "text/html; charset=UTF-8",
          "Access-Control-Allow-Origin": "*" // Permite que sua automação leia os dados
        }
      });

    } catch (e) {
      return new Response("Erro interno no Proxy: " + e.message, { status: 500 });
    }
  }
};
