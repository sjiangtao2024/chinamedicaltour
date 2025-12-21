const CITY_ALIASES = [
  { id: "beijing", names: ["beijing", "北京"] },
  { id: "shanghai", names: ["shanghai", "上海"] },
  { id: "guangzhou", names: ["guangzhou", "广州", "canton"] },
  { id: "shenzhen", names: ["shenzhen", "深圳"] },
  { id: "chengdu", names: ["chengdu", "成都"] },
  { id: "chongqing", names: ["chongqing", "重庆"] },
  { id: "hangzhou", names: ["hangzhou", "杭州"] },
  { id: "suzhou", names: ["suzhou", "苏州"] },
  { id: "nanjing", names: ["nanjing", "南京"] },
  { id: "xian", names: ["xian", "xi'an", "西安"] },
  { id: "wuhan", names: ["wuhan", "武汉"] },
  { id: "tianjin", names: ["tianjin", "天津"] },
  { id: "qingdao", names: ["qingdao", "青岛"] },
  { id: "xiamen", names: ["xiamen", "厦门"] },
  { id: "harbin", names: ["harbin", "哈尔滨"] },
  { id: "kunming", names: ["kunming", "昆明"] },
  { id: "guilin", names: ["guilin", "桂林"] },
  { id: "lhasa", names: ["lhasa", "拉萨"] },
  { id: "sanya", names: ["sanya", "三亚"] },
  { id: "dalian", names: ["dalian", "大连"] },
  { id: "hongkong", names: ["hong kong", "hongkong", "香港"] },
  { id: "macau", names: ["macau", "macao", "澳门"] },
];

const CURRENCY_ALIASES = [
  { code: "USD", names: ["usd", "us dollar", "dollar", "$", "美元"] },
  { code: "EUR", names: ["eur", "euro", "€", "欧元"] },
  { code: "GBP", names: ["gbp", "pound", "£", "英镑"] },
  { code: "JPY", names: ["jpy", "yen", "¥", "日元"] },
  { code: "AUD", names: ["aud", "australian dollar", "澳元"] },
  { code: "CAD", names: ["cad", "canadian dollar", "加元"] },
  { code: "SGD", names: ["sgd", "singapore dollar", "新元", "新加坡元"] },
  { code: "HKD", names: ["hkd", "hong kong dollar", "港币", "港元"] },
];

const RMB_ALIASES = ["cny", "rmb", "人民币"];

function stripContextPrefix(text) {
  const prefix = "[Context:";
  if (!text.startsWith(prefix)) return text;
  const parts = text.split("\n\n");
  if (parts.length <= 1) return text;
  return parts.slice(1).join("\n\n");
}

function hasKeyword(text, keywords) {
  return keywords.some((kw) => text.includes(kw));
}

function findCityId(text) {
  const lower = text.toLowerCase();
  for (const city of CITY_ALIASES) {
    for (const name of city.names) {
      if (lower.includes(name)) return city.id;
    }
  }
  return null;
}

function findCurrenciesInOrder(text) {
  const lower = text.toLowerCase();
  const matches = [];
  for (const currency of CURRENCY_ALIASES) {
    for (const name of currency.names) {
      const idx = lower.indexOf(name);
      if (idx >= 0) matches.push({ code: currency.code, idx });
    }
  }
  for (const name of RMB_ALIASES) {
    const idx = lower.indexOf(name);
    if (idx >= 0) matches.push({ code: "CNY", idx });
  }
  const earliest = new Map();
  for (const match of matches) {
    const prev = earliest.get(match.code);
    if (!prev || match.idx < prev) earliest.set(match.code, match.idx);
  }
  return [...earliest.entries()]
    .map(([code, idx]) => ({ code, idx }))
    .sort((a, b) => a.idx - b.idx)
    .map((entry) => entry.code);
}

export function parseRealtimeIntent(rawText) {
  if (!rawText || typeof rawText !== "string") return null;
  const text = stripContextPrefix(rawText).trim();
  const lower = text.toLowerCase();

  if (hasKeyword(lower, ["weather", "forecast", "temperature", "天气", "气温"])) {
    const cityId = findCityId(text);
    if (cityId) return { type: "weather", cityId };
  }

  if (hasKeyword(lower, ["exchange rate", "fx", "rate", "汇率", "换汇", "兑"])) {
    const order = findCurrenciesInOrder(text);
    const hasCny = order.includes("CNY");
    const foreign = order.find((code) => code !== "CNY");
    if (hasCny && foreign) {
      const firstTwo = order.slice(0, 2);
      if (firstTwo.includes("CNY")) {
        return { type: "fx", from: firstTwo[0], to: firstTwo[1] };
      }
      return { type: "fx", from: foreign, to: "CNY" };
    }
  }

  return null;
}
