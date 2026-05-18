export const buildContext = (messages) =>
  messages
    .slice(-8)
    .filter((m) => m?.content?.trim())
    .map((msg) => {
      const name = msg.sender?.username || "User";
      return `${name}: ${msg.content.trim()}`;
    })
    .join("\n");

export const getMessageToReplyTo = (messages, userId) => {
  const withText = messages.filter((m) => m?.content?.trim());
  if (!withText.length) return null;

  if (userId) {
    const fromOthers = withText.filter((m) => {
      const senderId = m.sender?._id || m.sender;
      return String(senderId) !== String(userId);
    });
    if (fromOthers.length) return fromOthers.at(-1);
  }

  return withText.at(-1);
};

export const parseGroqSuggestions = (text) => {
  if (!text) return [];
  try {
    const clean = text.replace(/```json|```/g, "").trim();
    const match = clean.match(/\[[\s\S]*\]/);
    const parsed = JSON.parse(match ? match[0] : clean);
    return Array.isArray(parsed) ? parsed.slice(0, 3).map(String) : [];
  } catch {
    return [];
  }
};

export const fetchGroqSuggestions = async (apiKey, messages, userId) => {
  const context = buildContext(messages);
  if (!context) return [];

  const replyTo = getMessageToReplyTo(messages, userId);
  const focus = replyTo
    ? `Reply to ${replyTo.sender?.username || "them"}: "${replyTo.content.trim()}"`
    : "Suggest next message";

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
        max_tokens: 200,
        temperature: 0.8,
        messages: [
          {
            role: "system",
            content:
              "Suggest 3 short chat replies in the SAME language as the chat (Hindi/English/Hinglish). Must match the conversation topic. Max 10 words each. JSON array only.",
          },
          {
            role: "user",
            content: `Chat:\n${context}\n\n${focus}\n\n["reply1","reply2","reply3"]`,
          },
        ],
      }),
    },
  );

  if (!response.ok) throw new Error("Groq failed");

  const data = await response.json();
  return parseGroqSuggestions(data?.choices?.[0]?.message?.content?.trim());
};
