const STOP_WORDS = new Set([
  "the", "and", "for", "that", "this", "with", "you", "are", "was", "have",
  "hai", "hain", "kya", "main", "tum", "aap", "ke", "ki", "ka", "ko", "se",
]);

const HINDI_ROMAN =
  /\b(haan|nahin|nahi|kya|kyu|kaise|kab|theek|thik|acha|achha|bhai|yaar|bol|samajh|bilkul|shayad)\b/gi;

export const normalizeMessages = (messages) =>
  (messages || [])
    .filter((m) => m?.content?.trim())
    .map((m) => ({
      content: m.content.trim(),
      mediaType: m.mediaType || "text",
      sender: {
        _id: m.sender?._id || m.sender,
        username: m.sender?.username || "User",
      },
    }));

export const detectChatLanguage = (normalized) => {
  const recent = normalized
    .slice(-10)
    .map((m) => m.content)
    .join(" ");

  const devanagari = (recent.match(/[\u0900-\u097F]/g) || []).length;
  const latin = (recent.match(/[a-zA-Z]/g) || []).length;
  const hindiRomanHits = (recent.match(HINDI_ROMAN) || []).length;

  if (devanagari > 12 && devanagari > latin * 0.4) return "hindi";

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
  if (hindiRomanHits >= 2 || devanagari >= 4) return "hinglish";
  return latin >= devanagari ? "english" : "hinglish";
};

const getLanguageInstruction = (lang) => {
  if (lang === "english") {
    return "ENGLISH ONLY. No Hindi/Hinglish words.";
  }
  if (lang === "hindi") return "Hindi Devanagari only.";
  return "Hinglish style.";
};

export const getMessageToReplyTo = (messages, userId) => {
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

  const history = recent.map((msg) => ({
    role: String(msg.sender._id) === me ? "assistant" : "user",
    content: msg.content,
  }));

  return [
    {
      role: "system",
      content: `Suggest 3 short replies for "${myName}".
${getLanguageInstruction(lang)}
Reply to: ${latestFrom} said "${latestText}"
Use words from that message. Precise, on-topic. JSON: {"replies":["a","b","c"]}`,
    },
    ...history,
    {
      role: "user",
      content: `3 ${lang} replies to: "${latestText}"`,
    },
  ];
};

export const parseGroqSuggestions = (text) => {
  if (!text) return [];
  try {
    const clean = text.replace(/```json|```/g, "").trim();
    const objMatch = clean.match(/\{[\s\S]*\}/);
    if (objMatch) {
      const obj = JSON.parse(objMatch[0]);
      const list = obj.replies || obj.suggestions;
      if (Array.isArray(list)) {
        return [...new Set(list.map((s) => String(s).trim()).filter(Boolean))].slice(
          0,
          3,
        );
      }
    }
  } catch {
    /* empty */
  }
  return [];
};

const filterEnglish = (suggestions, lang) => {
  if (lang !== "english") return suggestions;
  const filtered = suggestions.filter(
    (s) => !/[\u0900-\u097F]/.test(s) && !HINDI_ROMAN.test(s),
  );
  return filtered.length ? filtered : suggestions;
};

export const fetchGroqSuggestions = async (
  apiKey,
  messages,
  userId,
  username,
) => {
  const normalized = normalizeMessages(messages);
  if (!normalized.length) return [];

  const lang = detectChatLanguage(normalized);
  const groqMessages = buildGroqMessages(normalized, userId, username, lang);

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
        temperature: 0.55,
        top_p: 0.85,
        messages: groqMessages,
      }),
    },
  );

  if (!response.ok) throw new Error("Groq failed");

  const data = await response.json();
  let suggestions = filterEnglish(
    parseGroqSuggestions(data?.choices?.[0]?.message?.content?.trim()),
    lang,
  );

  const replyTo = getMessageToReplyTo(normalized, userId);
  const keywords = extractKeywords(replyTo?.content);

  if (keywords.length && suggestions.length >= 2) {
    const relevant = suggestions.filter((s) =>
      keywords.some((k) => s.toLowerCase().includes(k)),
    );
    if (relevant.length >= 2) return relevant.slice(0, 3);
  }

  return suggestions;
};
