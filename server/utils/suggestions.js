const STOP_WORDS = new Set([
  "the", "and", "for", "that", "this", "with", "you", "are", "was", "have",
  "hai", "hain", "kya", "main", "tum", "aap", "ke", "ki", "ka", "ko", "se",
  "me", "mein", "par", "ya", "nahi", "bhi", "toh", "aur", "ek", "wo", "ye",
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

const buildContext = (messages) => {
  const normalized = normalizeMessages(messages);
  return normalized
    .slice(-12)
    .map((msg, i) => {
      const tag = i === normalized.length - 1 ? " [LATEST]" : "";
      return `${msg.sender.username}: ${msg.content}${tag}`;
    })
    .join("\n");
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

const getContextualSuggestions = (messages, userId) => {
  const replyTo = getMessageToReplyTo(messages, userId);
  const text = replyTo?.content?.trim() || "";
  const speaker = replyTo?.sender?.username || "dost";

  if (!text) {
    return ["Hello! 👋", "Kya chal raha hai?", "Bol, sun raha hoon"];
  }

  const words = text
    .replace(/[^\w\s\u0900-\u097F]/gi, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w.toLowerCase()));

  const unique = [...new Set(words.map((w) => w.toLowerCase()))];
  const w1 = unique[0] || "isse";
  const w2 = unique[1] || "";
  const w3 = unique[2] || "";
  const snippet =
    text.length > 36 ? `${text.slice(0, 36).trim()}…` : text;

  if (text.includes("?")) {
    return [
      `Haan, ${w1} ${w2}`.trim(),
      `Nahi, ${w1} shayad nahi`,
      `${speaker}, ${snippet} — sochta hoon`,
    ];
  }

  const variants = [
    [
      `Sahi baat hai — ${w1} ${w2}`.trim(),
      `${speaker}, ${w1} par agree 👍`,
      `Haan, ${snippet} theek lagta hai`,
    ],
    [
      `${w1} ${w2} — interesting!`.trim(),
      `Achha point ${speaker}, ${w1}`,
      `Theek hai, ${w3 || w1} pe baat karte hain`,
    ],
    [
      `Bilkul, ${w1} sahi hai`,
      `${speaker} ne ${w1} bola — haan`,
      `Samajh gaya: ${snippet}`,
    ],
  ];

  const pick = (text.length + unique.join("").length) % variants.length;
  return variants[pick].map((s) => s.replace(/\s+/g, " ").trim().slice(0, 72));
};

const parseGroqSuggestions = (text) => {
  if (!text) return [];
  try {
    const clean = text.replace(/```json|```/g, "").trim();
    const match = clean.match(/\[[\s\S]*\]/);
    const parsed = JSON.parse(match ? match[0] : clean);
    return Array.isArray(parsed)
      ? [...new Set(parsed.map((s) => String(s).trim()).filter(Boolean))].slice(
          0,
          3,
        )
      : [];
  } catch {
    return text
      .split("\n")
      .map((line) => line.replace(/^[\d.\-*"']+\s*/, "").trim())
      .filter((line) => line.length > 0 && line.length < 80)
      .slice(0, 3);
  }
};

const callGroq = async (apiKey, context, replyTo) => {
  const latest = replyTo?.content?.trim() || "";
  const latestFrom = replyTo?.sender?.username || "someone";

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
        max_tokens: 220,
        temperature: 0.95,
        messages: [
          {
            role: "system",
            content: `You write 3 different short chat reply options for the user.
Rules:
- Read the FULL conversation below.
- Reply must match the LATEST topic (last message), not an old topic.
- Use the same language as the chat (Hindi / English / Hinglish).
- Max 12 words per reply.
- 3 replies must be DIFFERENT from each other.
- Output ONLY JSON array: ["reply1","reply2","reply3"]`,
          },
          {
            role: "user",
            content: `Conversation:\n${context}\n\nLATEST message to respond to (from ${latestFrom}):\n"${latest}"\n\nGive 3 fresh replies to THIS latest message only.`,
          },
        ],
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Groq error ${response.status}`);
  }

  const data = await response.json();
  return parseGroqSuggestions(data?.choices?.[0]?.message?.content?.trim());
};

module.exports = {
  normalizeMessages,
  buildContext,
  getMessageToReplyTo,
  getContextualSuggestions,
  callGroq,
  parseGroqSuggestions,
};
