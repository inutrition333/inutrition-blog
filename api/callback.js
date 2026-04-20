// GitHub OAuth 回呼：GitHub 授權完會帶 code 跳回這裡
// 我們用 code + client secret 換 access_token，再用 postMessage 把 token 傳回開啟它的後台分頁
export default async function handler(req, res) {
  const { code, state } = req.query;
  const clientId = process.env.OAUTH_CLIENT_ID;
  const clientSecret = process.env.OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    res.status(500).send('OAuth env vars (OAUTH_CLIENT_ID / OAUTH_CLIENT_SECRET) not configured.');
    return;
  }

  const cookieHeader = req.headers.cookie || '';
  const cookieMatch = cookieHeader.match(/(?:^|;\s*)oauth_state=([^;]+)/);
  const cookieState = cookieMatch ? cookieMatch[1] : null;

  if (!code || !state || state !== cookieState) {
    res.status(400).send('Invalid OAuth state. 請重新登入。');
    return;
  }

  let token;
  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'inutrition-blog-oauth',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });
    const data = await tokenRes.json();
    if (data.error) {
      res.status(400).send(`GitHub OAuth error: ${data.error_description || data.error}`);
      return;
    }
    token = data.access_token;
  } catch (err) {
    res.status(500).send(`OAuth exchange failed: ${err.message}`);
    return;
  }

  const payload = JSON.stringify({ token, provider: 'github' });
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Signing in…</title></head><body><p>登入中，請稍候…</p><script>
(function(){
  var result = ${payload};
  function send(e){
    if(!window.opener){return;}
    window.opener.postMessage('authorization:github:success:' + JSON.stringify(result), e.origin);
    window.removeEventListener('message', send, false);
    setTimeout(function(){window.close();}, 500);
  }
  window.addEventListener('message', send, false);
  if(window.opener){
    window.opener.postMessage('authorizing:github', '*');
  } else {
    document.body.innerHTML = '<p>找不到原本的後台分頁，請關掉這個視窗重新登入。</p>';
  }
})();
</script></body></html>`;

  res.setHeader(
    'Set-Cookie',
    'oauth_state=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0'
  );
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
}
