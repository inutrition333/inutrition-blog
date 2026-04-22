// POST /api/delete
// 驗證密碼後，用 GitHub Contents API 刪除指定 slug 的文章檔案。

const REPO_OWNER = 'inutrition333';
const REPO_NAME  = 'inutrition-blog';
const BRANCH     = 'main';
const POSTS_DIR  = 'src/content/posts';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: '只接受 POST 請求' });
    return;
  }

  const password = process.env.PUBLISH_PASSWORD;
  const pat      = process.env.GITHUB_PAT;
  if (!password || !pat) {
    res.status(500).json({ error: '伺服器未設定環境變數' });
    return;
  }

  const body = req.body || {};
  if (!body.password || !safeEqual(body.password, password)) {
    res.status(401).json({ error: '密碼錯誤' });
    return;
  }

  const slug = sanitizeSlug(body.slug);
  if (!slug) {
    res.status(400).json({ error: '請提供要刪除的文章 slug' });
    return;
  }

  const path    = `${POSTS_DIR}/${slug}.md`;
  const apiBase = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents`;
  const headers = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${pat}`,
    'Content-Type': 'application/json',
    'User-Agent': 'inutrition-blog-publisher',
  };

  // 第一步：取得檔案的 SHA（刪除時必須提供）
  let sha;
  try {
    const getRes = await fetch(`${apiBase}/${encodeSlugPath(path)}?ref=${BRANCH}`, { headers });
    if (getRes.status === 404) {
      res.status(404).json({ error: `找不到文章「${slug}」，請確認 slug 是否正確` });
      return;
    }
    if (!getRes.ok) {
      res.status(500).json({ error: `GitHub 回應錯誤（${getRes.status}）` });
      return;
    }
    const data = await getRes.json();
    sha = data.sha;
  } catch (err) {
    res.status(500).json({ error: `取得檔案資訊失敗：${err.message}` });
    return;
  }

  // 第二步：刪除檔案
  try {
    const delRes = await fetch(`${apiBase}/${encodeSlugPath(path)}`, {
      method: 'DELETE',
      headers,
      body: JSON.stringify({
        message: `刪除文章：${slug}`,
        sha,
        branch: BRANCH,
      }),
    });
    if (!delRes.ok) {
      res.status(500).json({ error: '刪除失敗，請稍後再試或聯絡管理員' });
      return;
    }
    res.status(200).json({ ok: true, path });
  } catch (err) {
    res.status(500).json({ error: `刪除失敗：${err.message}` });
  }
}

function sanitizeSlug(raw) {
  if (!raw) return '';
  return String(raw)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

function encodeSlugPath(path) {
  return path.split('/').map(encodeURIComponent).join('/');
}

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
