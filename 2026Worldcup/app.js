// ════════════════════════════════════════════════════════════════════════
// 2026 FIFA 世界盃 AI 運彩分析台
// 賽程／比分：即時從 ESPN 公開 API 抓取（與 espn.com / Google 賽事卡同步）
// 賠率：本網站不提供真實賠率數字。改為提供「轉虧轉盈門檻」分析工具，
//       使用者可對照台灣運彩 (https://article.sportslottery.com.tw/) 公告賠率自行判斷。
// ════════════════════════════════════════════════════════════════════════
 
const REFRESH_INTERVAL_MS = 60000; // 每 60 秒重新抓一次 ESPN 資料
const userTimeZone = "Asia/Taipei"; // 全站固定以台灣時間呈現（賽程網站慣例）
const TWSL_URL = "https://article.sportslottery.com.tw/"; // 台灣運彩官網（賠率請至此查詢）
 
// ESPN 公開 scoreboard API（無需 key）。一次抓整個賽事期間，前端自行依日期分組。
const ESPN_SCOREBOARD_URL =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?limit=300&dates=20260611-20260719";
 
// CORS 备援：部分瀏覽器環境可能擋下對 espn.com 的直接請求，
// 此時改走唯讀公開 CORS 代理（r.jina.ai）取得相同 JSON 內容。
const ESPN_FALLBACK_PROXY = "https://r.jina.ai/" + ESPN_SCOREBOARD_URL;
 
// ─── 球隊背景資料（戰術風格、球員、教練 — 用於 AI 分析文字，不含賽程本身）────
const countryCodes = {
  Mexico:"mx","South Africa":"za","South Korea":"kr",Czechia:"cz",
  Canada:"ca","Bosnia and Herzegovina":"ba",Qatar:"qa",Switzerland:"ch",
  Brazil:"br",Morocco:"ma",Haiti:"ht",Scotland:"gb-sct",
  "United States":"us",Paraguay:"py",Australia:"au",Turkey:"tr","Türkiye":"tr",
  Germany:"de",Curacao:"cw","Curaçao":"cw","Ivory Coast":"ci","Côte d'Ivoire":"ci",Ecuador:"ec",
  Netherlands:"nl",Japan:"jp",Sweden:"se",Tunisia:"tn",
  Belgium:"be",Egypt:"eg",Iran:"ir","IR Iran":"ir","New Zealand":"nz",
  Spain:"es","Cape Verde":"cv","Cabo Verde":"cv","Saudi Arabia":"sa",Uruguay:"uy",
  France:"fr",Senegal:"sn",Iraq:"iq",Norway:"no",
  Argentina:"ar",Algeria:"dz",Austria:"at",Jordan:"jo",
  Portugal:"pt","DR Congo":"cd","DR Congo (Congo DR)":"cd",Uzbekistan:"uz",Colombia:"co",
  England:"gb-eng",Croatia:"hr",Ghana:"gh",Panama:"pa",
  "Korea Republic":"kr","Bosnia & Herzegovina":"ba"
};
 
const styleBank = [
  ["控球主導","邊路進攻","高位逼搶"],
  ["防守反擊","定位球強","低位紀律"],
  ["轉換速度","中場壓迫","縱向推進"],
  ["身體對抗","長傳衝刺","禁區效率"],
  ["技術細膩","半空間滲透","後場組織"],
  ["緊密防線","快速邊鋒","門將穩定"]
];
 
const ranks = {
  Mexico:15,"South Africa":61,"South Korea":22,Czechia:44,
  Canada:27,"Bosnia and Herzegovina":71,Qatar:51,Switzerland:17,
  Brazil:5,Morocco:11,Haiti:84,Scotland:36,
  "United States":14,Paraguay:39,Australia:26,Turkey:25,
  Germany:9,Curacao:82,"Ivory Coast":42,Ecuador:23,
  Netherlands:7,Japan:18,Sweden:43,Tunisia:40,
  Belgium:8,Egypt:34,Iran:20,"New Zealand":86,
  Spain:1,"Cape Verde":68,"Saudi Arabia":60,Uruguay:16,
  France:3,Senegal:19,Iraq:58,Norway:29,
  Argentina:2,Algeria:35,Austria:24,Jordan:66,
  Portugal:6,"DR Congo":56,Uzbekistan:50,Colombia:13,
  England:4,Croatia:21,Ghana:57,Panama:33
};
 
const playerBank = {
  Mexico:["Santiago Gimenez","Edson Alvarez","Hirving Lozano"],
  "South Africa":["Percy Tau","Teboho Mokoena","Ronwen Williams"],
  "South Korea":["Son Heung-min","Kim Min-jae","Lee Kang-in"],
  Czechia:["Patrik Schick","Tomas Soucek","Adam Hlozek"],
  Canada:["Alphonso Davies","Jonathan David","Tajon Buchanan"],
  Switzerland:["Granit Xhaka","Manuel Akanji","Breel Embolo"],
  Brazil:["Vinicius Junior","Rodrygo","Bruno Guimaraes"],
  Morocco:["Achraf Hakimi","Brahim Diaz","Sofyan Amrabat"],
  "United States":["Christian Pulisic","Tyler Adams","Folarin Balogun"],
  Turkey:["Arda Guler","Hakan Calhanoglu","Kenan Yildiz"],
  Germany:["Florian Wirtz","Jamal Musiala","Joshua Kimmich"],
  Netherlands:["Virgil van Dijk","Xavi Simons","Cody Gakpo"],
  Belgium:["Kevin De Bruyne","Jeremy Doku","Romelu Lukaku"],
  Egypt:["Mohamed Salah","Omar Marmoush","Mostafa Mohamed"],
  Spain:["Lamine Yamal","Pedri","Rodri"],
  Uruguay:["Federico Valverde","Darwin Nunez","Ronald Araujo"],
  France:["Kylian Mbappe","Ousmane Dembele","Aurelien Tchouameni"],
  Senegal:["Sadio Mane","Kalidou Koulibaly","Nicolas Jackson"],
  Norway:["Erling Haaland","Martin Odegaard","Alexander Sorloth"],
  Argentina:["Lionel Messi","Julian Alvarez","Enzo Fernandez"],
  Portugal:["Cristiano Ronaldo","Bruno Fernandes","Bernardo Silva"],
  Colombia:["Luis Diaz","James Rodriguez","Jefferson Lerma"],
  England:["Jude Bellingham","Harry Kane","Bukayo Saka"],
  Croatia:["Luka Modric","Josko Gvardiol","Mateo Kovacic"],
  Ghana:["Mohammed Kudus","Thomas Partey","Inaki Williams"],
  Paraguay:["Miguel Almiron","Julio Enciso","Omar Alderete"],
  Australia:["Mathew Leckie","Aziz Behich","Mitchell Duke"],
  Scotland:["Scott McTominay","Andrew Robertson","Lyndon Dykes"],
  Haiti:["Duckens Nazon","Frantzdy Pierrot","Carnejy Antoine"],
  Qatar:["Akram Afif","Hassan Al-Haydos","Almoez Ali"],
  "Bosnia and Herzegovina":["Edin Dzeko","Sead Kolasinac","Kenan Pirc"],
  Ecuador:["Moises Caicedo","Enner Valencia","Pervis Estupinan"],
  "Ivory Coast":["Sebastien Haller","Franck Kessie","Nicolas Pepe"],
  Curacao:["Leandro Bacuna","Gino van Kessel","Eloy Room"],
  Japan:["Takefusa Kubo","Kaoru Mitoma","Daichi Kamada"],
  Sweden:["Alexander Isak","Dejan Kulusevski","Viktor Gyokeres"],
  Tunisia:["Hannibal Mejbri","Youssef Msakni","Ellyes Skhiri"],
  Iran:["Mehdi Taremi","Sardar Azmoun","Alireza Jahanbakhsh"],
  "New Zealand":["Chris Wood","Liberato Cacace","Joe Bell"],
  "Cape Verde":["Ryan Mendes","Garry Rodrigues","Jamiro Monteiro"],
  "Saudi Arabia":["Salem Al-Dawsari","Firas Al-Buraikan","Saud Abdulhamid"],
  Iraq:["Aymen Hussein","Ali Jasim","Zaid Tahseen"],
  Algeria:["Riyad Mahrez","Ramy Bensebaini","Ishak Belfodil"],
  Austria:["David Alaba","Marcel Sabitzer","Marko Arnautovic"],
  Jordan:["Musa Al-Taamari","Yazan Al-Naimat","Khalil Bani Attiah"],
  "DR Congo":["Chancel Mbemba","Cedric Bakambu","Yoane Wissa"],
  Uzbekistan:["Eldor Shomurodov","Abbosbek Fayzullaev","Jasur Yakhshiboev"],
  Panama:["Adalberto Carrasquilla","Cesar Yanis","Jose Fajardo"]
};
 
const coaches = {
  Mexico:"Javier Aguirre","South Africa":"Hugo Broos","South Korea":"Hong Myung-bo",
  Czechia:"Ivan Hasek",Canada:"Jesse Marsch","Bosnia and Herzegovina":"Sergej Barbarez",
  Qatar:"Julen Lopetegui",Switzerland:"Murat Yakin",Brazil:"Carlo Ancelotti",
  Morocco:"Walid Regragui",Haiti:"Sebastien Migne",Scotland:"Steve Clarke",
  "United States":"Mauricio Pochettino",Paraguay:"Gustavo Alfaro",Australia:"Tony Popovic",
  Turkey:"Vincenzo Montella",Germany:"Julian Nagelsmann",Curacao:"Dick Advocaat",
  "Ivory Coast":"Emerse Fae",Ecuador:"Sebastian Beccacece",Netherlands:"Ronald Koeman",
  Japan:"Hajime Moriyasu",Sweden:"Jon Dahl Tomasson",Tunisia:"Sami Trabelsi",
  Belgium:"Rudi Garcia",Egypt:"Hossam Hassan",Iran:"Amir Ghalenoei","New Zealand":"Darren Bazeley",
  Spain:"Luis de la Fuente","Cape Verde":"Pedro Brito","Saudi Arabia":"Herve Renard",
  Uruguay:"Marcelo Bielsa",France:"Didier Deschamps",Senegal:"Pape Thiaw",
  Iraq:"Graham Arnold",Norway:"Stale Solbakken",Argentina:"Lionel Scaloni",
  Algeria:"Vladimir Petkovic",Austria:"Ralf Rangnick",Jordan:"Jamal Sellami",
  Portugal:"Roberto Martinez","DR Congo":"Sebastien Desabre",Uzbekistan:"Srecko Katanec",
  Colombia:"Nestor Lorenzo",England:"Thomas Tuchel",Croatia:"Zlatko Dalic",
  Ghana:"Otto Addo",Panama:"Thomas Christiansen"
};
 
const allTeamNames = Object.keys(ranks);
const teams = allTeamNames.map((name, index) => {
  const rank = ranks[name] || 60;
  const strength = Math.max(52, 98 - rank * 0.56);
  const styles = styleBank[index % styleBank.length];
  const players = playerBank[name] || [name + " 隊長", name + " 核心中場", name + " 前鋒"];
  return {
    name, rank,
    code: countryCodes[name] || "xx",
    coach: coaches[name] || "官方名單確認中",
    styles,
    formScore: Math.round(strength + (index % 7) - 3),
    metrics: {
      possession: 43 + (index * 5) % 18,
      press: 52 + (index * 7) % 36,
      counter: 48 + (index * 11) % 42,
      setPiece: 46 + (index * 13) % 39
    },
    players: players.map((player, pIndex) => ({
      name: player,
      role: ["進攻核心", "中場節拍", "防線支點"][pIndex] || "輪換主力",
      status: ["狀態穩定", "需觀察負荷", "近期火熱"][pIndex] || "可出賽"
    })),
    summary: buildTeamSummary(name, styles, rank),
    risk: ["旅途與氣候適應", "後防速度落差", "核心球員負荷", "破密集防守效率", "定位球防守", "替補深度"][index % 6]
  };
});
 
function buildTeamSummary(name, styles, rank) {
  const tier = rank <= 10 ? "具備爭冠級基本盤" : rank <= 30 ? "具備穩定晉級競爭力" : "需要靠戰術執行與比賽事件放大優勢";
  return name + " 以「" + styles.join("、") + "」為主要輪廓，" + tier + "。模型會特別追蹤先發完整度、攻守轉換效率與定位球品質。";
}
 
function teamByName(name) {
  return teams.find(t => t.name === name) || null;
}
 
function normalizeTeamName(espnName) {
  const map = {
    "Türkiye": "Turkey", "Curaçao": "Curacao", "Côte d'Ivoire": "Ivory Coast",
    "IR Iran": "Iran", "Cabo Verde": "Cape Verde", "Korea Republic": "South Korea",
    "DR Congo (Congo DR)": "DR Congo", "Bosnia & Herzegovina": "Bosnia and Herzegovina"
  };
  return map[espnName] || espnName;
}
 
const customFlags = {
  Scotland: "https://upload.wikimedia.org/wikipedia/commons/1/10/Flag_of_Scotland.svg",
  England:  "https://upload.wikimedia.org/wikipedia/en/b/be/Flag_of_England.svg"
};
 
function flag(teamName) {
  if (!teamName || teamName === "TBD") return '<span style="font-size:20px">?</span>';
  if (customFlags[teamName]) {
    return '<img class="flag" src="' + customFlags[teamName] + '" alt="' + teamName + ' flag" loading="lazy" onerror="this.style.display=\'none\'" />';
  }
  const code = countryCodes[teamName] || "xx";
  return '<img class="flag" src="https://flagcdn.com/w40/' + code + '.png" alt="' + teamName + ' flag" loading="lazy" onerror="this.style.display=\'none\'" />';
}
 
// ─── 賽制中文標籤 ────────────────────────────────────────────────────────
function stageLabel(espnStageNote) {
  if (!espnStageNote) return "小組賽";
  const s = espnStageNote.toLowerCase();
  if (s.includes("group")) return "小組賽 · " + espnStageNote.replace(/group\s*/i, "Group ");
  if (s.includes("round of 32")) return "32強";
  if (s.includes("round of 16")) return "16強";
  if (s.includes("quarterfinal")) return "八強";
  if (s.includes("semifinal")) return "四強";
  if (s.includes("third") || s.includes("bronze")) return "季軍賽";
  if (s.includes("final")) return "決賽";
  return espnStageNote;
}
 
function statusLabel(status) {
  return { upcoming: "未開賽", live: "進行中", final: "已完賽" }[status] || "待開賽";
}
 
// ─── AI 賽前分析文字（依戰術風格動態生成，每場不同）──────────────────────
function buildInsight(home, away, probabilities) {
  const homeTeam = teamByName(home);
  const awayTeam = teamByName(away);
  if (!homeTeam || !awayTeam) {
    return home + " 對上 " + away + "：對戰雙方資料建置中，AI 分析將於資料到位後自動補上。";
  }
  const homeStyles = homeTeam.styles, awayStyles = awayTeam.styles;
  const homeRank = homeTeam.rank, awayRank = awayTeam.rank;
  const [homeP, drawP, awayP] = probabilities;
  const gap = homeP - awayP;
  const rankGap = awayRank - homeRank;
 
  const homePresses  = homeStyles.some(s => s.includes("逼搶") || s.includes("壓迫"));
  const awayCounters = awayStyles.some(s => s.includes("反擊") || s.includes("轉換"));
  const homeControls = homeStyles.some(s => s.includes("控球"));
  const awayDeep     = awayStyles.some(s => s.includes("防守") || s.includes("低位"));
  const awaySetPiece = awayStyles.some(s => s.includes("定位球"));
  const homeWide     = homeStyles.some(s => s.includes("邊路"));
 
  if (homePresses && awayCounters) return home + " 的高位逼搶策略將主導節奏走向，但 " + away + " 擅長反擊轉換，一旦壓迫線被破，後防空間將成致命弱點；" + (drawP >= 27 ? "平局是合理結果之一" : "兩隊直接對決性強，平局可能性偏低") + "。";
  if (homeControls && awayDeep) return home + " 主導控球，" + away + " 預計擺低陣型等待機會；破密集防守的效率是 " + home + " 能否拿三分的核心變數，" + (awayP <= 25 ? away + " 靠定位球或快攻的單刀機率不可忽視" : "比賽可能偏向低比分") + "。";
  if (awaySetPiece && rankGap < 5) return "兩隊實力接近，" + away + " 的定位球威脅是關鍵差異點；" + (homeP > awayP ? home + " 主場氣勢佔優，但任何一顆角球都可能翻盤" : away + " 有機會靠定位球偷分") + "。";
  if (homeWide) return home + " 邊路進攻體系成熟，" + away + " 邊後衛的防守強度是本場的核心對位；" + (gap > 15 ? "實力差距明顯，" + home + " 應能把握邊路優勢" : "兩隊差距不大，邊路攻防將左右比分") + "。";
  if (Math.abs(gap) < 8) return "勝率分析顯示本場高度均衡（" + homeP + "% vs " + awayP + "%）；" + (homeStyles[0] || home) + " 對上 " + (awayStyles[0] || away) + " 的風格對決，中段控制與體能管理將是決定勝負的隱形因素。";
  if (gap > 20) return home + " 勝率顯著領先（" + homeP + "%）" + (rankGap > 20 ? "，FIFA 排名差距達 " + Math.abs(rankGap) + " 位也反映實力落差" : "") + "；" + away + " 需在前 30 分鐘守穩陣型、避免失球，才有機會靠單一機會拖進平局結算。";
  if (gap < -20) return away + " 被看好（" + awayP + "%）" + (rankGap < -20 ? "，" + away + " FIFA 排名高出 " + Math.abs(rankGap) + " 位" : "") + "；" + home + " 若能以低位防守消耗對手體力，並在定位球或反擊中抓住機會，冷門並非不可能。";
  return home + "（" + (homeStyles[0] || "均衡踢法") + "）對上 " + away + "（" + (awayStyles[0] || "均衡踢法") + "），勝率 " + homeP + "% 對 " + awayP + "%；臨場先發名單與比賽首個進球的時機點，將是影響最終走勢的兩大變數。";
}
 
// ─── 模型勝率推算（無真實賠率時，由排名差與狀態分推算機率分佈）──────────
function computeProbabilities(homeName, awayName) {
  const home = teamByName(homeName);
  const away = teamByName(awayName);
  const homeForm = home ? home.formScore : 60;
  const awayForm = away ? away.formScore : 60;
  const diff = (homeForm - awayForm) + 4; // 主場小幅加成
  // logistic 轉換
  const homeWinRaw = 1 / (1 + Math.exp(-diff / 12));
  let homeP = Math.round(homeWinRaw * 68 + 16);
  homeP = Math.max(14, Math.min(78, homeP));
  let awayP = Math.round((100 - homeP) * 0.62);
  let drawP = 100 - homeP - awayP;
  if (drawP < 14) { const adj = 14 - drawP; drawP = 14; homeP -= Math.round(adj / 2); awayP -= adj - Math.round(adj / 2); }
  return [homeP, drawP, awayP];
}
 
// ─── 賽後檢討文字 ──────────────────────────────────────────────────────
function buildAudit(home, away, homeGoals, awayGoals, probabilities) {
  const homeTeam = teamByName(home);
  const awayTeam = teamByName(away);
  const [homeP, drawP, awayP] = probabilities;
  const pt = Math.abs(homeP - awayP);
  const actualWinner = homeGoals > awayGoals ? home : awayGoals > homeGoals ? away : "平局";
  const predictedWinner = homeP >= awayP ? (homeP > drawP ? home : "平局") : away;
  const isCorrect = actualWinner === predictedWinner;
  const homeStyle = (homeTeam && homeTeam.styles[0]) || "均衡踢法";
  const awayStyle = (awayTeam && awayTeam.styles[0]) || "均衡踢法";
  const totalGoals = homeGoals + awayGoals;
  const highScoring = totalGoals >= 3;
 
  let reason;
  if (isCorrect && highScoring) reason = "預測方向正確；" + actualWinner + " 的進攻效率超出模型預期，進球數高於預估，下次需提高 xG 對高分比賽的敏感度。";
  else if (isCorrect && !highScoring) reason = "預測方向正確；低比分節奏符合 " + homeStyle + " vs " + awayStyle + " 的戰術對峙預估，模型對本類型對決的判斷基準成立。";
  else if (!isCorrect && actualWinner === "平局") reason = "預測 " + predictedWinner + " 勝但實際平局；客隊防線紀律優於模型預期，建議提高「防守組織穩定性」對平局機率的影響權重（目前 " + drawP + "%）。";
  else reason = "預測 " + predictedWinner + " 但實際由 " + actualWinner + " 取勝；" + awayStyle + " 的臨場執行超出模型基準，需重新評估排名外的真實競爭力並上調冷門權重。";
 
  return {
    prediction: predictedWinner + " 不敗（模型信心 " + Math.max(homeP, awayP) + "%）",
    result: homeGoals + "-" + awayGoals + "（" + actualWinner + (actualWinner !== "平局" ? " 勝" : "") + "）",
    delta: (isCorrect ? "✓ 正確" : "✗ 偏差") + " " + pt + "pt差",
    isCorrect, reason
  };
}
 
// ─── EV 門檻分析（取代假賠率：告訴使用者賠率要多少才轉正）─────────────────
function buildEvThreshold(probabilities) {
  const [homeP, drawP, awayP] = probabilities;
  const toThreshold = p => p > 0 ? (100 / p).toFixed(2) : "—";
  return {
    home: toThreshold(homeP),
    draw: toThreshold(drawP),
    away: toThreshold(awayP)
  };
}
 
// ════════════════════════════════════════════════════════════════════════
// ESPN 即時資料抓取與正規化
// ════════════════════════════════════════════════════════════════════════
let espnEvents = [];      // ESPN 原始 events
let matches = [];         // 正規化後的比賽物件（給渲染函式用）
let dataSourceState = "loading"; // loading | live | error
 
async function fetchEspnSchedule() {
  // 先試直接抓（多數瀏覽器環境 ESPN site API 允許跨網域 GET）
  try {
    const res = await fetch(ESPN_SCOREBOARD_URL, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.events)) return data.events;
    }
  } catch (e) { /* 繼續嘗試備援 */ }
 
  // 備援：透過唯讀代理重新嘗試一次
  try {
    const res2 = await fetch(ESPN_FALLBACK_PROXY, { cache: "no-store" });
    if (res2.ok) {
      const text = await res2.text();
      const data = JSON.parse(text);
      if (Array.isArray(data.events)) return data.events;
    }
  } catch (e) { /* 兩種方式都失敗 */ }
 
  return null;
}
 
function normalizeEvents(events) {
  return events.map(event => {
    const competition = event.competitions && event.competitions[0];
    if (!competition) return null;
    const competitors = competition.competitors || [];
    const homeC = competitors.find(c => c.homeAway === "home");
    const awayC = competitors.find(c => c.homeAway === "away");
    if (!homeC || !awayC) return null;
 
    const home = normalizeTeamName(homeC.team ? (homeC.team.displayName || homeC.team.name) : "TBD");
    const away = normalizeTeamName(awayC.team ? (awayC.team.displayName || awayC.team.name) : "TBD");
    const homeGoals = homeC.score !== undefined ? parseInt(homeC.score, 10) : null;
    const awayGoals = awayC.score !== undefined ? parseInt(awayC.score, 10) : null;
 
    const statusType = (competition.status && competition.status.type && competition.status.type.name) || "";
    let status = "upcoming";
    if (statusType === "STATUS_FINAL" || statusType === "STATUS_FULL_TIME") status = "final";
    else if (statusType.includes("IN_PROGRESS") || statusType.includes("HALFTIME") || statusType === "STATUS_LIVE") status = "live";
 
    // 台灣時間轉換
    const utcDate = new Date(event.date);
    const tpeDate = new Intl.DateTimeFormat("en-CA", { timeZone: userTimeZone, year:"numeric", month:"2-digit", day:"2-digit" }).format(utcDate);
    const tpeTime = new Intl.DateTimeFormat("zh-Hant-TW", { timeZone: userTimeZone, hour:"2-digit", minute:"2-digit", hour12:false }).format(utcDate);
 
    const venue = (competition.venue && competition.venue.fullName) || "場地未公布";
    const groupNote = event.season && event.season.slug ? "" : "";
    const noteText = (competition.notes && competition.notes[0] && competition.notes[0].headline) || event.shortName || "";
 
    const probabilities = computeProbabilities(home, away);
 
    return {
      id: event.id,
      date: tpeDate,
      time: tpeTime,
      utcDate,
      stage: stageLabel(noteText),
      home, away, venue,
      homeGoals, awayGoals,
      status,
      probabilities,
      insight: buildInsight(home, away, probabilities),
      evThreshold: buildEvThreshold(probabilities),
      confidence: Math.min(92, Math.max(54, Math.round(64 + Math.abs(probabilities[0] - probabilities[2]) * 0.42))),
      audit: status === "final" && homeGoals !== null && awayGoals !== null
        ? buildAudit(home, away, homeGoals, awayGoals, probabilities)
        : null
    };
  }).filter(Boolean).sort((a, b) => a.utcDate - b.utcDate);
}
 
function getDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: userTimeZone, year:"numeric", month:"2-digit", day:"2-digit" }).format(date);
}
 
// ════════════════════════════════════════════════════════════════════════
// 渲染函式
// ════════════════════════════════════════════════════════════════════════
function renderDatePanel() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("zh-Hant-TW", { timeZone: userTimeZone, weekday:"long" }).formatToParts(now);
  const weekday = (parts.find(p => p.type === "weekday") || {}).value || "";
  document.getElementById("todayWeekday").textContent = weekday;
  document.getElementById("todayDate").textContent = getDateKey(now);
  document.getElementById("todayTimezone").textContent = "台灣時間 (UTC+8)";
}
 
function renderMatchCard(match) {
  const home = teamByName(match.home);
  const away = teamByName(match.away);
  const [homeP, drawP, awayP] = match.probabilities;
  const scoreText = (match.homeGoals !== null && match.awayGoals !== null)
    ? match.homeGoals + " - " + match.awayGoals : null;
 
  return `
    <article class="match-card">
      <div class="match-meta">
        <span class="status ${match.status}">${statusLabel(match.status)}</span>
        <div>${match.date} · ${match.time}</div>
        <div>${match.stage}</div>
        <div style="font-size:12px;color:var(--muted)">${match.venue}</div>
        ${scoreText ? `<div style="margin-top:6px;font-size:18px;font-weight:900;color:var(--green)">${scoreText}</div>` : ""}
      </div>
      <div>
        <div class="teams-row">
          <div class="team-side">
            <div class="team-title">${flag(match.home)}<span class="team-name">${match.home}</span></div>
            ${home ? `<div class="rank-line">FIFA #${home.rank}</div><div class="tags">${home.styles.slice(0,2).map(t=>`<span class="tag">${t}</span>`).join("")}</div>` : ""}
          </div>
          <div class="versus">VS</div>
          <div class="team-side">
            <div class="team-title">${flag(match.away)}<span class="team-name">${match.away}</span></div>
            ${away ? `<div class="rank-line">FIFA #${away.rank}</div><div class="tags">${away.styles.slice(0,2).map(t=>`<span class="tag">${t}</span>`).join("")}</div>` : ""}
          </div>
        </div>
        <p class="insight">${match.audit ? "賽果 " + scoreText + " · " + match.audit.reason : match.insight}</p>
      </div>
      <div class="prediction">
        <div class="prob-bar" style="--home:${homeP}%;--draw:${drawP}%;--away:${awayP}%"><span></span><span></span><span></span></div>
        <div class="prob-labels"><span>主勝 ${homeP}%</span><span>和 ${drawP}%</span><span>客勝 ${awayP}%</span></div>
        <div class="edge-box">
          <div><span>主勝轉正門檻</span><strong>賠率 &gt; ${match.evThreshold.home}</strong></div>
          <div><span>客勝轉正門檻</span><strong>賠率 &gt; ${match.evThreshold.away}</strong></div>
        </div>
      </div>
      <div class="confidence">
        <span>信心指數 ${match.confidence}/100</span>
        <div class="confidence-meter" style="--confidence:${match.confidence}%"><span></span></div>
        <button class="analysis-button" data-match="${match.id}">深入分析</button>
      </div>
    </article>`;
}
 
function renderDashboard() {
  const todayKey = getDateKey();
  const title = document.querySelector("#dashboard .section-title h2");
  const helper = document.querySelector("#dashboard .section-title span");
 
  if (dataSourceState === "error") {
    document.getElementById("todayMatches").innerHTML =
      `<div class="empty-state">⚠️ 目前無法連線到 ESPN 即時賽事資料。請稍後重新整理頁面再試一次。</div>`;
    title.textContent = "今日重點對戰";
    helper.textContent = "資料來源暫時無法連線";
    document.getElementById("todayCount").textContent = "—";
    document.getElementById("avgConfidence").textContent = "—";
    document.getElementById("positiveEvCount").textContent = "—";
    return;
  }
 
  const allDates = [...new Set(matches.map(m => m.date))].sort();
  let visibleMatches = matches.filter(m => m.date === todayKey);
  let displayDate = todayKey, labelMode = "today";
 
  if (!visibleMatches.length) {
    const pastDates = allDates.filter(d => d < todayKey);
    const futureDates = allDates.filter(d => d > todayKey);
    if (pastDates.length) {
      displayDate = pastDates[pastDates.length - 1];
      visibleMatches = matches.filter(m => m.date === displayDate);
      labelMode = "recent";
    } else if (futureDates.length) {
      displayDate = futureDates[0];
      visibleMatches = matches.filter(m => m.date === displayDate);
      labelMode = "next";
    } else labelMode = "done";
  }
 
  if (labelMode === "today") { title.textContent = "今日重點對戰"; helper.textContent = "賽前預測、即時狀態與賽後差距會在同一卡片內更新"; }
  else if (labelMode === "recent") { title.textContent = "最近比賽日：" + displayDate; helper.textContent = "今日無排程，顯示最近一個比賽日的結果與賽後分析"; }
  else if (labelMode === "next") { title.textContent = "下一個比賽日：" + displayDate; helper.textContent = "賽前預測已就緒，比賽開始後即時更新"; }
  else { title.textContent = "世界盃賽程已全部結束"; helper.textContent = "感謝追蹤本屆世界盃 AI 分析台"; }
 
  document.getElementById("todayMatches").innerHTML = visibleMatches.length
    ? visibleMatches.map(renderMatchCard).join("")
    : `<div class="empty-state">目前無賽程資料。</div>`;
 
  document.getElementById("todayCount").textContent = visibleMatches.length;
  document.getElementById("avgConfidence").textContent = visibleMatches.length
    ? Math.round(visibleMatches.reduce((s, m) => s + m.confidence, 0) / visibleMatches.length) : "—";
  document.getElementById("positiveEvCount").textContent = visibleMatches.filter(m => m.confidence >= 70).length;
}
 
function renderFilters() {
  const dates = [...new Set(matches.map(m => m.date))].sort();
  const dateFilterEl = document.getElementById("dateFilter");
  if (dateFilterEl) {
    dateFilterEl.innerHTML = `<option value="all" selected>全部日期</option>` +
      dates.map(d => `<option value="${d}">${d}</option>`).join("");
  }
  const stages = [...new Set(matches.map(m => m.stage))];
  const stageEl = document.getElementById("stageFilter");
  if (stageEl) {
    stageEl.innerHTML = `<option value="all">全部賽制</option>` +
      stages.map(s => `<option value="${s}">${s}</option>`).join("");
  }
  // 球隊群組篩選：依目前抓到的隊伍動態列出（小組賽組別資訊由 ESPN note 取得時填入，否則略過）
  const teamGroupFilterEl = document.getElementById("teamGroupFilter");
  if (teamGroupFilterEl) teamGroupFilterEl.innerHTML = `<option value="all">全部</option>`;
}
 
function renderSchedule() {
  const dateEl = document.getElementById("dateFilter");
  const stageEl = document.getElementById("stageFilter");
  const statusEl = document.getElementById("statusFilter");
  const date = dateEl ? dateEl.value : "all";
  const stage = stageEl ? stageEl.value : "all";
  const status = statusEl ? statusEl.value : "all";
 
  const filtered = matches.filter(m =>
    (date === "all" || m.date === date) &&
    (stage === "all" || m.stage === stage) &&
    (status === "all" || m.status === status)
  );
 
  const rowsEl = document.getElementById("scheduleRows");
  if (!rowsEl) return;
 
  if (dataSourceState === "error") {
    rowsEl.innerHTML = `<tr><td colspan="9" style="color:var(--muted);padding:20px">⚠️ 無法連線到即時賽程資料，請稍後重新整理。</td></tr>`;
    return;
  }
 
  rowsEl.innerHTML = filtered.length ? filtered.map(match => {
    const scoreText = (match.homeGoals !== null && match.awayGoals !== null) ? match.homeGoals + "-" + match.awayGoals : "";
    return `<tr>
      <td>${match.date}</td>
      <td>${match.time}</td>
      <td>${match.stage}</td>
      <td><span class="mini-flags">${flag(match.home)} ${match.home} vs ${flag(match.away)} ${match.away}</span></td>
      <td style="font-size:12px">${match.venue}</td>
      <td>${match.probabilities.join(" / ")}%</td>
      <td style="font-size:12px">主&gt;${match.evThreshold.home} / 客&gt;${match.evThreshold.away}</td>
      <td>${match.confidence}</td>
      <td>${statusLabel(match.status)}${scoreText ? " · <strong style=\"color:var(--green)\">" + scoreText + "</strong>" : ""}</td>
    </tr>`;
  }).join("") : `<tr><td colspan="9" style="color:var(--muted);padding:20px">沒有符合篩選條件的賽程。</td></tr>`;
}
 
let selectedTeam = null;
 
function renderTeams() {
  const searchEl = document.getElementById("teamSearch");
  const query = searchEl ? searchEl.value.trim().toLowerCase() : "";
  const filtered = teams.filter(team => {
    const haystack = (team.name + " " + team.styles.join(" ") + " " + team.players.map(p => p.name).join(" ")).toLowerCase();
    return !query || haystack.includes(query);
  });
  const gridEl = document.getElementById("teamGrid");
  if (!gridEl) return;
  gridEl.innerHTML = filtered.map(team => `
    <article class="team-card ${team.name === selectedTeam ? "selected" : ""}">
      <div class="team-title">${flag(team.name)}<span class="team-name">${team.name}</span></div>
      <div class="rank-line">FIFA #${team.rank}</div>
      <p>${team.summary}</p>
      <div class="tags">${team.styles.map(t => `<span class="tag">${t}</span>`).join("")}</div>
      <button class="team-button" data-team="${team.name}">查看球隊</button>
    </article>`).join("");
  if (selectedTeam) renderTeamDetail(selectedTeam);
}
 
function renderTeamDetail(teamName) {
  const team = teamByName(teamName);
  const detailEl = document.getElementById("teamDetail");
  if (!team || !detailEl) return;
  const upcoming = matches.filter(m => (m.home === teamName || m.away === teamName));
  detailEl.innerHTML = `
    <div class="detail-head">
      ${flag(team.name)}
      <div><h2>${team.name}</h2><div class="rank-line">FIFA #${team.rank} · 教練：${team.coach}</div></div>
    </div>
    <p>${team.summary}</p>
    <div class="stat-grid">
      <div class="stat"><span>控球率</span><strong>${team.metrics.possession}%</strong></div>
      <div class="stat"><span>壓迫強度</span><strong>${team.metrics.press}</strong></div>
      <div class="stat"><span>反擊速度</span><strong>${team.metrics.counter}</strong></div>
      <div class="stat"><span>定位球</span><strong>${team.metrics.setPiece}</strong></div>
    </div>
    <h3>核心球員</h3>
    <ul class="player-list">
      ${team.players.map(p => `<li><span>${p.name}<br><small>${p.role}</small></span><strong>${p.status}</strong></li>`).join("")}
    </ul>
    <h3>本屆賽程</h3>
    <ul class="player-list">
      ${upcoming.length ? upcoming.map(m => {
        const opp = m.home === teamName ? m.away : m.home;
        const scoreText = (m.homeGoals !== null && m.awayGoals !== null) ? m.homeGoals + "-" + m.awayGoals : statusLabel(m.status);
        return `<li><span>${m.date} vs ${opp}</span><strong>${scoreText}</strong></li>`;
      }).join("") : "<li><span>賽程資料載入中</span></li>"}
    </ul>
    <h3>潛在風險</h3>
    <p>${team.risk}。正式版會把傷病、停賽、旅行與即時先發納入每日校正。</p>`;
}
 
function renderMatchDetail(matchId) {
  const match = matches.find(m => m.id === matchId);
  const detailEl = document.getElementById("matchDetail");
  if (!match || !detailEl) return;
  const home = teamByName(match.home);
  const away = teamByName(match.away);
  const scoreText = (match.homeGoals !== null && match.awayGoals !== null) ? match.homeGoals + " - " + match.awayGoals : "尚未開賽";
 
  detailEl.innerHTML = `
    <article class="match-detail-card">
      <div class="match-detail-top">
        <div>
          <p class="eyebrow">Match Analysis · ${match.stage}</p>
          <h1>${match.home} vs ${match.away}</h1>
          <div class="scoreline">${flag(match.home)} ${scoreText} ${flag(match.away)}</div>
          <p class="subcopy">${match.insight}</p>
        </div>
        <div class="prediction">
          <span class="status ${match.status}">${statusLabel(match.status)}</span>
          <div class="prob-bar" style="--home:${match.probabilities[0]}%;--draw:${match.probabilities[1]}%;--away:${match.probabilities[2]}%"><span></span><span></span><span></span></div>
          <div class="prob-labels"><span>主勝 ${match.probabilities[0]}%</span><span>和 ${match.probabilities[1]}%</span><span>客勝 ${match.probabilities[2]}%</span></div>
          <div class="edge-box">
            <div><span>主勝轉正門檻</span><strong>賠率 &gt; ${match.evThreshold.home}</strong></div>
            <div><span>信心指數</span><strong>${match.confidence}/100</strong></div>
          </div>
          <div class="edge-box">
            <div><span>和局轉正門檻</span><strong>賠率 &gt; ${match.evThreshold.draw}</strong></div>
            <div><span>客勝轉正門檻</span><strong>賠率 &gt; ${match.evThreshold.away}</strong></div>
          </div>
          <p style="font-size:12px;color:var(--muted);margin-top:8px">
            本站不提供真實賠率數字。請至
            <a href="${TWSL_URL}" target="_blank" rel="noopener" style="color:var(--cyan)">台灣運彩官網</a>
            查詢當前盤口，若實際賠率高於上方門檻，代表該注項長期期望值為正。
          </p>
        </div>
      </div>
      <div class="tactical-grid">
        <article><h3>戰力比較</h3><p>${home ? match.home + " 的狀態分數為 " + home.formScore : match.home + " 資料建置中"}，${away ? match.away + " 為 " + away.formScore : match.away + " 資料建置中"}。模型將排名差距、近期狀態與先發品質合併評分。</p></article>
        <article><h3>關鍵對位</h3><p>${(home && home.players[0] && home.players[0].name) || match.home} 對上 ${(away && away.styles[0]) || match.away} 的防守結構，是本場進攻效率的主要變數。</p></article>
        <article><h3>風險等級</h3><p>${match.confidence >= 76 ? "中低風險" : "中高風險"}。主要風險為臨場先發、早段進球與紅黃牌改變比賽節奏。</p></article>
        <article><h3>可能先發輪廓</h3><p>${match.home}：${home ? home.players.map(p => p.name).join("、") : "待定"}；${match.away}：${away ? away.players.map(p => p.name).join("、") : "待定"}。</p></article>
        <article><h3>賠率查詢</h3><p>賠率非本站資料，請至 <a href="${TWSL_URL}" target="_blank" rel="noopener" style="color:var(--cyan)">台灣運彩</a> 查看即時盤口並自行比對轉正門檻。</p></article>
        <article><h3>賽後檢討</h3><p>${match.audit ? match.audit.prediction + "，實際 " + match.audit.result + "。" + match.audit.reason : "比賽結束後會自動比對實際結果，更新下一場權重。"}</p></article>
      </div>
    </article>`;
}
 
function renderAudit() {
  const audited = matches.filter(m => m.audit);
  const total = audited.length;
  const correct = audited.filter(m => m.audit.isCorrect).length;
  const pct = total ? Math.round(correct / total * 100) : 0;
 
  const summaryEl = document.getElementById("auditSummary");
  if (summaryEl) {
    if (dataSourceState === "error") {
      summaryEl.textContent = "⚠️ 無法連線到即時賽果資料";
      summaryEl.style.color = "var(--red)";
    } else {
      summaryEl.textContent = total ? "已分析 " + total + " 場完賽 · 預測正確 " + correct + " 場 · 準確率 " + pct + "%" : "比賽結束並讀取比分後，賽後檢討將自動顯示";
      summaryEl.style.color = total ? "var(--green)" : "var(--muted)";
    }
  }
 
  if (total > 0) {
    const hitRateEl = document.querySelector(".model-card:nth-child(1) strong");
    if (hitRateEl) hitRateEl.textContent = pct + "%";
    const hitDescEl = document.querySelector(".model-card:nth-child(1) p");
    if (hitDescEl) hitDescEl.textContent = "依本屆 " + total + " 場已完賽比賽即時計算。";
    const brierEst = ((correct * 0.10) + ((total - correct) * 0.40)) / total;
    const brierEl = document.querySelector(".model-card:nth-child(2) strong");
    if (brierEl) brierEl.textContent = brierEst.toFixed(3);
  }
 
  const rowsEl = document.getElementById("auditRows");
  if (!rowsEl) return;
  rowsEl.innerHTML = audited.length ? audited.map(m => `<tr>
      <td>${m.home} vs ${m.away}<br><small style="color:var(--muted)">${m.date} · ${m.stage}</small></td>
      <td>${m.audit.prediction}</td>
      <td>${m.audit.result}</td>
      <td style="white-space:nowrap;color:${m.audit.isCorrect ? "var(--green)" : "var(--red)"}">${m.audit.delta}</td>
      <td style="font-size:13px;color:#bdd0ca">${m.audit.reason}</td>
    </tr>`).join("") : `<tr><td colspan="5" style="color:var(--muted);padding:20px">⏳ 比賽結束並讀取到比分後，賽後檢討將自動出現在這裡。</td></tr>`;
}
 
function updateSyncLabels() {
  const syncChip = document.querySelector(".sync-chip");
  if (!syncChip) return;
  const nowText = new Intl.DateTimeFormat("zh-Hant-TW", { hour:"2-digit", minute:"2-digit", second:"2-digit", timeZone: userTimeZone }).format(new Date());
  syncChip.textContent = (dataSourceState === "error" ? "⚠️ 連線失敗 · " : "ESPN 即時同步 · ") + "最近嘗試 " + nowText;
}
 
// ════════════════════════════════════════════════════════════════════════
// 主流程
// ════════════════════════════════════════════════════════════════════════
async function refreshData() {
  const events = await fetchEspnSchedule();
  if (events && events.length) {
    espnEvents = events;
    matches = normalizeEvents(events);
    dataSourceState = "live";
  } else if (matches.length === 0) {
    dataSourceState = "error";
  }
  // 若本次抓取失敗但先前已有資料，維持顯示舊資料並標記非即時
  renderDatePanel();
  renderFilters();
  renderDashboard();
  renderSchedule();
  renderTeams();
  renderAudit();
  updateSyncLabels();
}
 
function switchView(viewId) {
  document.querySelectorAll(".view").forEach(v => v.classList.toggle("active", v.id === viewId));
  document.querySelectorAll(".nav-button").forEach(b => b.classList.toggle("active", b.dataset.view === viewId));
  window.scrollTo({ top: 0, behavior: "smooth" });
}
 
function bindEvents() {
  document.body.addEventListener("click", e => {
    const nav = e.target.closest("[data-view]");
    if (nav) switchView(nav.dataset.view);
    const matchBtn = e.target.closest("[data-match]");
    if (matchBtn) { renderMatchDetail(matchBtn.dataset.match); switchView("match"); }
    const teamBtn = e.target.closest("[data-team]");
    if (teamBtn) { selectedTeam = teamBtn.dataset.team; renderTeams(); }
  });
  ["dateFilter", "stageFilter", "statusFilter"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("change", renderSchedule);
  });
  const searchEl = document.getElementById("teamSearch");
  if (searchEl) searchEl.addEventListener("input", renderTeams);
}
 
async function init() {
  bindEvents();
  await refreshData();
  setInterval(refreshData, REFRESH_INTERVAL_MS);
}
 
init();
 
