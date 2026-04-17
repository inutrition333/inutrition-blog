import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import remarkDirective from 'remark-directive';
import { remarkBlocks } from './src/lib/remark-blocks.ts';

// remark plugin 順序：
//   1. remarkDirective  — 把 ::: 區塊 parse 成 containerDirective node
//   2. remarkBlocks     — 把 :::product / :::sunny / :::related 轉成 HTML
//                         （product 的 utm_campaign 會自動從這篇 frontmatter 帶）
export default defineConfig({
  site: 'https://blog.inutrition.com.tw',
  integrations: [mdx(), sitemap()],
  markdown: {
    remarkPlugins: [remarkDirective, remarkBlocks],
  },
});
