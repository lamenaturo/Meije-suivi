// api/claude.js — Vercel serverless function
module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Lire et parser le body
  let body;
  try {
    if (req.body && typeof req.body === "object") {
      body = req.body;
    } else {
      const chunks = [];
      for await (const chunk of req) chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
      body = JSON.parse(Buffer.concat(chunks).toString("utf-8"));
    }
  } catch (e) {
    return res.status(400).json({ error: "Body parse error: " + e.message });
  }

  const { system, messages, max_tokens } = body;

  if (!messages || !system) {
    return res.status(400).json({ error: "Paramètres manquants : system et messages requis" });
  }

  const apiKey = process.env.ANTHROPIC_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Clé ANTHROPIC_KEY manquante dans les variables Vercel" });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: max_tokens || 4000,
        system,
        messages,
      }),
    });

    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { return res.status(500).json({ error: "Réponse Anthropic non-JSON : " + text.slice(0, 200) }); }

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || "Erreur Anthropic", detail: data });
    }

    return res.status(200).json(data);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
