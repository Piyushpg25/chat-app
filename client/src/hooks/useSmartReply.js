import { useState } from "react";
import { toast } from "sonner";
import api from "@/lib/axios";
import useAuthStore from "@/store/authStore";
import { fetchGroqSuggestions } from "@/lib/smartReply";

const useSmartReply = () => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const user = useAuthStore((s) => s.user);

  const getSuggestions = async (lastMessages) => {
    if (!lastMessages?.length) return;

    const hasText = lastMessages.some(
      (m) => m?.content && m.content.trim() !== "",
    );
    if (!hasText) {
      setSuggestions([]);
      return;
    }

    const payload = {
      messages: lastMessages,
      userId: user?.id,
    };

    try {
      setLoading(true);

      // 1) Server AI (Render GROQ_API_KEY)
      const res = await api.post("/ai/suggestions", payload);

      if (res.data.source === "ai" && res.data.suggestions?.length >= 2) {
        setSuggestions(res.data.suggestions);
        return;
      }

      // 2) Client Groq (Vercel VITE_GROQ_API_KEY) — real contextual AI
      const clientKey = import.meta.env.VITE_GROQ_API_KEY?.trim();
      if (clientKey) {
        try {
          const fromGroq = await fetchGroqSuggestions(
            clientKey,
            lastMessages,
            user?.id,
          );
          if (fromGroq.length >= 2) {
            setSuggestions(fromGroq);
            return;
          }
        } catch {
          // fall through to server local suggestions
        }
      }

      // 3) Server contextual fallback (chat-based, not generic)
      if (res.data.suggestions?.length) {
        setSuggestions(res.data.suggestions);
        return;
      }

      toast.info(
        "Real AI ke liye Render par GROQ_API_KEY add karo (console.groq.com)",
      );
      setSuggestions([]);
    } catch {
      // Network error — try client Groq only
      const clientKey = import.meta.env.VITE_GROQ_API_KEY?.trim();
      if (clientKey) {
        try {
          const fromGroq = await fetchGroqSuggestions(
            clientKey,
            lastMessages,
            user?.id,
          );
          if (fromGroq.length) {
            setSuggestions(fromGroq);
            return;
          }
        } catch {
          /* empty */
        }
      }
      toast.error("Suggestions load nahi ho paye");
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const clearSuggestions = () => setSuggestions([]);

  return { suggestions, loading, getSuggestions, clearSuggestions };
};

export default useSmartReply;
