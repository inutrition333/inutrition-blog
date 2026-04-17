/**
 * 分類列表 + 每個分類的文章計數
 *
 * 給 CategorySidebar、首頁、分類頁三個地方用。
 * 「全部文章」永遠是第一項；草稿（draft=true）不計入任何分類。
 */

import type { CollectionEntry } from 'astro:content';
import { CATEGORIES, type Category } from '../content/config';

export type CategoryName = Category | '全部文章';

export interface CategoryItem {
  /** 顯示用名稱（中文） */
  name: CategoryName;
  /** URL 路徑（全部文章 → /；其他 → /categories/[encoded-name]） */
  href: string;
  /** 該分類底下的文章數（已濾掉草稿） */
  count: number;
}

export function getCategoryList(allPosts: CollectionEntry<'posts'>[]): CategoryItem[] {
  const visiblePosts = allPosts.filter((p) => !p.data.draft);

  const items: CategoryItem[] = [
    {
      name: '全部文章',
      href: '/',
      count: visiblePosts.length,
    },
  ];

  for (const cat of CATEGORIES) {
    items.push({
      name: cat,
      href: `/categories/${encodeURIComponent(cat)}/`,
      count: visiblePosts.filter((p) => p.data.category === cat).length,
    });
  }

  return items;
}
