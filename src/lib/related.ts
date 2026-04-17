/**
 * 相關文章推薦演算法
 *
 * 規則（建置指令第 286-288 行）：
 *   1. 同分類挑兩篇，不含當前這篇
 *   2. 按發布日期新到舊排
 *   3. 同分類不足兩篇 → 補其他分類的最新文章直到湊滿兩篇
 *
 * 草稿（draft=true）一律不出現。
 */

import type { CollectionEntry } from 'astro:content';

type Post = CollectionEntry<'posts'>;

export function getRelatedPosts(allPosts: Post[], current: Post, limit = 2): Post[] {
  // 排除當前文章和草稿，依日期新到舊
  // Astro 5 Content Layer：用 entry.id 取代舊版 entry.slug
  const candidates = allPosts
    .filter((p) => p.id !== current.id && !p.data.draft)
    .sort(
      (a, b) =>
        new Date(b.data.publishDate).getTime() - new Date(a.data.publishDate).getTime(),
    );

  // 先抓同分類
  const sameCategory = candidates.filter((p) => p.data.category === current.data.category);
  const picked = sameCategory.slice(0, limit);

  // 不夠就補其他分類的最新（不重複）
  if (picked.length < limit) {
    const fallback = candidates.filter((p) => !picked.includes(p)).slice(0, limit - picked.length);
    picked.push(...fallback);
  }

  return picked;
}
