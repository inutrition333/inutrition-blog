/**
 * 三種文章內 directive 的 HTML 模板
 *
 * 是「single source of truth」——remark plugin 和 .astro 元件都呼叫這裡的函數，
 * 確保使用者用 :::product 寫的卡片，跟未來在 .astro 頁面手動放的 ProductCard
 * 長得 100% 一樣（避免兩份維護的災難）。
 *
 * 這裡的函數只回傳 HTML 字串，不負責 escape MARKDOWN 內容（remark 那邊已經處理）。
 * 但屬性裡的字串值還是要 escape HTML，避免 XSS 或 HTML 結構壞掉。
 */

import { buildUtmUrl } from './utm';

/** HTML attribute 用的 escape——把 & < > " ' 換成 entity */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ===== ProductCard =====

export interface ProductCardProps {
  /** 產品圖網址或專案內路徑（/images/xxx.jpg）。可留空，會顯示漸層底色 */
  image?: string;
  /** 圖片 alt（無障礙） */
  imageAlt?: string;
  /** 暖棕色小標籤，預設「Sunny 營養師自家開發」 */
  tag?: string;
  /** 產品名稱 */
  title: string;
  /** 產品描述 */
  description: string;
  /** MeepShop 產品頁網址（不含 utm） */
  meepshopUrl: string;
  /** utm_content，例如「纖暢益生菌_文末」 */
  utmContent: string;
  /** utm_campaign，從文章 frontmatter 的 campaign 欄位帶進來 */
  campaign: string;
  /** CTA 按鈕文字，預設「看看價格與組合」 */
  ctaText?: string;
}

export function renderProductCard(props: ProductCardProps): string {
  const {
    image,
    imageAlt,
    tag = 'Sunny 營養師自家開發',
    title,
    description,
    meepshopUrl,
    utmContent,
    campaign,
    ctaText = '開始每天的營養補給',
  } = props;

  const ctaUrl = buildUtmUrl({
    baseUrl: meepshopUrl,
    medium: 'product_card',
    campaign,
    content: utmContent,
  });

  // 信任聲明的「官網」連結也要帶 UTM
  const trustUrl = buildUtmUrl({
    baseUrl: 'https://www.inutrition.com.tw/',
    medium: 'trust_link',
    campaign,
    content: 'product_card_trust',
  });

  const imageBlock = image
    ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(imageAlt ?? title)}" loading="lazy" />`
    : escapeHtml(title);

  return `<div class="product-card">
  <div class="product-card-inner">
    <div class="product-card-image">${imageBlock}</div>
    <div class="product-card-content">
      <span class="product-card-tag">${escapeHtml(tag)}</span>
      <h4>${escapeHtml(title)}</h4>
      <p>${escapeHtml(description)}</p>
      <a class="product-card-cta" href="${escapeHtml(ctaUrl)}" target="_top" rel="noopener">${escapeHtml(ctaText)}</a>
      <div class="product-trust">🔍 <strong>每批產品都送第三方檢驗</strong>，報告公開在<a href="${escapeHtml(trustUrl)}" target="_top" rel="noopener">官網</a>上可以查。</div>
    </div>
  </div>
</div>`;
}

// ===== SunnyNote =====

export interface SunnyNoteProps {
  /** 標題，預設「Sunny 營養師的小叮嚀」 */
  title?: string;
  /** 內文（已經是 HTML 字串，由 remark 處理過 markdown） */
  htmlContent: string;
}

export function renderSunnyNote({
  title = 'Sunny 營養師的小叮嚀',
  htmlContent,
}: SunnyNoteProps): string {
  return `<div class="sunny-note">
  <div class="note-title">${escapeHtml(title)}</div>
  ${htmlContent}
</div>`;
}

// ===== RelatedLink =====

export interface RelatedLinkProps {
  /** 目標文章 slug，會組成 /posts/{slug} */
  slug: string;
  /** 顯示文字（通常就是目標文章標題） */
  title: string;
  /** 小字標籤，預設「延伸閱讀」 */
  label?: string;
}

export function renderRelatedLink({
  slug,
  title,
  label = '延伸閱讀',
}: RelatedLinkProps): string {
  const href = `/posts/${encodeURIComponent(slug)}`;
  return `<a class="related-link" href="${escapeHtml(href)}">
  <span class="related-label">${escapeHtml(label)}</span>
  <span class="related-title">${escapeHtml(title)}</span>
</a>`;
}
