// api/checklimit.js
// Serverless function untuk ambil limit & todayHit dari api.botcahx

const BOTCAHX_KEY = process.env.BOTCAHX_KEY || "DezzTobrut";
const UPSTREAM = "https://api.botcahx.eu.org/api/checkkey";

export default async function handler(req, res) {
  try {
    const url = `${UPSTREAM}?apikey=${encodeURIComponent(BOTCAHX_KEY)}`;
    const r = await fetch(url);
    if (!r.ok) return res.status(r.status).json({ error: "Upstream error" });

    const j = await r.json();
    const result = j.result || {};
    res.status(200).json({
      limit: result.limit ?? 0,
      todayHit: result.todayHit ?? 0
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}
