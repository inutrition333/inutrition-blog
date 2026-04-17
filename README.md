# 愛營養 iNutrition 部落格

Sunny 營養師的保健筆記部落格，用 Astro 靜態生成，Decap CMS 當後台，部署在 Vercel。

## 目前建置進度

- **Phase 1（完成）**：Astro 骨架、CSS 變數、BaseLayout
- Phase 2（下一步）：文章頁（PostLayout）+ 所有文章元件
- Phase 3：首頁 + 側邊欄 + 作者卡 + 文章卡
- Phase 4：分類頁動態路由
- Phase 5：範例文章（跑通 `:::product` / `:::related` / `:::sunny` 語法）
- Phase 6：Decap CMS 後台
- Phase 7：新手操作手冊
- Phase 8：Vercel 部署
- Phase 9：GA、滾動進度條、相關文章推薦演算法

## 首次設定（非技術使用者不用看這段，我會帶您做）

```bash
# 1. 安裝 Node.js 20+（還沒裝的話）
#    https://nodejs.org 下載 LTS 版，一路下一步

# 2. 在本專案資料夾安裝套件
npm install

# 3. 啟動開發伺服器，瀏覽器打開 http://localhost:4321
npm run dev

# 4. 要產出可部署的靜態檔案
npm run build
```

## 環境變數

部署到 Vercel 後在後台設：

- `PUBLIC_GA_ID`（選填）—— GA4 的追蹤 ID，例如 `G-XXXXXXXXXX`。沒設就不載 GA。

## 分類清單

固定六個分類（2026-04-16 版）：

1. 體態管理
2. 腸胃保健
3. 代謝循環
4. 美容養顏
5. 睡眠放鬆
6. 銀髮族保養

要改分類 → 需要請工程師同時改 `src/content/config.ts` 和 `public/admin/config.yml`。
