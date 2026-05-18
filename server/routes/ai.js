const express = require("express");
const protect = require("../middleware/authMiddleware");
const logger = require("../config/logger");

const router = express.Router();

router.post("/suggestions", protect, async (req, res) => {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        message:
          "AI smart reply is not configured. Add GROQ_API_KEY on Render.",
      });
    }

    const { messages } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ message: "No messages provided" });
    }

    const context = messages
      .slice(-5)
      .filter((m) => m?.content && m.content.trim() !== "")
      .map((msg) => `${msg.sender?.username || "User"}: ${msg.content}`)
      .join("\n");

    if (!context) {
      return res.json({ suggestions: [] });
    }

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          max_tokens: 150,
          temperature: 0.7,
          messages: [
            {
              role: "user",
              content: `Chat conversation:\n${context}\n\nGive 3 short reply suggestions (max 6 words each) matching the language used.\nRespond with ONLY a JSON array, nothing else: ["reply1", "reply2", "reply3"]`,
            },
          ],
        }),
      },
    );

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      logger.error("Groq API error:", errData);
      return res.status(502).json({ message: "AI service unavailable" });
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content?.trim();

    if (!text) {
      return res.json({ suggestions: [] });
    }

    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    if (!Array.isArray(parsed)) {
      return res.json({ suggestions: [] });
    }

    res.json({ suggestions: parsed.slice(0, 3) });
  } catch (err) {
    logger.error("AI suggestions error:", err.message);
    res.status(500).json({ message: "Failed to generate suggestions" });
  }
});

module.exports = router;
