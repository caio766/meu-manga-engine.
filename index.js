export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');

    if (!targetUrl) {
      return new Response("Erro: Use ?url=LINK", { status: 400 });
    }

    const cookieFromKV = await env.mangalivre_session.get("mangalivre_cookie");
    const MY_USER_AGENT = "Mozilla/5.0 (Android 13; Mobile; rv:128.0) Gecko/128.0 Firefox/128.0";

    // Detecta se é a chamada específica de capítulos
    const isAjaxChapters = targetUrl.includes('admin-ajax.php') && targetUrl.includes('manga=');

    const headers = new Headers({
      "User-Agent": MY_USER_AGENT,
      "Cookie": cookieFromKV || "",
      "Accept": isAjaxChapters ? "*/*" : "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "pt-BR,pt;q=0.8,en-US;q=0.5,en;q=0.3",
      "Referer": "https://mangalivre.tv/",
      "X-Requested-With": "XMLHttpRequest"
    });

    // Limpeza de rastros para não ser detectado como bot/proxy
    headers.delete("cf-connecting-ip");
    headers.delete("x-forwarded-for");
    headers.delete("x-real-ip");
    headers.delete("cf-worker");

    try {
      let fetchOptions = {
        method: 'GET', // Padrão é GET para páginas normais
        headers: headers,
        redirect: 'follow'
      };

      // SE for o link de capítulos, o Worker "muta" para POST automaticamente
      if (isAjaxChapters) {
        const mangaUrl = new URL(targetUrl);
        const mangaId = mangaUrl.searchParams.get('manga');
        
        fetchOptions.method = 'POST';
        headers.set("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8");
        // Monta o corpo que o servidor espera
        fetchOptions.body = `action=manga_get_chapters&manga=${mangaId}`;
      }

      const response = await fetch(targetUrl, fetchOptions);
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
