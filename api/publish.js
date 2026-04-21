// POST /api/publish
// 接收 /write 頁面的發文表單，驗證密碼後把新文章 commit 到 GitHub。
//
// 所需環境變數（在 Vercel → Settings → Environment Variables 設定）：
//   - PUBLISH_PASSWORD — 老闆/管理員知道的共用密碼
//   - GITHUB_PAT       — Fine-grained Personal Access Token，對 inutrition-blog 有「Contents: Read & Write」
//
// 驗證失敗 → 401；其他錯誤 → 500 + 中文訊息，讓前端直接顯示給使用者。

const REPO_OWNER = 'inutrition333';
const REPO_NAME = 'inutrition-blog';
const BRANCH = 'main';
const POSTS_DIR = 'src/content/posts';
const CATEGORIES = [
  '體態管理',
  '腸胃保健',
  '代謝循環',
  '美容養顏',
  '睡眠放鬆',
  '銀髮族保養',
];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: '只接受 POST 請求' });
    return;
  }

  const password = process.env.PUBLISH_PASSWORD;
  const pat = process.env.GITHUB_PAT;
  if (!password || !pat) {
    res.status(500).json({ error: '伺服器未設定 PUBLISH_PASSWORD 或 GITHUB_PAT 環境變數' });
    return;
  }

  const body = req.body || {};

  // 驗證密碼（常數時間比較，避免 timing attack）
  if (!body.password || !safeEqual(body.password, password)) {
    res.status(401).json({ error: '密碼錯誤' });
    return;
  }

  // ping 模式：只做密碼驗證（登入用）
  if (body.ping) {
    res.status(200).json({ ok: true });
    return;
  }

  // 檢查必填欄位
  const title = (body.title || '').trim();
  const excerpt = (body.excerpt || '').trim();
  const content = body.body || '';
  if (!title || !excerpt || !content.trim()) {
    res.status(400).json({ error: '標題、摘要、內文都必填' });
    return;
  }

  const category = CATEGORIES.includes(body.category) ? body.category : CATEGORIES[0];

  // 日期：接受 YYYY-MM-DD，不合法就用今天
  const publishDate = /^\d{4}-\d{2}-\d{2}$/.test(body.publishDate)
    ? body.publishDate
    : new Date().toISOString().slice(0, 10);

  const readTime = Math.max(1, Math.min(30, parseInt(body.readTime, 10) || 6));

  // slug：使用者提供的會被 sanitize；沒提供就自動產生
  let slug = sanitizeSlug(body.slug);
  if (!slug) {
    slug = `${publishDate}-${randomHex(6)}`;
  }

  // campaign：使用者提供的限制字元；沒提供用 title 前 12 字 + 年月
  let campaign = (body.campaign || '').trim().replace(/[^\w\u4e00-\u9fff_-]/g, '');
  if (!campaign) {
    const yyyymm = publishDate.slice(0, 7).replace('-', '');
    campaign = `${title.slice(0, 12)}_${yyyymm}`.replace(/[^\w\u4e00-\u9fff_-]/g, '');
  }

  const heroImage = (body.heroImage || '').trim();
  const draft = !!body.draft;

  // 組 frontmatter（用 JSON.stringify 產生 YAML-compatible 的字串 literal）
  const fm = [
    '---',
    `title: ${yamlStr(title)}`,
    `category: ${yamlStr(category)}`,
    `publishDate: ${publishDate}`,
    `readTime: ${readTime}`,
    heroImage ? `heroImage: ${yamlStr(heroImage)}` : null,
    `excerpt: ${yamlStr(excerpt)}`,
    `campaign: ${yamlStr(campaign)}`,
    'featured: false',
    draft ? 'draft: true' : null,
    '---',
    '',
  ]
    .filter(Boolean)
    .join('\n');

  const fullMarkdown = fm + '\n' + content.trim() + '\n';
  const path = `${POSTS_DIR}/${slug}.md`;

  // 呼叫 GitHub Contents API 建立新檔案
  try {
    const apiUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}`;
    const ghRes = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${pat}`,
        'Content-Type': 'application/json',
        'User-Agent': 'inutrition-blog-publisher',
      },
      body: JSON.stringify({
        message: `新文章：${title}`,
        content: Buffer.from(fullMarkdown, 'utf8').toString('base64'),
        branch: BRANCH,
      }),
    });

    if (ghRes.status === 422 || ghRes.status === 409) {
      res.status(409).json({
        error: `檔名 ${slug}.md 已經存在，請到進階欄位改一個不同的 slug`,
      });
      return;
    }
    if (!ghRes.ok) {
      const errText = await ghRes.text().catch(() => '');
      res.status(500).json({
        error: `GitHub 回應錯誤（${ghRes.status}）：${errText.slice(0, 200)}`,
      });
      return;
    }
    const data = await ghRes.json();
    res.status(200).json({
      ok: true,
      path,
      commitUrl: data.commit?.html_url || null,
    });
  } catch (err) {
    res.status(500).json({ error: `發文失敗：${err.message}` });
  }
}

// ===== 工具 =====

/** YAML 字串：用 JSON.stringify 產生合法的 double-quoted 字串 literal */
function yamlStr(s) {
  return JSON.stringify(s);
}

/** slug 淨化：只留 a-z 0-9 - 以及底線，長度 1~80 */
function sanitizeSlug(raw) {
  if (!raw) return '';
  const s = String(raw)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
  return s;
}

function randomHex(n) {
  const chars = 'abcdef0123456789';
  let out = '';
  for (let i = 0; i < n; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

/** 常數時間字串比較（避免 timing attack） */
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
