// POST /api/upload
// 驗證密碼後，把圖片（base64）上傳到 GitHub repo 的 public/images/uploads/

const REPO_OWNER = 'inutrition333';
const REPO_NAME  = 'inutrition-blog';
const BRANCH     = 'main';
const UPLOAD_DIR = 'public/images/uploads';

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

  const { filename, content } = body;
  if (!filename || !content) {
    res.status(400).json({ error: '請提供 filename 和 content（base64）' });
    return;
  }

  const safeName = sanitizeFilename(filename);
  if (!safeName) {
    res.status(400).json({ error: '檔名格式不正確' });
    return;
  }

  // 檔案大小限制：5MB（base64 後約 6.7MB）
  if (content.length > 7 * 1024 * 1024) {
    res.status(400).json({ error: '圖片太大，請壓縮到 5MB 以下再上傳' });
    return;
  }

  const filePath = `${UPLOAD_DIR}/${safeName}`;
  const apiUrl   = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${encodeFilePath(filePath)}`;
  const headers  = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${pat}`,
    'Content-Type': 'application/json',
    'User-Agent': 'inutrition-blog-publisher',
  };

  // 檢查檔案是否已存在（取得 sha 以便覆蓋）
  let sha;
  try {
    const checkRes = await fetch(`${apiUrl}?ref=${BRANCH}`, { headers });
    if (checkRes.ok) {
      const data = await checkRes.json();
      sha = data.sha;
    }
  } catch (_) {}

  // 上傳
  try {
    const uploadBody = {
      message: `上傳圖片：${safeName}`,
      content,
      branch: BRANCH,
      ...(sha ? { sha } : {}),
    };
    const upRes = await fetch(apiUrl, {
      method: 'PUT',
      headers,
      body: JSON.stringify(uploadBody),
    });
    if (!upRes.ok) {
      const errText = await upRes.text().catch(() => '');
      res.status(500).json({ error: `上傳失敗（${upRes.status}）：${errText.slice(0, 200)}` });
      return;
    }
    res.status(200).json({ ok: true, path: `/images/uploads/${safeName}` });
  } catch (err) {
    res.status(500).json({ error: `上傳失敗：${err.message}` });
  }
}

function sanitizeFilename(raw) {
  if (!raw) return '';
  // 保留副檔名，只清理檔名部分
  const ext = raw.match(/\.(jpe?g|png|webp|gif)$/i)?.[0]?.toLowerCase() || '';
  if (!ext) return '';
  const base = raw.slice(0, raw.length - ext.length)
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
  if (!base) return '';
  return base + ext;
}

function encodeFilePath(path) {
  return path.split('/').map(encodeURIComponent).join('/');
}

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
