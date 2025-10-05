// api/checkkey.js
// Vercel serverless function that queries api.botcahx.eu.org checkkey endpoint
// Returns a safe summary JSON to the client (does NOT return the apikey)

const BOTCAHX_KEY = process.env.BOTCAHX_KEY || "DezzTobrut";
const UPSTREAM = "https://api.botcahx.eu.org/api/checkkey";

export default async function handler(req, res) {
  try {
    const upstreamUrl = `${UPSTREAM}?apikey=${encodeURIComponent(BOTCAHX_KEY)}`;
    const r = await fetch(upstreamUrl, {
      method: "GET",
      headers: {
        "User-Agent": req.headers["user-agent"] || "bypass-proxy-checker",
        Accept: "application/json"
      },
    });

    if (!r.ok) {
      // forward basic error info
      const txt = await r.text();
      return res.status(r.status).json({ error: "Upstream error", status: r.status, body: txt });
    }

    const j = await r.json();

    // Normalize & sanitize output so client doesn't get sensitive info
    const result = j.result || {};
    const out = {
      status: j.status || 200,
      apikey: result.apikey || null,           // if you don't want apikey at all, set to null
      defaultapikey: result.defaultapikey || null,
      email: result.email || null,
      username: result.username || null,
      limit: typeof result.limit === "number" ? result.limit : (parseInt(result.limit) || null),
      premium: !!result.premium,
      expired: result.expired || null,
      todayHit: result.todayHit || 0,
      totalHit: result.totalHit || 0,
      dataIP: Array.isArray(result.dataIP) ? result.dataIP.map(it => ({
        ip: it.ip,
        count: it.count,
        blacklist: !!it.blacklist
      })) : []
    };

    // You can remove apikey/defaultapikey/email if you prefer not to expose them to the client:
    // delete out.apikey; delete out.defaultapikey; delete out.email;

    return res.status(200).json(out);
  } catch (err) {
    console.error("checkkey proxy error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
