const buildContext = (messages) =>
  messages
    .slice(-8)
    .filter((m) => m?.content && m.content.trim() !== "")
    .map((msg) => {
      const name = msg.sender?.username || "User";
      return `${name}: ${msg.content.trim()}`;
    })
    .join("\n");

const getMessageToReplyTo = (messages, userId) => {
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

const getContextualSuggestions = (messages, userId) => {
  const target = getMessageToReplyTo(messages, userId);
  const text = (target?.content || "").trim();
  const speaker = target?.sender?.username || "dost";
  const lower = text.toLowerCase();

  if (!text) {
    return ["Hello! 👋", "Kya chal raha hai?", "Bol, sun raha hoon"];
  }

  if (/^(hi|hello|hey|namaste|yo)\b/.test(lower)) {
    return [`Hey ${speaker}! 👋`, "Namaste!", "Kaise ho?"];
  }
  if (/kaise ho|kya haal|kaisa hai|how are you/.test(lower)) {
    return ["Main badhiya hoon! 😊", "Sab theek hai, tum batao", "Achha chal raha hai"];
  }
  if (/kal |aaj |kab |time|kitne baje/.test(lower)) {
    return ["Haan, time theek hai", "Mujhe bata dena kab", "Okay, fix karte hain"];
  }
  if (/game|khel|play|match/.test(lower)) {
    return ["Chalo khelte hain! 🎮", "Haan, main ready hoon", "Kab start karein?"];
  }
  if (/code|bug|error|project|app/.test(lower)) {
    return ["Dekhta hoon, bhej details", "Haan, fix ho jayega", "Achha point hai"];
  }
  if (/\?/.test(text)) {
    const topic = text.replace(/\?/g, "").split(" ").slice(-4).join(" ") || "ye";
    return [`Haan, ${topic} possible hai`, "Nahi, shayad nahi", `Achha sawal — ${topic}`];
  }
  if (/thank|dhanyav|shukriya|thanks/.test(lower)) {
    return ["Welcome! 😊", "Koi baat nahi", "Khushi hui help karke"];
  }
  if (/sorry|maaf|pardon/.test(lower)) {
    return ["Koi baat nahi yaar", "It's okay 👍", "Chalo, aage badhte hain"];
  }

  const short = text.length > 40 ? `${text.slice(0, 40)}...` : text;
  return [
    `Haan ${speaker}, ${short} — agree`,
    `Interesting, ${speaker}!`,
    `Theek hai, samajh gaya 👍`,
  ];
};

const parseGroqSuggestions = (text) => {
  if (!text) return [];
  try {
    const clean = text.replace(/```json|```/g, "").trim();
    const match = clean.match(/\[[\s\S]*\]/);
    const parsed = JSON.parse(match ? match[0] : clean);
    return Array.isArray(parsed) ? parsed.slice(0, 3).map(String) : [];
  } catch {
    return text
      .split("\n")
      .map((line) => line.replace(/^[\d.\-*"']+\s*/, "").trim())
      .filter((line) => line.length > 0 && line.length < 80)
      .slice(0, 3);
  }
};

const callGroq = async (apiKey, context, replyTo) => {
  const focus = replyTo
    ? `The user needs to reply to this last message from ${replyTo.sender?.username || "someone"}: "${replyTo.content.trim()}"`
    : "Suggest what the user should say next";

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
              "You suggest short chat replies. Use the SAME language as the conversation (Hindi, English, or Hinglish). Each reply max 10 words. Must relate to what was just discussed. Output ONLY a JSON array of 3 strings.",
          },
          {
            role: "user",
            content: `Conversation:\n${context}\n\n${focus}\n\nJSON array only:`,
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
  buildContext,
  getMessageToReplyTo,
  getContextualSuggestions,
  callGroq,
  parseGroqSuggestions,
};
