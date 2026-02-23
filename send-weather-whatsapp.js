import twilio from "twilio";

// --- Twilio config ---
const TWILIO_ACCOUNT_SID = "ACe8edcabe6f5e2f5178d5f488c3f77544";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN; // keep secret!
const WHATSAPP_FROM = "whatsapp:+14155238886"; // Twilio Sandbox number
const WHATSAPP_TO = process.env.WHATSAPP_TO;   // like: whatsapp:+491701234567

// --- Bright Sky (Berlin) ---
const LAT = 52.52;
const LON = 13.41;

function outfitAdvice(tempC, rainProbPct, windSpeed) {
  const tips = [];
  if (tempC <= 0) tips.push("Heavy coat, warm layers, gloves/hat.");
  else if (tempC <= 8) tips.push("Warm jacket/coat + layers.");
  else if (tempC <= 15) tips.push("Light jacket or sweater.");
  else if (tempC <= 22) tips.push("T-shirt + light layer if needed.");
  else tips.push("Light clothing; stay hydrated.");

  if (rainProbPct >= 30) tips.push("Bring an umbrella / rain jacket.");
  if ((windSpeed ?? 0) >= 25) tips.push("Windy: consider a windbreaker.");

  return tips.join(" ");
}

async function main() {
  if (!TWILIO_AUTH_TOKEN) throw new Error("Missing TWILIO_AUTH_TOKEN (set it as a GitHub Secret)");
  if (!WHATSAPP_TO) throw new Error("Missing WHATSAPP_TO (set it as a GitHub Secret)");

  const today = new Date().toISOString().slice(0, 10);

  const currentUrl = `https://api.brightsky.dev/current_weather?lat=${LAT}&lon=${LON}`;
  const forecastUrl = `https://api.brightsky.dev/weather?lat=${LAT}&lon=${LON}&date=${today}`;

  const [curRes, fcRes] = await Promise.all([fetch(currentUrl), fetch(forecastUrl)]);
  if (!curRes.ok) throw new Error(`Bright Sky current_weather error: ${await curRes.text()}`);
  if (!fcRes.ok) throw new Error(`Bright Sky weather error: ${await fcRes.text()}`);

  const curData = await curRes.json();
  const fcData = await fcRes.json();

  const cur = curData.weather;
  const hourly = fcData.weather ?? [];

  const tempC = Math.round(cur.temperature);
  const windSpeed = cur.wind_speed ?? 0;
  const condition = cur.condition ?? "weather";

  // take next 12 hourly items (simple approach)
  const next12 = hourly.slice(0, 12);
  const rainProbPct =
    next12.length > 0
      ? Math.round(next12.reduce((sum, h) => sum + (h.precipitation_probability ?? 0), 0) / next12.length)
      : 0;

  const advice = outfitAdvice(tempC, rainProbPct, windSpeed);

  const msg =
    `🌤️ Berlin: ${tempC}°C, ${condition}\n` +
    `🌧️ Rain chance (next 12h): ${rainProbPct}%\n` +
    `💨 Wind: ${windSpeed}\n` +
    `👕 What to wear: ${advice}`;

  const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  await client.messages.create({
    from: WHATSAPP_FROM,
    to: WHATSAPP_TO,
    body: msg,
  });

  console.log("Sent WhatsApp message:", msg);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
