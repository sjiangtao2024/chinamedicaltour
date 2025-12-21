const WEATHER_TTL_MS = 10 * 60 * 1000;
const FX_TTL_MS = 10 * 60 * 1000;

const weatherCache = new Map();
const fxCache = new Map();

const CITY_INFO = {
  beijing: { name: "Beijing", lat: 39.9042, lon: 116.4074 },
  shanghai: { name: "Shanghai", lat: 31.2304, lon: 121.4737 },
  guangzhou: { name: "Guangzhou", lat: 23.1291, lon: 113.2644 },
  shenzhen: { name: "Shenzhen", lat: 22.5431, lon: 114.0579 },
  chengdu: { name: "Chengdu", lat: 30.5728, lon: 104.0668 },
  chongqing: { name: "Chongqing", lat: 29.5630, lon: 106.5516 },
  hangzhou: { name: "Hangzhou", lat: 30.2741, lon: 120.1551 },
  suzhou: { name: "Suzhou", lat: 31.2989, lon: 120.5853 },
  nanjing: { name: "Nanjing", lat: 32.0603, lon: 118.7969 },
  xian: { name: "Xi'an", lat: 34.3416, lon: 108.9398 },
  wuhan: { name: "Wuhan", lat: 30.5928, lon: 114.3055 },
  tianjin: { name: "Tianjin", lat: 39.0851, lon: 117.1994 },
  qingdao: { name: "Qingdao", lat: 36.0671, lon: 120.3826 },
  xiamen: { name: "Xiamen", lat: 24.4798, lon: 118.0894 },
  harbin: { name: "Harbin", lat: 45.8038, lon: 126.5349 },
  kunming: { name: "Kunming", lat: 25.0389, lon: 102.7183 },
  guilin: { name: "Guilin", lat: 25.2736, lon: 110.2900 },
  lhasa: { name: "Lhasa", lat: 29.6520, lon: 91.1721 },
  sanya: { name: "Sanya", lat: 18.2528, lon: 109.5119 },
  dalian: { name: "Dalian", lat: 38.9140, lon: 121.6147 },
  hongkong: { name: "Hong Kong", lat: 22.3193, lon: 114.1694 },
  macau: { name: "Macau", lat: 22.1987, lon: 113.5439 },
};

function getCache(map, key, ttlMs) {
  const hit = map.get(key);
  if (!hit) return null;
  if (Date.now() - hit.ts > ttlMs) {
    map.delete(key);
    return null;
  }
  return hit.value;
}

function setCache(map, key, value) {
  map.set(key, { ts: Date.now(), value });
}

export function parseWeatherPayload(data, cityName) {
  const current = data?.current_condition?.[0];
  const daily = data?.weather?.[0];
  if (!current || !daily) return null;

  const currentTemp = Number(current.temp_C);
  const minTemp = Number(daily.mintempC);
  const maxTemp = Number(daily.maxtempC);
  const condition = current.weatherDesc?.[0]?.value || "Unknown";
  const date = daily.date || null;

  if (!Number.isFinite(currentTemp)) return null;
  if (!Number.isFinite(minTemp) || !Number.isFinite(maxTemp)) return null;

  return {
    cityName,
    currentTemp,
    minTemp,
    maxTemp,
    condition,
    date,
  };
}

async function fetchWeather(cityId) {
  const cached = getCache(weatherCache, cityId, WEATHER_TTL_MS);
  if (cached) return { payload: cached, meta: { source: "weather", cached: true } };

  const city = CITY_INFO[cityId];
  if (!city) {
    const err = new Error("unsupported_city");
    err.status = 400;
    throw err;
  }

  const res = await fetch(`https://wttr.in/${encodeURIComponent(city.name)}?format=j1`);
  if (!res.ok) {
    const err = new Error("weather_fetch_failed");
    err.status = res.status;
    err.detail = await res.text();
    throw err;
  }
  const data = await res.json();
  const payload = parseWeatherPayload(data, city.name);
  if (!payload) {
    const err = new Error("weather_payload_invalid");
    err.status = 502;
    throw err;
  }
  setCache(weatherCache, cityId, payload);
  return { payload, meta: { source: "weather", cached: false } };
}

async function fetchFx(from, to) {
  const key = `${from}_${to}`;
  const cached = getCache(fxCache, key, FX_TTL_MS);
  if (cached) return { payload: cached, meta: { source: "fx", cached: true } };

  const url = new URL("https://api.frankfurter.app/latest");
  url.searchParams.set("from", from);
  url.searchParams.set("to", to);
  const res = await fetch(url.toString());
  if (!res.ok) {
    const err = new Error("fx_fetch_failed");
    err.status = res.status;
    err.detail = await res.text();
    throw err;
  }
  const data = await res.json();
  const rate = data?.rates?.[to];
  if (!rate) {
    const err = new Error("fx_payload_invalid");
    err.status = 502;
    throw err;
  }
  const payload = { from, to, rate, date: data?.date || null };
  setCache(fxCache, key, payload);
  return { payload, meta: { source: "fx", cached: false } };
}

export function formatWeatherResponse({ cityName, currentTemp, minTemp, maxTemp, condition, date }) {
  const tempNow = Number.isFinite(currentTemp) ? `${Math.round(currentTemp)}°C` : "N/A";
  const min = Number.isFinite(minTemp) ? Math.round(minTemp) : null;
  const max = Number.isFinite(maxTemp) ? Math.round(maxTemp) : null;
  const range = min !== null && max !== null ? `${min}–${max}°C` : "N/A";
  const day = date ? ` (${date})` : "";
  return [
    `Current weather in ${cityName}${day}: ${tempNow}, ${condition}.`,
    `Today: ${range}.`,
    "Source: Open-Meteo (reference only).",
  ].join("\n");
}

export function formatFxResponse({ from, to, rate, date }) {
  const formatted = Number.isFinite(rate) ? rate.toFixed(4) : "N/A";
  const day = date ? `as of ${date}` : "latest";
  return [
    `Reference exchange rate (${day}): 1 ${from} ≈ ${formatted} ${to}.`,
    "Source: Frankfurter/ECB. Actual rates may vary by provider.",
  ].join("\n");
}

export async function getRealtimeReply(intent) {
  if (!intent) return null;
  if (intent.type === "weather") {
    try {
      const { payload, meta } = await fetchWeather(intent.cityId);
      return { text: formatWeatherResponse(payload), meta };
    } catch (err) {
      return {
        text: "I couldn't fetch the real-time weather right now. Please check a weather app or official source.",
        meta: {
          source: "weather",
          error: true,
          status: err?.status || null,
          message: err?.message || "weather_fetch_failed",
          detail: err?.detail || null,
        },
      };
    }
  }

  if (intent.type === "fx") {
    try {
      const { payload, meta } = await fetchFx(intent.from, intent.to);
      return { text: formatFxResponse(payload), meta };
    } catch (err) {
      return {
        text: "I couldn't fetch the real-time exchange rate right now. Please check your bank or a trusted FX source.",
        meta: {
          source: "fx",
          error: true,
          status: err?.status || null,
          message: err?.message || "fx_fetch_failed",
          detail: err?.detail || null,
        },
      };
    }
  }

  return null;
}
