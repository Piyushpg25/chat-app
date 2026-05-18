const express = require("express");
const protect = require("../middleware/authMiddleware");
const logger = require("../config/logger");

const router = express.Router();

const buildContext = (messages) =>
  messages
    .slice(-5)
    .filter((m) => m?.content && m.content.trim() !== "")
    .map((msg) => `${msg.sender?.username || "User"}: ${msg.content}`)
    .join("\n");

const getLocalSuggestions = (messages) => {
  const last =
    messages.filter((m) => m?.content?.trim()).at(-1)?.content?.toLowerCase() ||
    "";

  if (/hello|hi|hey|namaste|kaise/.test(last)) {
    return ["Namaste! 👋", "Hello!", "Main theek hoon, tum batao"];
  }
  if (/\?/.test(last)) {
    return ["Haan", "Nahi", "Shayad"];
  }
  if (/thank|dhanyav|shukriya/.test(last)) {
    return ["Welcome!", "Koi baat nahi 😊", "Khushi hui"];
  }
  return ["Okay 👍", "Theek hai", "Samajh gaya"];
};

const parseGroqSuggestions = (text) => {
  if (!text) return [];
  try {
    const clean = text.replace(/```json|```/g, "").trim();
    const match = clean.match(/\[[\s\S]*\]/);
    const parsed = JSON.parse(match ? match[0] : clean);
    return Array.isArray(parsed) ? parsed.slice(0, 3) : [];
  } catch {
    return text
      .split("\n")
      .map((line) => line.replace(/^[\d.\-*]+\s*/, "").trim())
      .filter(Boolean)
      .slice(0, 3);
  }
};

router.post("/suggestions", protect, async (req, res) => {
  try {
    const { messages } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ message: "No messages provided" });
    }

    const context = buildContext(messages);
    if (!context) {
      return res.json({ suggestions: [], source: "local" });
    }

    const apiKey = process.env.GROQ_API_KEY?.trim();
    if (!apiKey) {
      return res.json({
        suggestions: getLocalSuggestions(messages),
        source: "local",
      });
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
      logger.error("Groq API error:", await response.text());
      return res.json({
        suggestions: getLocalSuggestions(messages),
        source: "local",
      });
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content?.trim();
    const suggestions = parseGroqSuggestions(text);

    res.json({
      suggestions: suggestions.length
        ? suggestions
        : getLocalSuggestions(messages),
      source: suggestions.length ? "ai" : "local",
    });
  } catch (err) {
    logger.error("AI suggestions error:", err.message);
    res.json({
      suggestions: getLocalSuggestions(req.body.messages || []),
      source: "local",
    });
  }
});

module.exports = router;
