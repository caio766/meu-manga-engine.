export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');

    // 1. Resposta para quando não há URL (ajuda a testar se o worker está vivo)
    if (!targetUrl) {
      return new Response("Proxy Ativo! Use ?url=https://www.google.com", {
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }

    try {
      // 2. Configura a requisição para o site alvo
      const response = await fetch(targetUrl, {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          "Accept": "*/*"
        },
        redirect: "follow"
      });

      // 3. Pega o corpo da resposta (seja imagem ou texto)
      const data = await response.arrayBuffer();
      
      // 4. Repassa a resposta com headers de permissão (CORS)
      return new Response(data, {
        status: response.status,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Content-Type": response.headers.get("Content-Type") || "text/html",
          "Cache-Control": "no-cache"
        }
      });

    } catch (e) {
      return new Response("Erro ao buscar URL: " + e.message, { status: 500 });
    }
  }
};
