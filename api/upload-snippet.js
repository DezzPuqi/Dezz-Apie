import { createClient } from "@supabase/supabase-js";

// Konfigurasi langsung di sini (tanpa setting.js)
const supabaseUrl = "https://cyrbmfpciecmqolrkrlg.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZ3N1YWZ4cHd4dWhhZ29va3RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NTAzNzYsImV4cCI6MjA3MzMyNjM3Nn0.H91UP4fHTkQHcaE9pUmOlGuhHGUyYNc6rt-4cHrDZqU"; // ganti pakai key lu
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Hanya metode POST yang diperbolehkan!",
    });
  }

  try {
    const { title, language, description, code } = req.body;

    if (!title || !language || !code) {
      return res.status(400).json({
        success: false,
        message: "Parameter kurang! (title, language, code wajib diisi)",
      });
    }

    const { data, error } = await supabase.from("snippets").insert([
      {
        title,
        language,
        description: description || null,
        code,
        created_at: new Date().toISOString(),
      },
    ]).select("id");

    if (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: "Gagal menyimpan snippet ke Supabase",
        error: error.message,
      });
    }

    const snippetId = data[0]?.id || null;
    return res.status(200).json({
      success: true,
      message: "Snippet berhasil diupload",
      id: snippetId,
      view_url: `https://domainlu.com/view/${snippetId}`,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server",
      error: e.message,
    });
  }
}
