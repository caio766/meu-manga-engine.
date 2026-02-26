export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');

    if (!targetUrl) {
      return new Response("🚀 PROXY ATIVO! Use ?url=https://google.com", {
        headers: { "content-type": "text/plain; charset=utf-8" }
      });
    }

    try {
      const response = await fetch(targetUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0" },
        redirect: "follow"
      });
      
      const body = await response.arrayBuffer();
      return new Response(body, {
        status: response.status,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": response.headers.get("Content-Type") || "text/html"
        }
      });
    } catch (e) {
      return new Response("Erro: " + e.message, { status: 500 });
    }
  }
};
