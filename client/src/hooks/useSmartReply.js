import { useState } from "react";
import { toast } from "sonner";
import api from "@/lib/axios";

const buildContext = (lastMessages) =>
  lastMessages
    .slice(-5)
    .filter((m) => m?.content && m.content.trim() !== "")
    .map((msg) => `${msg.sender?.username || "User"}: ${msg.content}`)
    .join("\n");

const parseSuggestions = (text) => {
  if (!text) return [];
  const clean = text.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(clean);
  return Array.isArray(parsed) ? parsed.slice(0, 3) : [];
};

const getLocalSuggestions = (lastMessages) => {
  const last =
    lastMessages.filter((m) => m?.content?.trim()).at(-1)?.content?.toLowerCase() ||
    "";

  if (/hello|hi|hey|namaste|kaise/.test(last)) {
    return ["Namaste! 👋", "Hello!", "Main theek hoon, tum batao"];
  }
  if (/\?/.test(last)) {
    return ["Haan", "Nahi", "Shayad"];
  }
  if (/thank|dhanyav|shukriya/.test(last)) {
    return ["Welcome!", "Koi baat nahi 😊", "Khushi hui"];
  }
  return ["Okay 👍", "Theek hai", "Samajh gaya"];
};

const fetchGroqClient = async (context, apiKey) => {
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
        max_tokens: 150,
        temperature: 0.7,
        messages: [
          {
            role: "user",
            content: `Chat conversation:\n${context}\n\nGive 3 short reply suggestions (max 6 words each) matching the language used.\nRespond with ONLY a JSON array, nothing else: ["reply1", "reply2", "reply3"]`,
          },
        ],
      }),
    },
  );

  if (!response.ok) {
    throw new Error("Groq request failed");
  }

  const data = await response.json();
  return parseSuggestions(data?.choices?.[0]?.message?.content?.trim());
};

const useSmartReply = () => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  const getSuggestions = async (lastMessages) => {
    if (!lastMessages?.length) return;

    const hasText = lastMessages.some(
      (m) => m?.content && m.content.trim() !== "",
    );
    if (!hasText) {
      setSuggestions([]);
      return;
    }

    const context = buildContext(lastMessages);
    if (!context) {
      setSuggestions([]);
      return;
    }

    try {
      setLoading(true);

      // 1) Server proxy (needs GROQ_API_KEY on Render)
      try {
        const res = await api.post("/ai/suggestions", { messages: lastMessages });
        if (res.data?.suggestions?.length) {
          setSuggestions(res.data.suggestions);
          return;
        }
      } catch (serverErr) {
        const status = serverErr.response?.status;
        if (status && status !== 503 && status !== 502 && status !== 404) {
          throw serverErr;
        }
      }

      // 2) Client Groq key (Vercel: VITE_GROQ_API_KEY)
      const clientKey = import.meta.env.VITE_GROQ_API_KEY?.trim();
      if (clientKey) {
        const fromClient = await fetchGroqClient(context, clientKey);
        if (fromClient.length) {
          setSuggestions(fromClient);
          return;
        }
      }

      // 3) Offline fallback — button still works
      setSuggestions(getLocalSuggestions(lastMessages));
      toast.info("AI key missing — quick replies dikha rahe hain");
    } catch (err) {
      setSuggestions(getLocalSuggestions(lastMessages));
      toast.error(
        err.response?.data?.message || "Using quick replies instead",
      );
    } finally {
      setLoading(false);
    }
  };

  const clearSuggestions = () => setSuggestions([]);

  return { suggestions, loading, getSuggestions, clearSuggestions };
};

export default useSmartReply;
