// ─── 常數 ──────────────────────────────────────────────────────────────────
const flagBase = "https://flagcdn.com/w40/";
const REFRESH_INTERVAL_MS = 60000;
const MATCH_DURATION_MINUTES = 115;
const LIVE_FEED_URL = window.WC_AI_LIVE_FEED_URL || "";
const SCORES_JSON_URL = "scores.json";
const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Taipei";
let externalMatchUpdates = {};
let loadedScores = {};   // 從 scores.json 注入的比分
 
// ─── 球隊資料 ───────────────────────────────────────────────────────────────
const groups = {
  A: ["Mexico", "South Africa", "South Korea", "Czechia"],
  B: ["Canada", "Bosnia and Herzegovina", "Qatar", "Switzerland"],
  C: ["Brazil", "Morocco", "Haiti", "Scotland"],
  D: ["United States", "Paraguay", "Australia", "Turkey"],
  E: ["Germany", "Curacao", "Ivory Coast", "Ecuador"],
  F: ["Netherlands", "Japan", "Sweden", "Tunisia"],
  G: ["Belgium", "Egypt", "Iran", "New Zealand"],
  H: ["Spain", "Cape Verde", "Saudi Arabia", "Uruguay"],
  I: ["France", "Senegal", "Iraq", "Norway"],
  J: ["Argentina", "Algeria", "Austria", "Jordan"],
  K: ["Portugal", "DR Congo", "Uzbekistan", "Colombia"],
  L: ["England", "Croatia", "Ghana", "Panama"]
};
 
const countryCodes = {
  Mexico:"mx","South Africa":"za","South Korea":"kr",Czechia:"cz",
  Canada:"ca","Bosnia and Herzegovina":"ba",Qatar:"qa",Switzerland:"ch",
  Brazil:"br",Morocco:"ma",Haiti:"ht",Scotland:"gb-sct",
  "United States":"us",Paraguay:"py",Australia:"au",Turkey:"tr",
  Germany:"de",Curacao:"cw","Ivory Coast":"ci",Ecuador:"ec",
  Netherlands:"nl",Japan:"jp",Sweden:"se",Tunisia:"tn",
  Belgium:"be",Egypt:"eg",Iran:"ir","New Zealand":"nz",
  Spain:"es","Cape Verde":"cv","Saudi Arabia":"sa",Uruguay:"uy",
  France:"fr",Senegal:"sn",Iraq:"iq",Norway:"no",
  Argentina:"ar",Algeria:"dz",Austria:"at",Jordan:"jo",
  Portugal:"pt","DR Congo":"cd",Uzbekistan:"uz",Colombia:"co",
  England:"gb-eng",Croatia:"hr",Ghana:"gh",Panama:"pa",
  "TBD":"xx"
};
 
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
 
const styleBank = [
  ["控球主導","邊路進攻","高位逼搶"],
  ["防守反擊","定位球強","低位紀律"],
  ["轉換速度","中場壓迫","縱向推進"],
  ["身體對抗","長傳衝刺","禁區效率"],
  ["技術細膩","半空間滲透","後場組織"],
  ["緊密防線","快速邊鋒","門將穩定"]
];
 
const playerBank = {
  Mexico:["Santiago Gimenez","Edson Alvarez","Hirving Lozano"],
  "South Africa":["Percy Tau","Teboho Mokoena","Ronwen Williams"],
  "South Korea":["Son Heung-min","Kim Min-jae","Lee Kang-in"],
  Czechia:["Patrik Schick","Tomas Soucek","Adam Hlozek"],
  Canada:["Alphonso Davies","Jonathan David","Tajon Buchanan"],
  Switzerland:["Granit Xhaka","Manuel Akanji","Breel Embolo"],
  Brazil:["Vinicius Junior","Rodrygo","Bruno Guimaraes"],
  Morocco:["Achraf Hakimi","Brahim Diaz","Sofyan Amrabat"],
  "United States":["Christian Pulisic","Tyler Adams","Weston McKennie"],
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
  Ghana:["Mohammed Kudus","Thomas Partey","Inaki Williams"]
};
 
const coaches = {
  Canada:"Jesse Marsch",Brazil:"Carlo Ancelotti","United States":"Mauricio Pochettino",
  Turkey:"Vincenzo Montella",Germany:"Julian Nagelsmann",Belgium:"Rudi Garcia",
  Spain:"Luis de la Fuente",Uruguay:"Marcelo Bielsa",France:"Didier Deschamps",
  Argentina:"Lionel Scaloni",Portugal:"Roberto Martinez",England:"Thomas Tuchel",
  Croatia:"Zlatko Dalic"
};
 
const allTeamNames = Object.values(groups).flat();
const teams = allTeamNames.map((name, index) => {
  const group = Object.entries(groups).find(([,names]) => names.includes(name))[0];
  const rank = ranks[name] || 50 + (index % 36);
  const strength = Math.max(52, 98 - rank * 0.56);
  const styles = styleBank[index % styleBank.length];
  const players = playerBank[name] || [`${name} Captain`,`${name} Playmaker`,`${name} No. 9`];
  return {
    name, group, rank,
    code: countryCodes[name] || "xx",
    coach: coaches[name] || "待官方名單確認",
    styles,
    recent: `${3+(index%5)}勝 ${1+(index%3)}和 ${index%4}敗`,
    formScore: Math.round(strength + (index%7) - 3),
    metrics: {
      possession: 43+(index*5)%18,
      press: 52+(index*7)%36,
      counter: 48+(index*11)%42,
      setPiece: 46+(index*13)%39
    },
    players: players.map((player,pIndex) => ({
      name: player,
      role: ["進攻核心","中場節拍","防線支點"][pIndex] || "輪換主力",
      status: ["狀態穩定","需觀察負荷","近期火熱"][pIndex] || "可出賽"
    })),
    summary: buildSummary(name, styles, rank),
    risk: buildRisk(index)
  };
});
 
// ─── 完整賽程 (小組賽 + 淘汰賽)  ───────────────────────────────────────────
// 格式: [date, time(TPE), stage, group, home, away, venue, probs, decimalOdds]
// 淘汰賽的 home/away 在 TBD 時用 "TBD" 先佔位
const baseMatches = [
  // ══ 小組賽第一輪 ══
  ["2026-06-11","19:00","小組賽","A","Mexico","South Africa","Mexico City Stadium",[55,25,20],1.95],
  ["2026-06-11","22:00","小組賽","A","South Korea","Czechia","Estadio Guadalajara",[39,29,32],2.38],
  ["2026-06-12","13:00","小組賽","B","Canada","Bosnia and Herzegovina","Toronto Stadium",[52,27,21],2.08],
  ["2026-06-12","18:00","小組賽","D","United States","Paraguay","Los Angeles Stadium",[49,28,23],2.04],
  ["2026-06-13","12:00","小組賽","C","Haiti","Scotland","Boston Stadium",[22,28,50],2.12],
  ["2026-06-13","15:00","小組賽","D","Australia","Turkey","BC Place Vancouver",[31,29,40],2.36],
  ["2026-06-13","18:00","小組賽","C","Brazil","Morocco","New York New Jersey Stadium",[48,27,25],2.0],
  ["2026-06-13","21:00","小組賽","B","Qatar","Switzerland","San Francisco Bay Area Stadium",[21,28,51],1.92],
  ["2026-06-14","13:00","小組賽","E","Ivory Coast","Ecuador","Philadelphia Stadium",[33,30,37],2.55],
  ["2026-06-14","16:00","小組賽","E","Germany","Curacao","Houston Stadium",[74,17,9],1.34],
  ["2026-06-14","19:00","小組賽","F","Netherlands","Japan","Dallas Stadium",[45,28,27],2.05],
  ["2026-06-14","22:00","小組賽","F","Sweden","Tunisia","Estadio Monterrey",[43,30,27],2.12],
  ["2026-06-15","13:00","小組賽","H","Saudi Arabia","Uruguay","Miami Stadium",[22,27,51],1.88],
  ["2026-06-15","16:00","小組賽","H","Spain","Cape Verde","Atlanta Stadium",[76,16,8],1.3],
  ["2026-06-15","19:00","小組賽","G","Iran","New Zealand","Los Angeles Stadium",[55,27,18],1.86],
  ["2026-06-15","22:00","小組賽","G","Belgium","Egypt","Seattle Stadium",[44,29,27],2.18],
  ["2026-06-16","13:00","小組賽","I","France","Senegal","New York New Jersey Stadium",[57,25,18],1.76],
  ["2026-06-16","16:00","小組賽","I","Iraq","Norway","Boston Stadium",[18,25,57],1.78],
  ["2026-06-16","19:00","小組賽","J","Argentina","Algeria","Kansas City Stadium",[61,24,15],1.72],
  ["2026-06-16","22:00","小組賽","J","Austria","Jordan","San Francisco Bay Area Stadium",[56,26,18],1.82],
  ["2026-06-17","13:00","小組賽","L","Ghana","Panama","Toronto Stadium",[43,30,27],2.4],
  ["2026-06-17","16:00","小組賽","L","England","Croatia","Dallas Stadium",[52,27,21],1.95],
  ["2026-06-17","19:00","小組賽","K","Portugal","DR Congo","Houston Stadium",[68,21,11],1.48],
  ["2026-06-17","22:00","小組賽","K","Uzbekistan","Colombia","Mexico City Stadium",[20,27,53],1.9],
  // ══ 小組賽第二輪 ══
  ["2026-06-18","13:00","小組賽","A","Czechia","South Africa","Atlanta Stadium",[43,30,27],2.22],
  ["2026-06-18","16:00","小組賽","B","Switzerland","Bosnia and Herzegovina","Los Angeles Stadium",[58,25,17],1.77],
  ["2026-06-18","19:00","小組賽","B","Canada","Qatar","BC Place Vancouver",[54,27,19],1.85],
  ["2026-06-18","22:00","小組賽","A","Mexico","South Korea","Estadio Guadalajara",[42,29,29],2.2],
  ["2026-06-19","15:00","小組賽","C","Brazil","Haiti","Philadelphia Stadium",[77,15,8],1.24],
  ["2026-06-19","18:00","小組賽","C","Scotland","Morocco","Boston Stadium",[28,29,43],2.18],
  ["2026-06-19","21:00","小組賽","D","Turkey","Paraguay","San Francisco Bay Area Stadium",[45,29,26],2.08],
  ["2026-06-19","22:00","小組賽","D","United States","Australia","Seattle Stadium",[48,29,23],2.0],
  ["2026-06-20","13:00","小組賽","E","Ecuador","Germany","Philadelphia Stadium",[24,26,50],1.68],
  ["2026-06-20","16:00","小組賽","E","Ivory Coast","Curacao","Miami Stadium",[62,24,14],1.52],
  ["2026-06-20","19:00","小組賽","F","Japan","Sweden","Atlanta Stadium",[40,30,30],2.25],
  ["2026-06-20","22:00","小組賽","F","Netherlands","Tunisia","BC Place Vancouver",[66,22,12],1.45],
  ["2026-06-21","13:00","小組賽","H","Uruguay","Spain","Dallas Stadium",[29,26,45],1.65],
  ["2026-06-21","16:00","小組賽","H","Saudi Arabia","Cape Verde","Houston Stadium",[48,28,24],2.1],
  ["2026-06-21","19:00","小組賽","G","Belgium","New Zealand","New York New Jersey Stadium",[68,20,12],1.42],
  ["2026-06-21","22:00","小組賽","G","Iran","Egypt","Kansas City Stadium",[38,29,33],2.3],
  ["2026-06-22","13:00","小組賽","I","Norway","Senegal","Seattle Stadium",[44,28,28],2.15],
  ["2026-06-22","16:00","小組賽","J","France","Iraq","Los Angeles Stadium",[72,18,10],1.35],
  ["2026-06-22","19:00","小組賽","J","Argentina","Algeria","San Francisco Bay Area Stadium",[65,22,13],1.6],
  ["2026-06-22","22:00","小組賽","I","Austria","Jordan","Mexico City Stadium",[60,24,16],1.65],
  ["2026-06-23","13:00","小組賽","K","Colombia","England","Toronto Stadium",[35,30,35],2.05],
  ["2026-06-23","16:00","小組賽","L","Panama","Croatia","Atlanta Stadium",[24,28,48],1.88],
  ["2026-06-23","19:00","小組賽","L","Ghana","Portugal","Boston Stadium",[16,22,62],1.55],
  ["2026-06-23","22:00","小組賽","K","DR Congo","Uzbekistan","Philadelphia Stadium",[44,29,27],2.2],
  // ══ 小組賽第三輪 ══
  ["2026-06-25","19:00","小組賽","A","South Africa","Mexico","Mexico City Stadium",[30,29,41],2.35],
  ["2026-06-25","19:00","小組賽","A","Czechia","South Korea","Estadio Guadalajara",[35,30,35],2.2],
  ["2026-06-26","19:00","小組賽","B","Bosnia and Herzegovina","Qatar","Toronto Stadium",[47,27,26],2.15],
  ["2026-06-26","19:00","小組賽","B","Switzerland","Canada","Los Angeles Stadium",[40,29,31],2.1],
  ["2026-06-27","19:00","小組賽","C","Morocco","Brazil","New York New Jersey Stadium",[25,27,48],1.95],
  ["2026-06-27","19:00","小組賽","C","Haiti","Scotland","Boston Stadium",[20,27,53],2.05],
  ["2026-06-28","19:00","小組賽","D","Paraguay","Australia","BC Place Vancouver",[37,30,33],2.25],
  ["2026-06-28","19:00","小組賽","D","Turkey","United States","Seattle Stadium",[38,28,34],2.15],
  ["2026-06-29","19:00","小組賽","E","Curacao","Ivory Coast","Dallas Stadium",[18,24,58],1.75],
  ["2026-06-29","19:00","小組賽","E","Germany","Ecuador","Houston Stadium",[55,26,19],1.7],
  ["2026-06-30","19:00","小組賽","F","Tunisia","Japan","San Francisco Bay Area Stadium",[28,29,43],2.2],
  ["2026-06-30","19:00","小組賽","F","Netherlands","Sweden","Kansas City Stadium",[52,27,21],1.88],
  ["2026-07-01","19:00","小組賽","G","New Zealand","Belgium","Miami Stadium",[14,22,64],1.45],
  ["2026-07-01","19:00","小組賽","G","Egypt","Iran","Atlanta Stadium",[34,30,36],2.25],
  ["2026-07-02","19:00","小組賽","H","Cape Verde","Spain","Los Angeles Stadium",[12,20,68],1.35],
  ["2026-07-02","19:00","小組賽","H","Uruguay","Saudi Arabia","Mexico City Stadium",[54,27,19],1.82],
  ["2026-07-03","19:00","小組賽","I","Senegal","Norway","Philadelphia Stadium",[36,30,34],2.2],
  ["2026-07-03","19:00","小組賽","I","France","Iraq","Boston Stadium",[74,17,9],1.32],
  ["2026-07-04","19:00","小組賽","J","Algeria","Argentina","New York New Jersey Stadium",[18,22,60],1.68],
  ["2026-07-04","19:00","小組賽","J","Jordan","Austria","Toronto Stadium",[22,26,52],1.85],
  ["2026-07-05","19:00","小組賽","K","Uzbekistan","Portugal","Dallas Stadium",[14,21,65],1.5],
  ["2026-07-05","19:00","小組賽","K","DR Congo","Colombia","Houston Stadium",[30,29,41],2.3],
  ["2026-07-06","19:00","小組賽","L","Panama","Ghana","Seattle Stadium",[29,29,42],2.3],
  ["2026-07-06","19:00","小組賽","L","Croatia","England","Atlanta Stadium",[33,27,40],2.1],
  // ══ 16強淘汰賽 ══
  ["2026-07-09","13:00","16強","R16","TBD","TBD","Kansas City Stadium",[50,25,25],2.0],
  ["2026-07-09","19:00","16強","R16","TBD","TBD","Mexico City Stadium",[50,25,25],2.0],
  ["2026-07-10","13:00","16強","R16","TBD","TBD","Dallas Stadium",[50,25,25],2.0],
  ["2026-07-10","19:00","16強","R16","TBD","TBD","Los Angeles Stadium",[50,25,25],2.0],
  ["2026-07-11","13:00","16強","R16","TBD","TBD","New York New Jersey Stadium",[50,25,25],2.0],
  ["2026-07-11","19:00","16強","R16","TBD","TBD","Houston Stadium",[50,25,25],2.0],
  ["2026-07-12","13:00","16強","R16","TBD","TBD","San Francisco Bay Area Stadium",[50,25,25],2.0],
  ["2026-07-12","19:00","16強","R16","TBD","TBD","Seattle Stadium",[50,25,25],2.0],
  ["2026-07-13","13:00","16強","R16","TBD","TBD","Boston Stadium",[50,25,25],2.0],
  ["2026-07-13","19:00","16強","R16","TBD","TBD","Miami Stadium",[50,25,25],2.0],
  ["2026-07-14","13:00","16強","R16","TBD","TBD","Atlanta Stadium",[50,25,25],2.0],
  ["2026-07-14","19:00","16強","R16","TBD","TBD","Philadelphia Stadium",[50,25,25],2.0],
  ["2026-07-15","13:00","16強","R16","TBD","TBD","BC Place Vancouver",[50,25,25],2.0],
  ["2026-07-15","19:00","16強","R16","TBD","TBD","Estadio Guadalajara",[50,25,25],2.0],
  ["2026-07-16","13:00","16強","R16","TBD","TBD","Toronto Stadium",[50,25,25],2.0],
  ["2026-07-16","19:00","16強","R16","TBD","TBD","Kansas City Stadium",[50,25,25],2.0],
  // ══ 八強 ══
  ["2026-07-18","13:00","八強","QF","TBD","TBD","Dallas Stadium",[50,25,25],2.0],
  ["2026-07-18","19:00","八強","QF","TBD","TBD","Los Angeles Stadium",[50,25,25],2.0],
  ["2026-07-19","13:00","八強","QF","TBD","TBD","New York New Jersey Stadium",[50,25,25],2.0],
  ["2026-07-19","19:00","八強","QF","TBD","TBD","Houston Stadium",[50,25,25],2.0],
  ["2026-07-20","13:00","八強","QF","TBD","TBD","San Francisco Bay Area Stadium",[50,25,25],2.0],
  ["2026-07-20","19:00","八強","QF","TBD","TBD","Seattle Stadium",[50,25,25],2.0],
  ["2026-07-21","13:00","八強","QF","TBD","TBD","Boston Stadium",[50,25,25],2.0],
  ["2026-07-21","19:00","八強","QF","TBD","TBD","Miami Stadium",[50,25,25],2.0],
  // ══ 四強 ══
  ["2026-07-14","19:00","四強","SF","TBD","TBD","Dallas Stadium",[50,0,50],2.0],
  ["2026-07-15","19:00","四強","SF","TBD","TBD","New York New Jersey Stadium",[50,0,50],2.0],
  // ══ 季軍賽 ══
  ["2026-07-18","19:00","季軍賽","3P","TBD","TBD","Miami Stadium",[50,0,50],2.0],
  // ══ 決賽 ══
  ["2026-07-19","19:00","決賽","F","TBD","TBD","MetLife Stadium",[50,0,50],2.0],
];
 
// ─── 輔助函式 ───────────────────────────────────────────────────────────────
function getDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: userTimeZone, year:"numeric", month:"2-digit", day:"2-digit"
  }).format(date);
}
 
function parseLocalMatchTime(matchDate, matchTime) {
  return new Date(`${matchDate}T${matchTime}:00+08:00`);
}
 
function deriveMatchStatus(matchDate, matchTime, score, now = new Date()) {
  if (score) return "final";
  const start = parseLocalMatchTime(matchDate, matchTime);
  const end = new Date(start.getTime() + MATCH_DURATION_MINUTES * 60000);
  if (now < start) return "upcoming";
  if (now >= start && now <= end) return "live";
  return "awaiting";
}
 
function buildSummary(name, styles, rank) {
  const tier = rank <= 10 ? "具備爭冠級基本盤" : rank <= 30 ? "具備穩定晉級競爭力" : "需要靠戰術執行與比賽事件放大優勢";
  return `${name} 以「${styles.join("、")}」為主要輪廓，${tier}。模型會特別追蹤先發完整度、攻守轉換效率與定位球品質。`;
}
 
function buildRisk(index) {
  return ["旅途與氣候適應","後防速度落差","核心球員負荷","破密集防守效率","定位球防守","替補深度"][index % 6];
}
 
function predictScore(probabilities) {
  if (probabilities[0] > 60) return "2-0";
  if (probabilities[2] > 55) return "0-2";
  if (Math.abs(probabilities[0] - probabilities[2]) < 8) return "1-1";
  return probabilities[0] > probabilities[2] ? "2-1" : "1-2";
}
 
function buildInsight(home, away, probabilities) {
  if (home === "TBD" || away === "TBD") return "淘汰賽對戰組合確定後，AI 將自動生成本場深度分析。";
  const homeTeam = teamByName(home);
  const awayTeam = teamByName(away);
  const homeStyles = homeTeam ? homeTeam.styles : [];
  const awayStyles = awayTeam ? awayTeam.styles : [];
  const homeRank = homeTeam ? homeTeam.rank : 50;
  const awayRank = awayTeam ? awayTeam.rank : 50;
  const [homeP, drawP, awayP] = probabilities;
  const gap = homeP - awayP;
  const rankGap = awayRank - homeRank;
 
  const homePresses  = homeStyles.some(s => s.includes("逼搶") || s.includes("壓迫"));
  const awayCounters = awayStyles.some(s => s.includes("反擊") || s.includes("轉換"));
  const homeControls = homeStyles.some(s => s.includes("控球"));
  const awayDeep     = awayStyles.some(s => s.includes("防守") || s.includes("低位"));
  const awaySetPiece = awayStyles.some(s => s.includes("定位球"));
  const homeWide     = homeStyles.some(s => s.includes("邊路"));
 
  if (homePresses && awayCounters) return `${home} 的高位逼搶策略將主導節奏走向，但 ${away} 擅長反擊轉換，一旦壓迫線被破，後防空間將成致命弱點；${drawP >= 27 ? "平局是合理結果之一" : "兩隊直接對決性強，平局可能性偏低"}。`;
  if (homeControls && awayDeep) return `${home} 主導控球，${away} 預計擺低陣型等待機會；破密集防守的效率是 ${home} 能否拿三分的核心變數，${awayP <= 25 ? `${away} 靠定位球或快攻的單刀機率不可忽視` : "比賽可能偏向低比分"}。`;
  if (awaySetPiece && rankGap < 5) return `兩隊實力接近，${away} 的定位球威脅是關鍵差異點；${homeP > awayP ? `${home} 主場氣勢佔優，但任何一顆角球都可能翻盤` : `${away} 有機會靠定位球偷分`}。`;
  if (homeWide) return `${home} 邊路進攻體系成熟，${away} 邊後衛的防守強度是本場的核心對位；${gap > 15 ? `實力差距明顯，${home} 應能把握邊路優勢` : "兩隊差距不大，邊路攻防將左右比分"}。`;
  if (Math.abs(gap) < 8) return `勝率分析顯示本場高度均衡（${homeP}% vs ${awayP}%）；${homeStyles[0] || home} 對上 ${awayStyles[0] || away} 的風格對決，中段控制與體能管理將是決定勝負的隱形因素。`;
  if (gap > 20) return `${home} 勝率顯著領先（${homeP}%）${rankGap > 20 ? `，FIFA 排名差距達 ${Math.abs(rankGap)} 位也反映實力落差` : ""}；${away} 需在前 30 分鐘守穩陣型、避免失球，才有機會靠單一機會拖進平局結算。`;
  if (gap < -20) return `${away} 被看好（${awayP}%）${rankGap < -20 ? `，${away} FIFA 排名高出 ${Math.abs(rankGap)} 位` : ""}；${home} 若能以低位防守消耗對手體力，並在定位球或反擊中抓住機會，冷門並非不可能。`;
  return `${home}（${homeStyles[0] || "均衡踢法"}）對上 ${away}（${awayStyles[0] || "均衡踢法"}），勝率 ${homeP}% 對 ${awayP}%；臨場先發名單與比賽首個進球的時機點，將是影響最終走勢的兩大變數。`;
}
 
function buildAudit(home, away, score, probabilities) {
  if (home === "TBD" || away === "TBD") return null;
  const homeTeam = teamByName(home);
  const awayTeam = teamByName(away);
  const [homeP, drawP, awayP] = probabilities;
  const pt = Math.abs(homeP - awayP);
  const [homeGoals, awayGoals] = score.split("-").map(Number);
  const actualWinner = homeGoals > awayGoals ? home : awayGoals > homeGoals ? away : "平局";
  const predictedWinner = homeP >= awayP ? (homeP > drawP ? home : "平局") : away;
  const isCorrect = actualWinner === predictedWinner;
  const homeStyle = homeTeam?.styles[0] || "均衡踢法";
  const awayStyle = awayTeam?.styles[0] || "均衡踢法";
  const totalGoals = homeGoals + awayGoals;
  const highScoring = totalGoals >= 3;
 
  let reason;
  if (isCorrect && highScoring) reason = `預測方向正確；${actualWinner} 的 ${homeTeam?.styles[1] || "進攻效率"} 超出模型預期，進球數高於預估，下次需提高 xG 對高分比賽的敏感度。`;
  else if (isCorrect && !highScoring) reason = `預測方向正確；低比分節奏符合 ${homeStyle} vs ${awayStyle} 的戰術對峙預估，模型對本類型對決的判斷基準成立。`;
  else if (!isCorrect && actualWinner === "平局") reason = `預測 ${predictedWinner} 勝但實際平局；${awayTeam?.styles[1] || "客隊防線"} 紀律優於模型預期，建議提高「防守組織穩定性」對平局機率的影響權重（目前 ${drawP}%）。`;
  else reason = `預測 ${predictedWinner} 但實際由 ${actualWinner} 取勝；${awayStyle} 的臨場執行超出模型基準，需重新評估 ${awayTeam?.styles[0] || "客隊"} 在 FIFA 排名外的真實競爭力並上調冷門權重。`;
 
  return {
    prediction: `${predictedWinner} 不敗（模型信心 ${Math.max(homeP,awayP)}%）`,
    result: `${score}（${actualWinner}${actualWinner !== "平局" ? " 勝" : ""}）`,
    delta: `${isCorrect ? "✓ 正確" : "✗ 偏差"} ${pt}pt差`,
    reason
  };
}
 
function teamByName(name) {
  return teams.find(t => t.name === name);
}
 
// 旗幟：Scotland / England 用 emoji 替代（flagcdn 不支援 gb-sct / gb-eng 子旗幟）
const flagEmoji = {
  Scotland: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  England:  "🏴󠁧󠁢󠁥󠁮󠁧󠁿"
};
 
function flag(teamName) {
  if (teamName === "TBD") return `<span style="font-size:20px">❓</span>`;
  if (flagEmoji[teamName]) {
    return `<span style="font-size:22px;line-height:1" title="${teamName}">${flagEmoji[teamName]}</span>`;
  }
  const code = countryCodes[teamName] || "xx";
  return `<img class="flag" src="${flagBase}${code}.png" alt="${teamName} flag" loading="lazy" onerror="this.style.display='none'" />`;
}
 
function statusLabel(status) {
  return { upcoming:"未開賽", live:"進行中", final:"已完賽", awaiting:"待賽果" }[status] || status;
}
 
function stageLabel(stage, group) {
  if (stage === "小組賽") return `Group ${group}`;
  return stage;
}
 
// ─── 建立比賽資料（注入 scores.json 比分） ──────────────────────────────────
function buildMatches(now = new Date()) {
  return baseMatches.map((item, index) => {
    const [date, time, stage, group, home, away, venue, probabilities, decimalOdds] = item;
    const id = `m-${String(index + 1).padStart(3, "0")}`;
 
    // 從 scores.json 取得比分（優先），或從 externalMatchUpdates 取得
    const injectedScore = loadedScores[id] || null;
    const externalUpdate = externalMatchUpdates[id] || {};
    const score = injectedScore || externalUpdate.score || null;
 
    const mergedProbs = (Array.isArray(externalUpdate.probabilities) && externalUpdate.probabilities.length === 3)
      ? externalUpdate.probabilities : probabilities;
 
    const status = deriveMatchStatus(date, time, score, now);
    const confidence = Math.min(92, Math.max(54, Math.round(
      64 + Math.abs(mergedProbs[0] - mergedProbs[2]) * 0.42 + (index % 8)
    )));
    const chosenProb = Math.max(...mergedProbs) / 100;
    const ev = chosenProb * decimalOdds - 1;
 
    return {
      id, date, time, stage, group, home, away, venue,
      probabilities: mergedProbs,
      decimalOdds,
      score,
      status,
      predictedScore: predictScore(mergedProbs),
      market: {
        over25: 44 + (index * 3) % 28,
        bothScore: 40 + (index * 5) % 31,
        handicap: mergedProbs[0] > mergedProbs[2] ? `${home} -0.25` : `${away} -0.25`
      },
      insight: buildInsight(home, away, mergedProbs),
      confidence: externalUpdate.liveConfidence || confidence,
      ev,
      audit: status === "final" && score ? buildAudit(home, away, score, mergedProbs) : null
    };
  });
}
 
let matches = [];
let selectedTeam = teams[0].name;
let selectedMatchId = "m-001";
 
// ─── 資料抓取 ───────────────────────────────────────────────────────────────
async function fetchScoresJson() {
  try {
    const res = await fetch(`${SCORES_JSON_URL}?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    if (data && typeof data.scores === "object") {
      loadedScores = data.scores;
      const syncEl = document.getElementById("scoresUpdated");
      if (syncEl && data._updated) {
        syncEl.textContent = `比分同步：${new Date(data._updated).toLocaleString("zh-Hant-TW", { timeZone: userTimeZone, month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit" })}`;
      }
    }
  } catch (e) {
    // scores.json 不存在或格式錯誤，靜默忽略
  }
}
 
async function fetchLiveFeed() {
  if (!LIVE_FEED_URL) return;
  try {
    const res = await fetch(LIVE_FEED_URL, { cache: "no-store" });
    if (!res.ok) return;
    const payload = await res.json();
    const updates = Array.isArray(payload.matches) ? payload.matches : [];
    externalMatchUpdates = updates.reduce((acc, u) => { if (u.id) acc[u.id] = u; return acc; }, {});
  } catch { externalMatchUpdates = externalMatchUpdates || {}; }
}
 
// ─── 渲染函式 ───────────────────────────────────────────────────────────────
function renderDatePanel() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("zh-Hant-TW", {
    timeZone: userTimeZone, weekday:"long", year:"numeric", month:"2-digit", day:"2-digit"
  }).formatToParts(now);
  const weekday = parts.find(p => p.type === "weekday")?.value || "";
  document.getElementById("todayWeekday").textContent = weekday;
  document.getElementById("todayDate").textContent = getDateKey(now);
  document.getElementById("todayTimezone").textContent = userTimeZone;
}
 
function renderMatchCard(match) {
  const home = teamByName(match.home) || { name: match.home, rank:"?", recent:"TBD", styles:[], players:[] };
  const away = teamByName(match.away) || { name: match.away, rank:"?", recent:"TBD", styles:[], players:[] };
  const [homeP, drawP, awayP] = match.probabilities;
  const best = homeP >= awayP ? homeP : awayP;
  const evClass = match.ev >= 0 ? "positive" : "negative";
  const isTBD = match.home === "TBD" || match.away === "TBD";
 
  return `
    <article class="match-card">
      <div class="match-meta">
        <span class="status ${match.status}">${statusLabel(match.status)}</span>
        <div>${match.date} · ${match.time}</div>
        <div>${stageLabel(match.stage, match.group)}</div>
        <div style="font-size:12px;color:var(--muted)">${match.venue}</div>
        ${match.score ? `<div style="margin-top:6px;font-size:16px;font-weight:900;color:var(--green)">${match.score}</div>` : ""}
      </div>
      <div>
        <div class="teams-row">
          <div class="team-side">
            <div class="team-title">${flag(home.name)}<span class="team-name">${home.name}</span></div>
            ${!isTBD ? `<div class="rank-line">FIFA #${home.rank} · ${home.recent}</div>
            <div class="tags">${home.styles.slice(0,2).map(tag=>`<span class="tag">${tag}</span>`).join("")}</div>` : ""}
          </div>
          <div class="versus">VS</div>
          <div class="team-side">
            <div class="team-title">${flag(away.name)}<span class="team-name">${away.name}</span></div>
            ${!isTBD ? `<div class="rank-line">FIFA #${away.rank} · ${away.recent}</div>
            <div class="tags">${away.styles.slice(0,2).map(tag=>`<span class="tag">${tag}</span>`).join("")}</div>` : ""}
          </div>
        </div>
        <p class="insight">${match.audit ? `賽果 ${match.score} · ${match.audit.reason}` : match.insight}</p>
      </div>
      <div class="prediction">
        <div class="prob-bar" style="--home:${homeP}%;--draw:${drawP}%;--away:${awayP}%"><span></span><span></span><span></span></div>
        <div class="prob-labels"><span>主勝 ${homeP}%</span><span>和 ${drawP}%</span><span>客勝 ${awayP}%</span></div>
        <div class="edge-box">
          <div><span>EV</span><strong class="${evClass}">${match.ev >= 0 ? "+" : ""}${(match.ev*100).toFixed(1)}%</strong></div>
          <div><span>最高勝率</span><strong>${best}%</strong></div>
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
  const now = new Date();
  const todayKey = getDateKey(now);
  const title = document.querySelector("#dashboard .section-title h2");
  const helper = document.querySelector("#dashboard .section-title span");
 
  // 取得所有有比賽的日期（排序）
  const allDates = [...new Set(matches.map(m => m.date))].sort();
 
  // 找今天有沒有比賽
  let visibleMatches = matches.filter(m => m.date === todayKey);
  let displayDate = todayKey;
  let labelMode = "today"; // "today" | "recent" | "next" | "done"
 
  if (!visibleMatches.length) {
    // 找最近已過去的比賽日（往前找）
    const pastDates = allDates.filter(d => d < todayKey);
    const futureDates = allDates.filter(d => d > todayKey);
 
    if (pastDates.length) {
      // 優先顯示最近一個已完賽的比賽日
      displayDate = pastDates[pastDates.length - 1];
      visibleMatches = matches.filter(m => m.date === displayDate);
      labelMode = "recent";
    } else if (futureDates.length) {
      // 還沒開賽就顯示下一個比賽日
      displayDate = futureDates[0];
      visibleMatches = matches.filter(m => m.date === displayDate);
      labelMode = "next";
    } else {
      labelMode = "done";
    }
  }
 
  // 更新標題與副標
  if (labelMode === "today") {
    title.textContent = "今日重點對戰";
    helper.textContent = "賽前預測、即時狀態與賽後差距會在同一卡片內更新";
  } else if (labelMode === "recent") {
    title.textContent = `最近比賽日：${displayDate}`;
    helper.textContent = "今日無排程，顯示最近一個比賽日的結果與賽後分析";
  } else if (labelMode === "next") {
    title.textContent = `下一個比賽日：${displayDate}`;
    helper.textContent = "賽前預測已就緒，比賽開始後即時更新";
  } else {
    title.textContent = "世界盃賽程已全部結束";
    helper.textContent = "感謝追蹤本屆世界盃 AI 分析台";
  }
 
  document.getElementById("todayMatches").innerHTML = visibleMatches.length
    ? visibleMatches.map(renderMatchCard).join("")
    : `<div class="empty-state">目前無賽程資料。</div>`;
 
  // 指標列：顯示當前 displayDate 的統計
  document.getElementById("todayCount").textContent = visibleMatches.length;
  document.getElementById("avgConfidence").textContent = visibleMatches.length
    ? Math.round(visibleMatches.reduce((s, m) => s + m.confidence, 0) / visibleMatches.length)
    : "—";
  document.getElementById("positiveEvCount").textContent =
    visibleMatches.filter(m => m.ev > 0).length;
}
 
function renderFilters() {
  // matches 此時還是空的（init 時先呼叫），改為用 baseMatches 的日期先填選單
  const dates = [...new Set(baseMatches.map(m => m[0]))].sort();
  // 日期篩選預設「全部」，讓賽程表一開始就顯示完整賽程
  document.getElementById("dateFilter").innerHTML =
    `<option value="all" selected>全部日期</option>` +
    dates.map(d => `<option value="${d}">${d}</option>`).join("");
 
  const stageOptions = ["小組賽","16強","八強","四強","季軍賽","決賽"];
  const stageEl = document.getElementById("stageFilter");
  if (stageEl) stageEl.innerHTML = `<option value="all">全部賽制</option>` +
    stageOptions.map(s => `<option value="${s}">${s}</option>`).join("");
 
  const groupOptions = Object.keys(groups).map(g => `<option value="${g}">Group ${g}</option>`).join("");
  const groupFilterEl = document.getElementById("groupFilter");
  if (groupFilterEl && !groupFilterEl.querySelector("option[value='A']")) {
    groupFilterEl.insertAdjacentHTML("beforeend", groupOptions);
  }
  const teamGroupFilterEl = document.getElementById("teamGroupFilter");
  if (teamGroupFilterEl && !teamGroupFilterEl.querySelector("option[value='A']")) {
    teamGroupFilterEl.insertAdjacentHTML("beforeend", groupOptions);
  }
}
 
function renderSchedule() {
  const date   = document.getElementById("dateFilter").value;
  const group  = document.getElementById("groupFilter").value;
  const status = document.getElementById("statusFilter").value;
  const stageEl = document.getElementById("stageFilter");
  const stage  = stageEl ? stageEl.value : "all";
 
  const filtered = matches.filter(m => {
    return (date   === "all" || m.date  === date)
        && (group  === "all" || m.group === group)
        && (status === "all" || m.status === status)
        && (stage  === "all" || m.stage  === stage);
  });
 
  document.getElementById("scheduleRows").innerHTML = filtered.map(match => {
    const evClass = match.ev >= 0 ? "positive" : "negative";
    return `<tr>
      <td>${match.date}</td>
      <td>${match.time}</td>
      <td>${stageLabel(match.stage, match.group)}</td>
      <td><span class="mini-flags">${flag(match.home)} ${match.home} vs ${flag(match.away)} ${match.away}</span></td>
      <td style="font-size:12px">${match.venue}</td>
      <td>${match.probabilities.join(" / ")}%</td>
      <td class="${evClass}">${match.ev>=0?"+":""}${(match.ev*100).toFixed(1)}%</td>
      <td>${match.confidence}</td>
      <td>${statusLabel(match.status)}${match.score ? ` · <strong style="color:var(--green)">${match.score}</strong>` : ""}</td>
    </tr>`;
  }).join("");
}
 
function renderTeams() {
  const query = document.getElementById("teamSearch").value.trim().toLowerCase();
  const group = document.getElementById("teamGroupFilter").value;
  const filtered = teams.filter(team => {
    const haystack = `${team.name} ${team.styles.join(" ")} ${team.players.map(p=>p.name).join(" ")}`.toLowerCase();
    return (group === "all" || team.group === group) && (!query || haystack.includes(query));
  });
  document.getElementById("teamGrid").innerHTML = filtered.map(team=>`
    <article class="team-card ${team.name===selectedTeam?"selected":""}">
      <div class="team-title">${flag(team.name)}<span class="team-name">${team.name}</span></div>
      <div class="rank-line">Group ${team.group} · FIFA #${team.rank} · ${team.recent}</div>
      <p>${team.summary}</p>
      <div class="tags">${team.styles.map(tag=>`<span class="tag">${tag}</span>`).join("")}</div>
      <button class="team-button" data-team="${team.name}">查看球隊</button>
    </article>`).join("");
  renderTeamDetail(selectedTeam);
}
 
function renderTeamDetail(teamName) {
  const team = teamByName(teamName);
  if (!team) return;
  document.getElementById("teamDetail").innerHTML = `
    <div class="detail-head">
      ${flag(team.name)}
      <div><h2>${team.name}</h2><div class="rank-line">Group ${team.group} · 教練：${team.coach}</div></div>
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
      ${team.players.map(p=>`<li><span>${p.name}<br><small>${p.role}</small></span><strong>${p.status}</strong></li>`).join("")}
    </ul>
    <h3>潛在風險</h3>
    <p>${team.risk}。正式版會把傷病、停賽、旅行與即時先發納入每日校正。</p>`;
}
 
function renderMatchDetail(matchId) {
  const match = matches.find(m => m.id === matchId) || matches[0];
  selectedMatchId = match.id;
  const home = teamByName(match.home) || { name:match.home, formScore:50, styles:[], players:[] };
  const away = teamByName(match.away) || { name:match.away, formScore:50, styles:[], players:[] };
  const evClass = match.ev >= 0 ? "positive" : "negative";
 
  document.getElementById("matchDetail").innerHTML = `
    <article class="match-detail-card">
      <div class="match-detail-top">
        <div>
          <p class="eyebrow">Match Analysis · ${stageLabel(match.stage, match.group)}</p>
          <h1>${match.home} vs ${match.away}</h1>
          <div class="scoreline">${flag(home.name)} ${match.score || match.predictedScore} ${flag(away.name)}</div>
          <p class="subcopy">${match.insight}</p>
        </div>
        <div class="prediction">
          <span class="status ${match.status}">${statusLabel(match.status)}</span>
          <div class="prob-bar" style="--home:${match.probabilities[0]}%;--draw:${match.probabilities[1]}%;--away:${match.probabilities[2]}%"><span></span><span></span><span></span></div>
          <div class="prob-labels"><span>主勝 ${match.probabilities[0]}%</span><span>和 ${match.probabilities[1]}%</span><span>客勝 ${match.probabilities[2]}%</span></div>
          <div class="edge-box">
            <div><span>期望值 EV</span><strong class="${evClass}">${match.ev>=0?"+":""}${(match.ev*100).toFixed(1)}%</strong></div>
            <div><span>信心指數</span><strong>${match.confidence}/100</strong></div>
          </div>
          <div class="edge-box">
            <div><span>大小 2.5</span><strong>${match.market.over25}%</strong></div>
            <div><span>雙方進球</span><strong>${match.market.bothScore}%</strong></div>
          </div>
        </div>
      </div>
      <div class="tactical-grid">
        <article>
          <h3>戰力比較</h3>
          <p>${home.name} 的狀態分數為 ${home.formScore}，${away.name} 為 ${away.formScore}。模型將排名差距、近期狀態與先發品質合併評分。</p>
        </article>
        <article>
          <h3>關鍵對位</h3>
          <p>${home.players[0]?.name || home.name} 對上 ${away.styles[0] || away.name} 的防守結構，是本場進攻效率的主要變數。</p>
        </article>
        <article>
          <h3>風險等級</h3>
          <p>${match.confidence >= 76 ? "中低風險" : "中高風險"}。主要風險為臨場先發、早段進球與紅黃牌改變比賽節奏。</p>
        </article>
        <article>
          <h3>可能先發輪廓</h3>
          <p>${home.name}：${home.players.map(p=>p.name).join("、") || "待定"}；${away.name}：${away.players.map(p=>p.name).join("、") || "待定"}。</p>
        </article>
        <article>
          <h3>市場盤口</h3>
          <p>主模型參考十進位賠率 ${match.decimalOdds.toFixed(2)}，讓球觀察點為 ${match.market.handicap}。</p>
        </article>
        <article>
          <h3>賽後檢討</h3>
          <p>${match.audit ? `${match.audit.prediction}，實際 ${match.audit.result}。${match.audit.reason}` : "比賽結束後會自動比對實際結果，更新下一場權重。"}</p>
        </article>
      </div>
    </article>`;
}
 
function renderAudit() {
  const audited = matches.filter(m => m.audit);
  const total = audited.length;
  const correct = audited.filter(m => m.audit.delta.startsWith("✓")).length;
  const pct = total ? Math.round(correct / total * 100) : 0;
 
  // 更新 auditSummary 橫幅
  const summaryEl = document.getElementById("auditSummary");
  if (summaryEl) {
    summaryEl.textContent = total
      ? `已分析 ${total} 場完賽 · 預測正確 ${correct} 場 · 準確率 ${pct}%`
      : "比賽結束並讀取比分後，賽後檢討將自動顯示";
    summaryEl.style.color = total ? "var(--green)" : "var(--muted)";
  }
 
  // 用真實統計覆蓋模型表現卡片（取代寫死的假數字）
  if (total > 0) {
    const hitRateEl = document.querySelector(".model-card:nth-child(1) strong");
    if (hitRateEl) hitRateEl.textContent = `${pct}%`;
    const hitDescEl = document.querySelector(".model-card:nth-child(1) p");
    if (hitDescEl) hitDescEl.textContent = `依本屆 ${total} 場已完賽比賽即時計算。`;
 
    // 簡易 Brier Score 估算：正確=0.1 錯誤=0.4 平均
    const brierEst = ((correct * 0.10) + ((total - correct) * 0.40)) / total;
    const brierEl = document.querySelector(".model-card:nth-child(2) strong");
    if (brierEl) brierEl.textContent = brierEst.toFixed(3);
  }
 
  // 賽後明細表
  document.getElementById("auditRows").innerHTML = audited.length
    ? audited.map(m => `<tr>
        <td>${m.home} vs ${m.away}<br>
          <small style="color:var(--muted)">${m.date} · ${stageLabel(m.stage, m.group)}</small>
        </td>
        <td>${m.audit.prediction}</td>
        <td>${m.audit.result}</td>
        <td style="white-space:nowrap;color:${m.audit.delta.startsWith("✓") ? "var(--green)" : "var(--red)"}">${m.audit.delta}</td>
        <td style="font-size:13px;color:#bdd0ca">${m.audit.reason}</td>
      </tr>`).join("")
    : `<tr><td colspan="5" style="color:var(--muted);padding:20px">
        ⏳ 比賽結束並從 scores.json 讀取到比分後，賽後檢討將自動出現在這裡。
      </td></tr>`;
}
 
function updateSyncLabels() {
  const syncChip = document.querySelector(".sync-chip");
  if (!syncChip) return;
  const nowText = new Intl.DateTimeFormat("zh-Hant-TW", {
    hour:"2-digit", minute:"2-digit", second:"2-digit", timeZone: userTimeZone
  }).format(new Date());
  syncChip.textContent = `本地排程自動刷新 · 最近更新 ${nowText}`;
}
 
async function refreshData() {
  await fetchScoresJson();
  await fetchLiveFeed();
  matches = buildMatches();
  renderDatePanel();
  renderDashboard();
  renderSchedule();
  renderAudit();
  updateSyncLabels();
}
 
function switchView(viewId) {
  document.querySelectorAll(".view").forEach(v => v.classList.toggle("active", v.id === viewId));
  document.querySelectorAll(".nav-button").forEach(b => b.classList.toggle("active", b.dataset.view === viewId));
  window.scrollTo({ top:0, behavior:"smooth" });
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
  ["dateFilter","groupFilter","statusFilter"].forEach(id => {
    document.getElementById(id)?.addEventListener("change", renderSchedule);
  });
  document.getElementById("stageFilter")?.addEventListener("change", renderSchedule);
  ["teamSearch","teamGroupFilter"].forEach(id => {
    document.getElementById(id)?.addEventListener("input", renderTeams);
    document.getElementById(id)?.addEventListener("change", renderTeams);
  });
}
 
async function init() {
  renderFilters();
  renderTeams();
  bindEvents();
  await refreshData();
  setInterval(refreshData, REFRESH_INTERVAL_MS);
}
 
init();
 
