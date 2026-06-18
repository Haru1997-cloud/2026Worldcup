# 2026 FIFA 世界盃 AI 運彩分析台

## 部署到 Netlify（一次性設定）

### 第一步：把這個資料夾推上 GitHub

1. 在 [github.com](https://github.com) 建立一個新 repo（名稱例如 `worldcup-ai`）
2. 把這個資料夾的所有檔案上傳進去（或用 git push）

### 第二步：連接 Netlify

1. 打開 [netlify.com](https://netlify.com) → 免費註冊
2. "Add new site" → "Import an existing project" → 選 GitHub
3. 選剛才建立的 repo
4. Build settings 全部留空（這是純靜態網站）
5. 點 Deploy

### 第三步：啟用 GitHub Actions 自動比分更新

GitHub Actions 已經在 `.github/workflows/update-scores.yml` 設定好了，**每小時自動執行一次**。

唯一需要做的是給 Actions 推送權限：
1. 進入你的 GitHub repo → Settings → Actions → General
2. 在 "Workflow permissions" 選 **"Read and write permissions"**
3. 儲存

之後每當 `scores.json` 有更新，Netlify 會自動重新部署（約 30 秒）。

---

## 手動更新比分（備用方法）

如果 ESPN API 哪天抓不到，可以直接編輯 `scores.json`：

```json
{
  "scores": {
    "m-001": "2-0",
    "m-002": "2-1"
  }
}
```

match ID 對應關係：`m-001` = 第一場（Mexico vs South Africa），依序類推。

---

## 檔案結構

```
├── index.html          # 主頁面（不需修改）
├── styles.css          # 樣式（不需修改）
├── app.js              # 主程式（含完整賽程到 7/19）
├── config.js           # 設定（可選填 live feed URL）
├── scores.json         # ⭐ 比分資料，由 GitHub Actions 自動更新
├── fetch-scores.js     # ESPN 爬蟲腳本（GitHub Actions 使用）
├── package.json        # Node.js 環境設定
└── .github/
    └── workflows/
        └── update-scores.yml  # 每小時自動抓分
```
