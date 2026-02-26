export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');

    if (!targetUrl) return new Response("Erro: URL ausente", { status: 400 });

    const headers = new Headers();
    // IP Brasileiro e User Agent de alta confiança
    headers.set("X-Forwarded-For", "177.126.180.200"); 
    headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36");
    headers.set("Referer", "https://mangalivre.tv/");

    try {
      const response = await fetch(targetUrl, {
        method: "GET",
        headers: headers,
        redirect: "follow"
      });

      // Se o site retornar erro, entregamos o erro para saber o que houve
      if (!response.ok) {
        return new Response(`Erro no site original: ${response.status}`, { status: response.status });
      }

      const content = await response.arrayBuffer();
      const contentType = response.headers.get("Content-Type") || "text/html";

      // Retorno Limpo: Sem injeção de CSS ou scripts que causem tela preta
      return new Response(content, {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": contentType,
          "Cache-Control": "no-cache"
        }
      });

    } catch (error) {
      return new Response(`Erro fatal: ${error.message}`, { status: 500 });
    }
  }
};
