// api/claude.js — Vercel serverless function (CommonJS)
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "di45b4ymc",
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function fetchAsBase64(signedUrl) {
  try {
    const res = await fetch(signedUrl);
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    return Buffer.from(buffer).toString("base64");
  } catch { return null; }
}

function getSignedUrl(publicId) {
  try {
    return cloudinary.url(publicId, {
      sign_url: true,
      secure: true,
      expires_at: Math.floor(Date.now() / 1000) + 300,
    });
  } catch { return null; }
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Parser le body manuellement si nécessaire
  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: "Invalid JSON" }); }
  }
  if (!body) return res.status(400).json({ error: "Empty body" });

  try {
    const { system, messages, max_tokens, bilanPublicIds = [] } = body;

    const docsContent = [];
    for (const bilan of bilanPublicIds.slice(0, 4)) {
      const signedUrl = getSignedUrl(bilan.publicId);
      if (!signedUrl) continue;
      const b64 = await fetchAsBase64(signedUrl);
      if (!b64) continue;
      const isPdf = bilan.type?.includes("pdf") || bilan.url?.includes(".pdf");
      if (isPdf) {
        docsContent.push({
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: b64 },
          title: bilan.name || "Bilan",
        });
      } else {
        docsContent.push({
          type: "image",
          source: { type: "base64", media_type: bilan.type || "image/jpeg", data: b64 },
        });
      }
    }

    const enrichedMessages = messages.map((msg, idx) => {
      if (idx === 0 && msg.role === "user" && docsContent.length > 0) {
        const existing = Array.isArray(msg.content)
          ? msg.content
          : [{ type: "text", text: msg.content }];
        return { ...msg, content: [...existing, ...docsContent] };
      }
      return msg;
    });

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.REACT_APP_ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "pdfs-2024-09-25",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: max_tokens || 4000,
        system,
        messages: enrichedMessages,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || "Erreur Anthropic", detail: data });
    }
    return res.status(200).json(data);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
