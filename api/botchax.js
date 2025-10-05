// api/botchax.js
// Vercel serverless function that proxies requests to api.botcahx.eu.org
// - Replaces/sets ?apikey= with BOTCAHX_KEY (env) or default "DezzTobrut"
// - Optional quota per IP if QUOTA_PER_IP > 0
// - Uses Redis if REDIS_URL is provided; otherwise uses in-memory Map (non-persistent)

import { URL } from "url";

const BOTCAHX_KEY = process.env.BOTCAHX_KEY || "DezzTobrut";
const QUOTA_PER_IP = parseInt(process.env.QUOTA_PER_IP || "0", 10); // 0 = unlimited
const REDIS_URL = process.env.REDIS_URL || ""; // optional

let redisClient = null;
let inMemoryMap = new Map();

// lazy-load ioredis only if REDIS_URL present
async function getRedis() {
  if (!REDIS_URL) return null;
  if (redisClient) return redisClient;
  const { default: IORedis } = await import("ioredis");
  redisClient = new IORedis(REDIS_URL);
  return redisClient;
}

async function getUsed(ip) {
  if (!QUOTA_PER_IP) return 0;
  const r = await getRedis();
  if (r) {
    const v = await r.get(`bypass:used:${ip}`);
    return parseInt(v || "0", 10);
  } else {
    return parseInt(inMemoryMap.get(ip) || "0", 10);
  }
}

async function incrUsed(ip) {
  if (!QUOTA_PER_IP) return;
  const r = await getRedis();
  if (r) {
    await r.incr(`bypass:used:${ip}`);
  } else {
    const cur = parseInt(inMemoryMap.get(ip) || "0", 10);
    inMemoryMap.set(ip, cur + 1);
  }
}

function getClientIp(req) {
  return (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown").toString().split(",")[0].trim();
}

export default async function handler(req, res) {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: "Missing url parameter" });

    let upstream;
    try {
      upstream = new URL(url);
    } catch (e) {
      return res.status(400).json({ error: "Invalid url parameter" });
    }

    // optional safety: allow only the original host
    if (upstream.hostname !== "api.botcahx.eu.org") {
      return res.status(400).json({ error: "Upstream host not allowed" });
    }

    const ip = getClientIp(req);

    // quota check
    if (QUOTA_PER_IP && QUOTA_PER_IP > 0) {
      const used = await getUsed(ip);
      if (used >= QUOTA_PER_IP) {
        return res.status(429).json({ error: "Quota exceeded", quota: QUOTA_PER_IP, used });
      }
    }

    // set/replace apikey param
    upstream.searchParams.set("apikey", BOTCAHX_KEY);

    // forward request (GET only for safety)
    const upstreamResp = await fetch(upstream.toString(), {
      method: "GET",
      headers: {
        "User-Agent": req.headers["user-agent"] || "bypass-proxy",
        Accept: req.headers.accept || "*/*",
      },
    });

    // increment usage after successful upstream response (2xx)
    if (upstreamResp.ok && QUOTA_PER_IP && QUOTA_PER_IP > 0) {
      await incrUsed(ip);
    }

    // forward response
    const contentType = upstreamResp.headers.get("content-type");
    if (contentType) res.setHeader("content-type", contentType);

    // remove sensitive headers if any
    const headersToCopy = ["content-length", "content-type", "cache-control"];
    headersToCopy.forEach(h => {
      const v = upstreamResp.headers.get(h);
      if (v) res.setHeader(h, v);
    });

    res.status(upstreamResp.status);
    const buffer = await upstreamResp.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error("proxy error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
