/**
 * fetch-scores.js
 * 
 * 從 ESPN 公開 API 抓取 2026 FIFA 世界盃比分，更新 scores.json
 * 執行方式: node fetch-scores.js
 * 需要 Node.js 18+（原生支援 fetch）
 * 
 * ESPN API 端點完全免費，無需 API key
 */

import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCORES_PATH = join(__dirname, "scores.json");

// ESPN 公開端點 — 無需 key，2026 世界盃 league id = 21
const ESPN_URL =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?limit=200&dates=20260611-20260719";

// 球隊名稱對應表（ESPN 英文名 → 我們系統用的名稱）
const ESPN_NAME_MAP = {
  "Mexico": "Mexico",
  "South Africa": "South Africa",
  "Korea Republic": "South Korea",
  "Czech Republic": "Czechia",
  "Canada": "Canada",
  "Bosnia and Herzegovina": "Bosnia and Herzegovina",
  "Qatar": "Qatar",
  "Switzerland": "Switzerland",
  "Brazil": "Brazil",
  "Morocco": "Morocco",
  "Haiti": "Haiti",
  "Scotland": "Scotland",
  "United States": "United States",
  "Paraguay": "Paraguay",
  "Australia": "Australia",
  "Turkiye": "Turkey",
  "Germany": "Germany",
  "Curaçao": "Curacao",
  "Ivory Coast": "Ivory Coast",
  "Ecuador": "Ecuador",
  "Netherlands": "Netherlands",
  "Japan": "Japan",
  "Sweden": "Sweden",
  "Tunisia": "Tunisia",
  "Belgium": "Belgium",
  "Egypt": "Egypt",
  "Iran": "Iran",
  "New Zealand": "New Zealand",
  "Spain": "Spain",
  "Cape Verde": "Cape Verde",
  "Saudi Arabia": "Saudi Arabia",
  "Uruguay": "Uruguay",
  "France": "France",
  "Senegal": "Senegal",
  "Iraq": "Iraq",
  "Norway": "Norway",
  "Argentina": "Argentina",
  "Algeria": "Algeria",
  "Austria": "Austria",
  "Jordan": "Jordan",
  "Portugal": "Portugal",
  "DR Congo": "DR Congo",
  "Uzbekistan": "Uzbekistan",
  "Colombia": "Colombia",
  "England": "England",
  "Croatia": "Croatia",
  "Ghana": "Ghana",
  "Panama": "Panama"
};

// 根據主客隊名稱找到對應的 match id（依照 baseMatches 的順序定義）
const MATCH_KEY_MAP = [
  ["Mexico", "South Africa"],
  ["South Korea", "Czechia"],
  ["Canada", "Bosnia and Herzegovina"],
  ["United States", "Paraguay"],
  ["Haiti", "Scotland"],
  ["Australia", "Turkey"],
  ["Brazil", "Morocco"],
  ["Qatar", "Switzerland"],
  ["Ivory Coast", "Ecuador"],
  ["Germany", "Curacao"],
  ["Netherlands", "Japan"],
  ["Sweden", "Tunisia"],
  ["Saudi Arabia", "Uruguay"],
  ["Spain", "Cape Verde"],
  ["Iran", "New Zealand"],
  ["Belgium", "Egypt"],
  ["France", "Senegal"],
  ["Iraq", "Norway"],
  ["Argentina", "Algeria"],
  ["Austria", "Jordan"],
  ["Ghana", "Panama"],
  ["England", "Croatia"],
  ["Portugal", "DR Congo"],
  ["Uzbekistan", "Colombia"],
  ["Czechia", "South Africa"],
  ["Switzerland", "Bosnia and Herzegovina"],
  ["Canada", "Qatar"],
  ["Mexico", "South Korea"],
  ["Brazil", "Haiti"],
  ["Scotland", "Morocco"],
  ["Turkey", "Paraguay"],
  ["United States", "Australia"],
  ["Ecuador", "Germany"],
  ["Ivory Coast", "Curacao"],
  ["Japan", "Sweden"],
  ["Netherlands", "Tunisia"],
  ["Uruguay", "Spain"],
  ["Saudi Arabia", "Cape Verde"],
  ["Belgium", "New Zealand"],
  ["Iran", "Egypt"],
  ["Senegal", "Austria"],
  ["Norway", "Jordan"],
  ["France", "Iraq"],
  ["Argentina", "Algeria", "2nd"],
  ["Colombia", "England"],
  ["Panama", "Croatia"],
  ["Ghana", "Portugal"],
  ["DR Congo", "Uzbekistan"],
  ["South Africa", "Mexico", "2nd"],
  ["Czechia", "South Korea"],
  ["Bosnia and Herzegovina", "Qatar"],
  ["Switzerland", "Canada"],
  ["Morocco", "Brazil"],
  ["Haiti", "Scotland", "2nd"],
  ["Paraguay", "Australia"],
  ["Turkey", "United States"],
  ["Germany", "Ivory Coast"],
  ["Curacao", "Ecuador"],
  ["Tunisia", "Netherlands"],
  ["Sweden", "Japan"],
  ["Cape Verde", "Uruguay"],
  ["Spain", "Saudi Arabia"],
  ["New Zealand", "Belgium"],
  ["Egypt", "Iran"],
  ["Norway", "Senegal"],
  ["Jordan", "France"],
  ["Austria", "Iraq"],
  ["Algeria", "Argentina", "3rd"],
  ["Colombia", "Panama"],
  ["Croatia", "Ghana"],
  ["Portugal", "England"],
  ["Uzbekistan", "DR Congo"]
];

function matchKey(home, away) {
  const h = ESPN_NAME_MAP[home] || home;
  const a = ESPN_NAME_MAP[away] || away;
  const idx = MATCH_KEY_MAP.findIndex(([mh, ma]) => mh === h && ma === a);
  if (idx === -1) return null;
  return `m-${String(idx + 1).padStart(3, "0")}`;
}

async function fetchScores() {
  console.log("⚽ 抓取 ESPN 世界盃比分...");

  let data;
  try {
    const res = await fetch(ESPN_URL, {
      headers: { "User-Agent": "Mozilla/5.0 WorldCup-Score-Fetcher/1.0" }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
  } catch (err) {
    console.error("❌ ESPN API 請求失敗:", err.message);
    process.exit(1);
  }

  const events = data?.events || [];
  console.log(`📋 找到 ${events.length} 場賽事`);

  // 讀取現有 scores.json
  let existing = { scores: {} };
  try {
    existing = JSON.parse(readFileSync(SCORES_PATH, "utf8"));
  } catch {
    console.log("⚠️  scores.json 不存在，建立新檔");
  }

  const updated = { ...existing.scores };
  let newCount = 0;

  for (const event of events) {
    const competition = event.competitions?.[0];
    if (!competition) continue;

    const status = competition.status?.type?.name;
    // 只處理已完賽的
    if (status !== "STATUS_FINAL") continue;

    const competitors = competition.competitors || [];
    const home = competitors.find(c => c.homeAway === "home");
    const away = competitors.find(c => c.homeAway === "away");
    if (!home || !away) continue;

    const homeName = home.team?.displayName || home.team?.name || "";
    const awayName = away.team?.displayName || away.team?.name || "";
    const homeScore = home.score || "0";
    const awayScore = away.score || "0";
    const scoreStr = `${homeScore}-${awayScore}`;

    const id = matchKey(homeName, awayName);
    if (!id) {
      console.log(`  ⚠️  未對應: ${homeName} vs ${awayName}`);
      continue;
    }

    if (updated[id] !== scoreStr) {
      console.log(`  ✅ ${id}: ${homeName} ${scoreStr} ${awayName}`);
      updated[id] = scoreStr;
      newCount++;
    }
  }

  // 寫回 scores.json
  const output = {
    _comment: "由 GitHub Actions 自動更新，每小時執行一次。可手動覆蓋特定比賽比分。",
    _updated: new Date().toISOString(),
    scores: updated
  };

  writeFileSync(SCORES_PATH, JSON.stringify(output, null, 2), "utf8");
  console.log(`\n✅ scores.json 更新完成，新增/修改 ${newCount} 場比賽`);
  console.log(`📁 目前已有比分 ${Object.keys(updated).length} 場`);
}

fetchScores();
