export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');
    const mangaId = url.searchParams.get('manga'); // Pegamos o ID aqui

    if (!targetUrl) {
      return new Response("Erro: Use ?url=LINK", { status: 400 });
    }

    const cookieFromKV = await env.mangalivre_session.get("mangalivre_cookie");
    const MY_USER_AGENT = "Mozilla/5.0 (Android 13; Mobile; rv:128.0) Gecko/128.0 Firefox/128.0";

    const isAjax = targetUrl.includes('admin-ajax.php');

    // CONFIGURAÇÃO DE HEADERS DE ALTA FIDELIDADE
    const headers = new Headers({
      "User-Agent": MY_USER_AGENT,
      "Cookie": cookieFromKV || "",
      "Accept": isAjax ? "*/*" : "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "pt-BR,pt;q=0.8,en-US;q=0.5,en;q=0.3",
      // O SEGREDO: O Referer deve parecer que você veio da página do mangá, não da home
      "Referer": "https://mangalivre.tv/", 
      "X-Requested-With": "XMLHttpRequest",
      "Origin": "https://mangalivre.tv",
      "Sec-Fetch-Dest": isAjax ? "empty" : "document",
      "Sec-Fetch-Mode": isAjax ? "cors" : "navigate",
      "Sec-Fetch-Site": "same-origin"
    });

    // Limpeza de rastros da Cloudflare
    headers.delete("cf-connecting-ip");
    headers.delete("x-forwarded-for");
    headers.delete("x-real-ip");

    try {
      let fetchOptions = {
        method: isAjax ? 'POST' : 'GET',
        headers: headers,
        redirect: 'follow'
      };

      if (isAjax && mangaId) {
        headers.set("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8");
        // Precisamos enviar exatamente o que o script do site envia
        const formData = new URLSearchParams();
        formData.append('action', 'manga_get_chapters');
        formData.append('manga', mangaId);
        fetchOptions.body = formData.toString();
      }

      const response = await fetch(targetUrl, fetchOptions);
      const body = await response.text();

      // Se ainda der 0, vamos tentar um último truque: remover o X-Requested-With
      if (isAjax && body === "0") {
         return new Response("❌ O site ainda recusa (retornou 0). Isso geralmente significa que o ID do mangá está errado ou o Cookie não tem permissão para Ajax.", { status: 200 });
      }

      return new Response(body, {
        status: response.status,
        headers: {
          "Content-Type": "text/html; charset=UTF-8",
          "Access-Control-Allow-Origin": "*"
        }
      });

    } catch (e) {
      return new Response("Erro: " + e.message, { status: 500 });
    }
  }
};
      
