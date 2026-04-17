/**
 * UTM 連結組裝工具
 *
 * 統一所有 CTA 按鈕的 UTM 參數命名規範，避免 GA 報表變成大雜燴。
 * 只要透過 buildUtmUrl 產生的連結，BaseLayout 的全站點擊監聽就會自動
 * 抓到 utm_content / utm_campaign 並送 GA 事件。
 */

export interface UtmOptions {
  /** 目的地網址（不含 query string；如果原本就有 ?，會自動接上 &） */
  baseUrl: string;
  /** utm_source，固定為 'blog' */
  source?: string;
  /** utm_medium，例如 product_card / end_cta / header / trust_link */
  medium: string;
  /** utm_campaign，通常是文章的 campaign 識別碼，例如「益生菌三大誤解_202604」 */
  campaign: string;
  /** utm_content，例如「纖暢益生菌_文末」、「文末_官網」 */
  content?: string;
}

/**
 * 組出帶完整 UTM 的網址。中文參數會自動 encode。
 * 例：buildUtmUrl({ baseUrl: 'https://x.com/p', medium: 'product_card', campaign: '益生菌_202604', content: '纖暢_文末' })
 */
export function buildUtmUrl({
  baseUrl,
  source = 'blog',
  medium,
  campaign,
  content,
}: UtmOptions): string {
  const url = new URL(baseUrl);
  url.searchParams.set('utm_source', source);
  url.searchParams.set('utm_medium', medium);
  url.searchParams.set('utm_campaign', campaign);
  if (content) url.searchParams.set('utm_content', content);
  return url.toString();
}
