const express = require("express");
const protect = require("../middleware/authMiddleware");
const logger = require("../config/logger");
const {
  normalizeMessages,
  getMessageToReplyTo,
  getContextualSuggestions,
  callGroq,
} = require("../utils/suggestions");

const router = express.Router();

router.post("/suggestions", protect, async (req, res) => {
  try {
    const { messages, userId, username } = req.body;
    const normalized = normalizeMessages(messages);
    const myName = username || req.user?.username || "User";
    const myId = userId || String(req.user?._id || "");

    if (!normalized.length) {
      return res.status(400).json({ message: "No messages provided" });
    }

    const apiKey = process.env.GROQ_API_KEY?.trim();

    if (apiKey) {
      try {
        const suggestions = await callGroq(apiKey, normalized, myId, myName);
        if (suggestions.length >= 2) {
          return res.json({ suggestions, source: "ai" });
        }
      } catch (err) {
        logger.error("Groq API error:", err.message);
      }
    }

    res.json({
      suggestions: getContextualSuggestions(normalized, myId),
      source: "local",
    });
  } catch (err) {
    logger.error("AI suggestions error:", err.message);
    res.json({
      suggestions: getContextualSuggestions(
        normalizeMessages(req.body.messages || []),
        req.body.userId,
      ),
      source: "local",
    });
  }
});

module.exports = router;
