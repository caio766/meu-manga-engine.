export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');

    if (!targetUrl) {
      return new Response("Erro: Use ?url=LINK", { status: 400 });
    }

    const cookieFromKV = await env.mangalivre_session.get("mangalivre_cookie");
    const MY_USER_AGENT = "Mozilla/5.0 (Android 13; Mobile; rv:128.0) Gecko/128.0 Firefox/128.0";

    // Verifica se estamos tentando puxar os capítulos
    const isAjaxChapters = targetUrl.includes('admin-ajax.php');

    const headers = new Headers({
      "User-Agent": MY_USER_AGENT,
      "Cookie": cookieFromKV || "",
      "Accept": "*/*",
      "Accept-Language": "pt-BR,pt;q=0.8,en-US;q=0.5,en;q=0.3",
      "Referer": "https://mangalivre.tv/", // Essencial para não dar erro
      "X-Requested-With": "XMLHttpRequest",
      "Origin": "https://mangalivre.tv"
    });

    // Limpeza rigorosa de cabeçalhos de identificação de Proxy
    headers.delete("cf-connecting-ip");
    headers.delete("x-forwarded-for");
    headers.delete("x-real-ip");
    headers.delete("cf-worker");
    headers.delete("cf-ray");

    try {
      let fetchOptions = {
        method: 'GET',
        headers: headers,
        redirect: 'follow'
      };

      if (isAjaxChapters) {
        // Se você passou o ID do mangá na URL do proxy (ex: &manga=13551)
        const mangaId = url.searchParams.get('manga'); 
        
        fetchOptions.method = 'POST';
        headers.set("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8");
        
        // O corpo EXATO que o WordPress/Mangalivre espera
        fetchOptions.body = new URLSearchParams({
          'action': 'manga_get_chapters',
          'manga': mangaId || '13551' // Se não enviar na URL, usa o do teste
        }).toString();
      }

      const response = await fetch(targetUrl, fetchOptions);
      let body = await response.text();

      // Se o corpo vier vazio ou "0", pode ser que o cookie no KV expirou
      if (isAjaxChapters && (body === "0" || body.trim() === "")) {
        return new Response("⚠️ O servidor retornou '0'. Verifique se o cookie cf_clearance no KV está atualizado!", { 
          status: 200, 
          headers: { "Content-Type": "text/plain; charset=UTF-8", "Access-Control-Allow-Origin": "*" } 
        });
      }

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
  
