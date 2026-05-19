const express = require("express");
const protect = require("../middleware/authMiddleware");
const logger = require("../config/logger");
const {
  normalizeMessages,
  buildContext,
  getMessageToReplyTo,
  getContextualSuggestions,
  callGroq,
} = require("../utils/suggestions");

const router = express.Router();

router.post("/suggestions", protect, async (req, res) => {
  try {
    const { messages, userId } = req.body;
    const normalized = normalizeMessages(messages);

    if (!normalized.length) {
      return res.status(400).json({ message: "No messages provided" });
    }

    const context = buildContext(normalized);
    if (!context) {
      return res.json({ suggestions: [], source: "local" });
    }

    const replyTo = getMessageToReplyTo(normalized, userId);
    const apiKey = process.env.GROQ_API_KEY?.trim();

    if (apiKey) {
      try {
        const suggestions = await callGroq(apiKey, context, replyTo);
        if (suggestions.length >= 2) {
          return res.json({ suggestions, source: "ai" });
        }
      } catch (err) {
        logger.error("Groq API error:", err.message);
      }
    }

    res.json({
      suggestions: getContextualSuggestions(normalized, userId),
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
