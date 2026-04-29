/**
 * Astro Content Collection Schema（Astro 5 Content Layer 版）
 *
 * 用 glob loader 載入 src/content/posts/ 下所有 .md / .mdx 檔。
 * Decap CMS 寫回的也是這個資料夾，所以後台和前台的 schema 必須一致。
 *
 * 改分類請同時改：
 *   1. 這個檔案的 CATEGORIES 常數
 *   2. public/admin/config.yml 的 select widget options
 *   3. README.md 的分類說明
 */

import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/** 固定六個分類（2026-04-29 新增「營養生活」） */
export const CATEGORIES = [
  '腸胃保健',
  '日常代謝',
  '美容養顏',
  '睡眠放鬆',
  '樂齡保養',
  '營養生活',
] as const;

export type Category = (typeof CATEGORIES)[number];

const postsCollection = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    category: z.enum(CATEGORIES),
    publishDate: z.coerce.date(),
    readTime: z.number().default(5),
    /** 主圖網址或專案內路徑（例如 /images/xxx.jpg），列表頁與 OG 都用 */
    heroImage: z.string().optional(),
    /** 文章列表頁顯示的摘要 */
    excerpt: z.string(),
    /** UTM campaign，建議用「主題_年月」形式，例如「益生菌三大誤解_202604」 */
    campaign: z.string(),
    /** 是否為精選文章（首頁可置頂） */
    featured: z.boolean().default(false),
    /** 為了讓使用者能保留草稿，建置時 draft=true 不會出現在站點 */
    draft: z.boolean().default(false),
  }),
});

export const collections = {
  posts: postsCollection,
};
