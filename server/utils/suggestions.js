const STOP_WORDS = new Set([
  "the", "and", "for", "that", "this", "with", "you", "are", "was", "have",
  "hai", "hain", "kya", "main", "tum", "aap", "ke", "ki", "ka", "ko", "se",
  "me", "mein", "par", "ya", "nahi", "bhi", "toh", "aur", "ek", "wo", "ye",
  "will", "can", "just", "like", "what", "when", "how", "your", "from", "they",
]);

const HINDI_ROMAN =
  /\b(haan|nahin|nahi|kya|kyu|kaise|kab|theek|thik|acha|achha|bhai|yaar|sun|bol|samajh|matlab|bilkul|shayad|kal|aaj|ghar|kaam)\b/gi;

const normalizeSender = (msg) => ({
  _id: msg.sender?._id || msg.sender,
  username: msg.sender?.username || "User",
});

const normalizeMessages = (messages) =>
  (messages || [])
    .filter((m) => m?.content?.trim())
    .map((m) => ({
      content: m.content.trim(),
      mediaType: m.mediaType || "text",
      sender: normalizeSender(m),
    }));

const detectChatLanguage = (normalized) => {
  const recent = normalized
    .slice(-10)
    .map((m) => m.content)
    .join(" ");

  const devanagari = (recent.match(/[\u0900-\u097F]/g) || []).length;
  const latin = (recent.match(/[a-zA-Z]/g) || []).length;
  const hindiRomanHits = (recent.match(HINDI_ROMAN) || []).length;

  if (devanagari > 12 && devanagari > latin * 0.4) {
    return "hindi";
  }

  const words = recent
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2);

  const englishWords = words.filter(
    (w) => /^[a-z]+$/.test(w) && !HINDI_ROMAN.test(w),
  );

  const englishRatio = englishWords.length / Math.max(words.length, 1);

  if (devanagari < 4 && hindiRomanHits <= 1 && englishRatio >= 0.65) {
    return "english";
  }

  if (hindiRomanHits >= 2 || devanagari >= 4) {
    return "hinglish";
  }

  return latin >= devanagari ? "english" : "hinglish";
};

const getLanguageInstruction = (lang) => {
  if (lang === "english") {
    return `CHAT LANGUAGE: English
Write all 3 replies in ENGLISH ONLY.
Forbidden: Hindi words (haan, theek, kya, nahi, yaar, acha), Hinglish, Devanagari script.
Sound like natural English texting.`;
  }
  if (lang === "hindi") {
    return `CHAT LANGUAGE: Hindi (Devanagari)
Write all 3 replies in Hindi script only.`;
  }
  return `CHAT LANGUAGE: Hinglish (Roman Hindi + English mix)
Match the casual Hinglish style of the chat.`;
};

const hasWrongLanguage = (text, lang) => {
  if (lang !== "english") return false;
  if (/[\u0900-\u097F]/.test(text)) return true;
  return HINDI_ROMAN.test(text);
};

const getMessageToReplyTo = (messages, userId) => {
  const withText = normalizeMessages(messages);
  if (!withText.length) return null;

  const last = withText.at(-1);
  const lastId = String(last.sender._id || "");

  if (userId && lastId === String(userId)) {
    return withText.at(-2) || last;
  }

  return last;
};

const extractKeywords = (text) => {
  if (!text) return [];
  return [
    ...new Set(
      text
        .replace(/[^\w\s\u0900-\u097F]/gi, " ")
        .split(/\s+/)
        .map((w) => w.toLowerCase())
        .filter((w) => w.length > 2 && !STOP_WORDS.has(w)),
    ),
  ].slice(0, 8);
};

const buildGroqMessages = (normalized, userId, username, lang) => {
  const me = String(userId || "");
  const myName = username || "Me";
  const recent = normalized.slice(-15);
  const replyTo = getMessageToReplyTo(normalized, userId);
  const latestText = replyTo?.content?.trim() || recent.at(-1)?.content || "";
  const latestFrom = replyTo?.sender?.username || "someone";

  const history = recent.map((msg) => {
    const isMe = String(msg.sender._id) === me;
    return {
      role: isMe ? "assistant" : "user",
      content: msg.content,
    };
  });

  return [
    {
      role: "system",
      content: `You suggest 3 short chat replies for "${myName}".

${getLanguageInstruction(lang)}

RULES:
- Read the conversation below.
- Reply ONLY to the latest message: ${latestFrom} said "${latestText}"
- Be precise and on-topic — use words from that latest message.
- Max 14 words per reply.
- 3 different replies.

Output JSON only: {"replies":["...","...","..."]}`,
    },
    ...history,
    {
      role: "user",
      content: `Latest: "${latestText}"\nGive 3 ${lang} replies for ${myName}. JSON only.`,
    },
  ];
};

const parseGroqSuggestions = (text) => {
  if (!text) return [];
  try {
    const clean = text.replace(/```json|```/g, "").trim();
    const objMatch = clean.match(/\{[\s\S]*\}/);
    if (objMatch) {
      const obj = JSON.parse(objMatch[0]);
      const list = obj.replies || obj.suggestions || obj.options;
      if (Array.isArray(list)) {
        return [...new Set(list.map((s) => String(s).trim()).filter(Boolean))].slice(
          0,
          3,
        );
      }
    }
    const arrMatch = clean.match(/\[[\s\S]*\]/);
    if (arrMatch) {
      const parsed = JSON.parse(arrMatch[0]);
      return Array.isArray(parsed)
        ? [...new Set(parsed.map((s) => String(s).trim()).filter(Boolean))].slice(
            0,
            3,
          )
        : [];
    }
  } catch {
    /* empty */
  }
  return [];
};

const filterByLanguage = (suggestions, lang) => {
  if (lang !== "english") return suggestions;
  const filtered = suggestions.filter((s) => !hasWrongLanguage(s, lang));
  return filtered.length ? filtered : suggestions;
};

const scoreRelevance = (suggestions, keywords) => {
  if (!keywords.length) return 1;
  const hits = suggestions.filter((s) => {
    const lower = s.toLowerCase();
    return keywords.some((k) => lower.includes(k));
  }).length;
  return hits / suggestions.length;
};

const requestGroq = async (apiKey, groqMessages, temperature) => {
  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 260,
        temperature,
        top_p: 0.85,
        messages: groqMessages,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Groq error ${response.status}`);
  }

  const data = await response.json();
  return parseGroqSuggestions(data?.choices?.[0]?.message?.content?.trim());
};

const callGroq = async (apiKey, normalized, userId, username) => {
  const lang = detectChatLanguage(normalized);
  const replyTo = getMessageToReplyTo(normalized, userId);
  const keywords = extractKeywords(replyTo?.content || normalized.at(-1)?.content);

  let groqMessages = buildGroqMessages(normalized, userId, username, lang);
  let suggestions = filterByLanguage(
    await requestGroq(apiKey, groqMessages, 0.55),
    lang,
  );

  const needsRetry =
    suggestions.length < 2 ||
    scoreRelevance(suggestions, keywords) < 0.34 ||
    (lang === "english" && suggestions.some((s) => hasWrongLanguage(s, lang)));

  if (needsRetry) {
    const retryMessages = [
      ...groqMessages.slice(0, 1),
      {
        role: "system",
        content: `${getLanguageInstruction(lang)}
Latest message: "${replyTo?.content}"
Use these exact topic words: ${keywords.join(", ")}
JSON: {"replies":["...","...","..."]}`,
      },
      ...groqMessages.slice(1, -1),
      {
        role: "user",
        content: `Precise ${lang} replies to: "${replyTo?.content}". JSON only.`,
      },
    ];
    const retry = filterByLanguage(
      await requestGroq(apiKey, retryMessages, 0.35),
      lang,
    );
    if (retry.length >= 2) suggestions = retry;
  }

  return { suggestions, language: lang };
};

const getContextualSuggestions = (messages, userId) => {
  const normalized = normalizeMessages(messages);
  const lang = detectChatLanguage(normalized);
  const replyTo = getMessageToReplyTo(normalized, userId);
  const text = replyTo?.content?.trim() || "";
  const speaker = replyTo?.sender?.username || "friend";
  const keywords = extractKeywords(text);
  const w1 = keywords[0] || "that";
  const w2 = keywords[1] || "";
  const w3 = keywords[2] || "";

  if (!text) {
    if (lang === "english") {
      return ["Hey! What's up?", "I'm here, go ahead", "Tell me more"];
    }
    return ["Hello! 👋", "Kya chal raha hai?", "Bol, sun raha hoon"];
  }

  if (lang === "english") {
    if (text.includes("?")) {
      return [
        `Yeah, ${w1} works for me`,
        `Not sure about ${w1} yet`,
        `Good point on ${w2 || w1}, ${speaker}`,
      ];
    }
    return [
      `Yeah ${speaker}, ${w1} makes sense`,
      `I agree — ${w1} ${w2}`.trim(),
      `Sounds good, let's do ${w1}`,
    ];
  }

  if (lang === "hindi") {
    return [
      `हाँ, ${w1} ठीक है`,
      `${speaker}, ${w1} पर सहमत हूँ`,
      `अच्छा, ${w2 || w1} पर बात करते हैं`,
    ];
  }

  if (text.includes("?")) {
    return [
      `Haan ${speaker}, ${w1} ${w2}`.trim(),
      `Nahi, ${w1} shayad nahi`,
      `${w3 || w1} — good question`,
    ];
  }

  return [
    `Haan ${speaker}, ${w1} sahi hai`,
    `${w1} — agree 👍`,
    `Chalo ${w1} ${w2} pe baat karte hain`.trim(),
  ];
};

module.exports = {
  normalizeMessages,
  detectChatLanguage,
  getMessageToReplyTo,
  getContextualSuggestions,
  callGroq,
};
