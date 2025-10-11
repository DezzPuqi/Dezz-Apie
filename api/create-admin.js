import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  // === KONFIGURASI ===
  const PANEL_URL = "https://panel.dezzhost.my.id"; // ganti ke domain panel lu
  const API_KEY = "ptla_xxxxxxxxxxxxxxxxxxx"; // API key admin utama Pterodactyl

  try {
    const { username, email, first_name, last_name, password } = req.body;

    // validasi input
    if (!username || !email || !first_name || !last_name || !password) {
      return res.status(400).json({ success: false, message: "Data tidak lengkap!" });
    }

    // buat user via Pterodactyl API
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
        root_admin: true, // ini bikin akun jadi admin
        language: "en",
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(400).json({
        success: false,
        message: "Gagal membuat akun admin!",
        error: data.errors || data,
      });
    }

    res.status(200).json({
      success: true,
      message: "Akun admin berhasil dibuat!",
      user: data.attributes,
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Kesalahan server",
      error: err.message,
    });
  }
}
