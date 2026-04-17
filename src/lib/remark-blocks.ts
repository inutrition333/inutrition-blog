/**
 * remark plugin：把 markdown 內的 :::product / :::sunny / :::related 容器
 * 轉成對應的 HTML 區塊。
 *
 * 為什麼自己解析 YAML 而不是用 remark-directive 標準屬性語法？
 *   標準語法是 `::name[label]{key=value key2=value2}`，但屬性裡有中文、
 *   空白、特殊符號時要 escape，對非技術使用者非常不友善。
 *   YAML 風格的 key: value 多行寫法直覺很多。
 *
 * 使用方式（給使用者看）：
 *
 *   :::product
 *   image: /images/xian-chang.jpg
 *   title: 纖暢益生菌 — 專利三層包埋技術
 *   description: 這篇提到的菌種都有放進去，每包 300 億 CFU。
 *   meepshopUrl: https://www.inutrition.com.tw/pages/纖暢益生菌
 *   utmContent: 纖暢益生菌_文末
 *   :::
 *
 *   :::related slug=health-check-breakfast-tips
 *   體檢報告數字不太好看？營養師教你從早餐開始調整
 *   :::
 *
 *   :::sunny
 *   益生菌不是萬能的⋯⋯ 多吃膳食纖維才能定殖。
 *   （這裡可以寫多段 markdown，**粗體**、[連結](url) 都會生效）
 *   :::
 */

import { visit } from 'unist-util-visit';
import type { Root, Code, Html, Paragraph, Text } from 'mdast';
import { toHast } from 'mdast-util-to-hast';
import { toHtml } from 'hast-util-to-html';
import {
  renderProductCard,
  renderSunnyNote,
  renderRelatedLink,
  type ProductCardProps,
} from './markdown-blocks';

// remark-directive 會把 ::: 區塊掛成這個 type
interface ContainerDirective {
  type: 'containerDirective';
  name: string;
  attributes?: Record<string, string>;
  children: any[];
  data?: { hProperties?: Record<string, unknown> };
}

/**
 * 把 directive 內的純文字當 YAML key: value 解析
 * 簡單版：每行一個 key: value，value 從第一個 ':' 之後到行尾，trim 過
 */
function parseYamlBlock(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = text.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;
    const key = trimmed.slice(0, colonIdx).trim();
    const value = trimmed.slice(colonIdx + 1).trim();
    if (key) result[key] = value;
  }
  return result;
}

/** 把 directive 的所有 children 拼回原始文字（給 product 用 YAML 解析） */
function collectText(children: any[]): string {
  const parts: string[] = [];
  visit({ type: 'root', children } as Root, 'text', (node: Text) => {
    parts.push(node.value);
  });
  // 段落間補換行（避免兩個 key:value 連在一起）
  const paragraphs: string[] = [];
  for (const child of children) {
    if (child.type === 'paragraph') {
      const lineParts: string[] = [];
      visit(child as Paragraph, 'text', (n: Text) => lineParts.push(n.value));
      paragraphs.push(lineParts.join(''));
    } else if (child.type === 'text') {
      paragraphs.push((child as Text).value);
    } else if (child.type === 'code') {
      paragraphs.push((child as Code).value);
    }
  }
  return paragraphs.join('\n');
}

/**
 * 把 directive 的 children 用 markdown processor 處理成 HTML 字串
 * 因為 remark plugin 跑的時候還沒 render，這裡用 mdast-util-to-hast + hast-util-to-html
 */
function childrenToHtml(children: any[]): string {
  const root: Root = { type: 'root', children };
  const hast = toHast(root, { allowDangerousHtml: true });
  if (!hast) return '';
  return toHtml(hast, { allowDangerousHtml: true });
}

/**
 * 主 plugin 工廠。
 * 同步版本——避免 Vite 在 build 結尾關掉 module runner 後才被呼叫到。
 *
 * file 參數是 vfile，Astro 會把這篇 markdown 的 frontmatter 注入到
 * file.data.astro.frontmatter，我們從那邊讀 campaign 給 product card 用。
 */
export function remarkBlocks() {
  return function transformer(tree: Root, file: any) {
    const frontmatterCampaign: string | undefined =
      file?.data?.astro?.frontmatter?.campaign;

    // 先收集所有要處理的 node（避免一邊 visit 一邊改 tree 引發異常）
    const targets: ContainerDirective[] = [];
    visit(tree, (node: any) => {
      if (node.type === 'containerDirective') {
        const name = (node as ContainerDirective).name;
        if (name === 'product' || name === 'sunny' || name === 'related') {
          targets.push(node as ContainerDirective);
        }
      }
    });

    for (const node of targets) {
      const name = node.name;

      if (name === 'product') {
        const text = collectText(node.children);
        const fields = parseYamlBlock(text);
        const props: ProductCardProps = {
          image: fields.image || undefined,
          imageAlt: fields.imageAlt || undefined,
          tag: fields.tag || undefined,
          title: fields.title || '（缺少 title）',
          description: fields.description || '',
          meepshopUrl: fields.meepshopUrl || 'https://www.inutrition.com.tw/',
          utmContent: fields.utmContent || 'unknown',
          // 優先序：directive 內顯式寫的 campaign > 文章 frontmatter > fallback
          campaign: fields.campaign || frontmatterCampaign || 'unknown_campaign',
          ctaText: fields.ctaText || undefined,
        };
        const html = renderProductCard(props);
        replaceNodeWithHtml(node, html);
        continue;
      }

      if (name === 'sunny') {
        const html = childrenToHtml(node.children);
        const out = renderSunnyNote({
          title: node.attributes?.title,
          htmlContent: html,
        });
        replaceNodeWithHtml(node, out);
        continue;
      }

      if (name === 'related') {
        // slug 從 directive 屬性拿（::related{slug=foo}）；標題用 children 文字
        const slug = node.attributes?.slug || '';
        const title = collectText(node.children).trim() || slug;
        const out = renderRelatedLink({ slug, title });
        replaceNodeWithHtml(node, out);
        continue;
      }
    }
  };
}

/** in-place 把 directive node 改成 type=html 的 raw HTML node */
function replaceNodeWithHtml(node: ContainerDirective, html: string) {
  const htmlNode = node as unknown as Html;
  htmlNode.type = 'html';
  (htmlNode as any).value = html;
  // 清掉原本 directive 的屬性
  delete (node as any).name;
  delete (node as any).attributes;
  delete (node as any).children;
  delete (node as any).data;
}

