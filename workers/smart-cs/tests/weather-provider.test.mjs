import assert from "node:assert/strict";
import { parseWeatherPayload } from "../src/lib/realtime.js";

const payload = {
  current_condition: [
    {
      temp_C: "22",
      weatherDesc: [{ value: "Partly cloudy" }],
    },
  ],
  weather: [
    {
      date: "2025-03-09",
      maxtempC: "28",
      mintempC: "18",
    },
  ],
};

const result = parseWeatherPayload(payload, "Beijing");
assert.deepEqual(result, {
  cityName: "Beijing",
  currentTemp: 22,
  minTemp: 18,
  maxTemp: 28,
  condition: "Partly cloudy",
  date: "2025-03-09",
});
