import assert from "node:assert/strict";
import { formatWeatherResponse, formatFxResponse } from "../src/lib/realtime.js";

const weatherText = formatWeatherResponse({
  cityName: "Beijing",
  currentTemp: 21.2,
  minTemp: 18.0,
  maxTemp: 26.5,
  condition: "Clear sky",
  date: "2025-03-08",
});
assert.match(weatherText, /Beijing/i);
assert.match(weatherText, /21/i);
assert.match(weatherText, /18.*2[6-7]/i);

const fxText = formatFxResponse({
  from: "USD",
  to: "CNY",
  rate: 7.1234,
  date: "2025-03-08",
});
assert.match(fxText, /USD/i);
assert.match(fxText, /CNY/i);
