const STOP_WORDS = new Set([
  "the", "and", "for", "that", "this", "with", "you", "are", "was", "have",
  "hai", "hain", "kya", "main", "tum", "aap", "ke", "ki", "ka", "ko", "se",
  "me", "mein", "par", "ya", "nahi", "bhi", "toh", "aur", "ek", "wo", "ye",
]);

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
      content: `You suggest 3 short WhatsApp-style replies for "${myName}".
Must directly answer: ${latestFrom} said "${latestText}"
Same language as chat. Reference words from that message. JSON only:
{"replies":["a","b","c"]}`,
    },
    ...history,
    {
      role: "user",
      content: `3 replies for ${myName} to "${latestText}". JSON only.`,
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

export const fetchGroqSuggestions = async (apiKey, messages, userId, username) => {
  const normalized = normalizeMessages(messages);
  if (!normalized.length) return [];

  const groqMessages = buildGroqMessages(normalized, userId, username);

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
        temperature: 0.7,
        top_p: 0.9,
        messages: groqMessages,
      }),
    },
  );

  if (!response.ok) throw new Error("Groq failed");

  const data = await response.json();
  const suggestions = parseGroqSuggestions(
    data?.choices?.[0]?.message?.content?.trim(),
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
