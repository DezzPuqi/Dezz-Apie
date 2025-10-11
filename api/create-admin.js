// File: /api/create-admin.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({
      success: true,
      message: "Endpoint aktif, gunakan POST dengan { username } untuk membuat admin",
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  // === KONFIGURASI (langsung diisi, tanpa env) ===
  const PANEL_URL = "https://madamdezz.resellergaming-official.my.id";
  const API_KEY = "ptla_SqvSBV441RLgP9G0bvsEnvuDPcIceHKOIvteUsmkk5r";

  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ success: false, message: "Username wajib diisi!" });
    }

    // Generate password: Username + 2 angka random
    const randomNumber = Math.floor(Math.random() * 90 + 10); // 10-99
    const password = `${username}${randomNumber}`;

    // Default email & name
    const email = `${username}@dezzhost.my.id`;
    const first_name = "Admin";
    const last_name = "User";

    // Buat user via Pterodactyl API
    const response = await fetch(`${PANEL_URL}/api/application/users`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        username,
        email,
        first_name,
        last_name,
        password,
        root_admin: true,
        language: "en",
      }),
    });

    // parse body (may throw)
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return res.status(400).json({
        success: false,
        message: "Gagal membuat akun admin!",
        error: data?.errors || data || { status: response.status, statusText: response.statusText },
      });
    }

    // Coba ambil atribut yang umum, fallback ke data kalau struktur beda
    const userAttrs = (data && data.attributes) ? data.attributes : data;

    res.status(200).json({
      success: true,
      message: "Akun admin berhasil dibuat!",
      user: {
        username: userAttrs?.username || username,
        password: password,
        email: userAttrs?.email || email,
        id: userAttrs?.id || null,
        raw: userAttrs || data || null,
      },
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Kesalahan server",
      error: err.message,
    });
  }
}
