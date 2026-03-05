export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');

    if (!targetUrl) return new Response("Proxy Ativo.", { status: 200 });

    const cookieFromKV = await env.mangalivre_session.get("mangalivre_cookie");
    const MY_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

    // Headers limpos para não ser detectado
    const headers = new Headers({
      "User-Agent": MY_USER_AGENT,
      "Referer": "https://mangalivre.tv/",
      "Origin": "https://mangalivre.tv"
    });

    if (cookieFromKV) headers.set("Cookie", cookieFromKV);

    try {
      // Fazemos a requisição pura, sem mexer em nada
      const response = await fetch(targetUrl, { headers });
      
      // Clonamos os headers para poder apagar as travas de segurança
      let newHeaders = new Headers(response.headers);
      
      // SÓ O NECESSÁRIO: Remove o que impede de aparecer no seu site (iframe)
      newHeaders.delete("X-Frame-Options");
      newHeaders.delete("Content-Security-Policy");
      
      // Libera para o seu domínio ler os dados (CORS)
      newHeaders.set("Access-Control-Allow-Origin", "*");

      // Retorna o corpo original da resposta sem alterar uma vírgula
      // Isso evita que a Cloudflare perceba a manipulação de conteúdo
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders
      });

    } catch (e) {
      return new Response("Erro: " + e.message, { status: 500 });
    }
  }
};
