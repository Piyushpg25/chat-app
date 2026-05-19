const STOP_WORDS = new Set([
  "the", "and", "for", "that", "this", "with", "you", "are", "was", "have",
  "hai", "hain", "kya", "main", "tum", "aap", "ke", "ki", "ka", "ko", "se",
  "me", "mein", "par", "ya", "nahi", "bhi", "toh", "aur", "ek", "wo", "ye",
  "will", "can", "just", "like", "what", "when", "how",
]);

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

const buildContext = (messages) => {
  const normalized = normalizeMessages(messages);
  return normalized
    .slice(-15)
    .map((msg) => `${msg.sender.username}: ${msg.content}`)
    .join("\n");
};

const buildGroqMessages = (normalized, userId, username) => {
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
      content: `You are a smart reply assistant for "${myName}" in a live group chat.

Your job: suggest 3 SHORT messages ${myName} can send NEXT.

CRITICAL:
- Read the full chat history below in order.
- Reply ONLY to the current topic — especially this latest line:
  ${latestFrom} said: "${latestText}"
- Use the SAME language style as the chat (Hindi / English / Hinglish mix).
- Each reply must mention or clearly relate to words from the latest message.
- Sound natural like WhatsApp — casual, not formal essay.
- Do NOT repeat old topics from earlier in chat if the topic changed.
- Do NOT output generic one-word replies unless the chat is only one word.
- 3 replies must be meaningfully different.

Output ONLY this JSON (no markdown):
{"replies":["reply1","reply2","reply3"]}`,
    },
    ...history,
    {
      role: "user",
      content: `Give 3 reply options for ${myName} that directly answer "${latestText}" from ${latestFrom}. JSON only.`,
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
    /* fall through */
  }
  return text
    .split("\n")
    .map((line) => line.replace(/^[\d.\-*"']+\s*/, "").trim())
    .filter((line) => line.length > 2 && line.length < 100)
    .slice(0, 3);
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
        max_tokens: 280,
        temperature,
        top_p: 0.9,
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
  const replyTo = getMessageToReplyTo(normalized, userId);
  const keywords = extractKeywords(replyTo?.content || normalized.at(-1)?.content);

  const groqMessages = buildGroqMessages(normalized, userId, username);
  let suggestions = await requestGroq(apiKey, groqMessages, 0.7);

  if (suggestions.length >= 2 && scoreRelevance(suggestions, keywords) < 0.34) {
    const retryMessages = [
      ...groqMessages.slice(0, -1),
      {
        role: "user",
        content: `WRONG — replies ignored the latest message. Latest was: "${replyTo?.content}". 
Use words from that message. JSON: {"replies":["...","...","..."]}`,
      },
    ];
    const retry = await requestGroq(apiKey, retryMessages, 0.45);
    if (retry.length >= 2 && scoreRelevance(retry, keywords) >= scoreRelevance(suggestions, keywords)) {
      suggestions = retry;
    }
  }

  return suggestions;
};

const getContextualSuggestions = (messages, userId) => {
  const normalized = normalizeMessages(messages);
  const replyTo = getMessageToReplyTo(normalized, userId);
  const text = replyTo?.content?.trim() || "";
  const speaker = replyTo?.sender?.username || "dost";

  if (!text) {
    return ["Hello! 👋", "Kya chal raha hai?", "Bol, sun raha hoon"];
  }

  const keywords = extractKeywords(text);
  const w1 = keywords[0] || "isse";
  const w2 = keywords[1] || "";
  const w3 = keywords[2] || "";

  if (text.includes("?")) {
    return [
      `Haan ${speaker}, ${w1} ${w2}`.trim(),
      `Nahi, ${w1} ke baare mein nahi`,
      `${w3 || w1} — mujhe bhi yahi puchna tha`,
    ].map((s) => s.slice(0, 72));
  }

  return [
    `Haan ${speaker}, ${w1} ${w2} sahi hai`.trim(),
    `${w1} par agree — ${w3 || "good point"}`,
    `Theek hai, ${w1} ${w2} pe baat karte hain`.trim(),
  ].map((s) => s.replace(/\s+/g, " ").slice(0, 72));
};

module.exports = {
  normalizeMessages,
  buildContext,
  getMessageToReplyTo,
  getContextualSuggestions,
  callGroq,
  parseGroqSuggestions,
  buildGroqMessages,
};
