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

export const buildContext = (messages) => {
  const normalized = normalizeMessages(messages);
  return normalized
    .slice(-12)
    .map((msg, i) => {
      const tag = i === normalized.length - 1 ? " [LATEST]" : "";
      return `${msg.sender.username}: ${msg.content}${tag}`;
    })
    .join("\n");
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

export const parseGroqSuggestions = (text) => {
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
    return [];
  }
};

export const fetchGroqSuggestions = async (apiKey, messages, userId) => {
  const context = buildContext(messages);
  if (!context) return [];

  const replyTo = getMessageToReplyTo(messages, userId);
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
            content: `Write 3 different short chat replies for the user.
- Match the LATEST message topic only.
- Same language as chat (Hindi/English/Hinglish).
- Max 12 words each.
- JSON array only: ["a","b","c"]`,
          },
          {
            role: "user",
            content: `Chat:\n${context}\n\nReply to LATEST from ${latestFrom}:\n"${latest}"`,
          },
        ],
      }),
    },
  );

  if (!response.ok) throw new Error("Groq failed");

  const data = await response.json();
  return parseGroqSuggestions(data?.choices?.[0]?.message?.content?.trim());
};
