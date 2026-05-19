import { useState } from "react";
import { toast } from "sonner";
import api from "@/lib/axios";
import useAuthStore from "@/store/authStore";
import {
  fetchGroqSuggestions,
  normalizeMessages,
} from "@/lib/smartReply";

const useSmartReply = () => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const user = useAuthStore((s) => s.user);

  const getSuggestions = async (lastMessages) => {
    if (!lastMessages?.length) return;

    const normalized = normalizeMessages(lastMessages);
    if (!normalized.length) {
      setSuggestions([]);
      return;
    }

    const payload = {
      messages: normalized,
      userId: user?.id,
    };

    const clientKey = import.meta.env.VITE_GROQ_API_KEY?.trim();

    try {
      setLoading(true);
      setSuggestions([]);

      // 1) Client Groq first (fastest if Vercel key set)
      if (clientKey) {
        try {
          const fromClient = await fetchGroqSuggestions(
            clientKey,
            normalized,
            user?.id,
          );
          if (fromClient.length >= 2) {
            setSuggestions(fromClient);
            return;
          }
        } catch {
          /* try server */
        }
      }

      // 2) Server Groq (Render GROQ_API_KEY)
      const res = await api.post("/ai/suggestions", payload);

      if (res.data.source === "ai" && res.data.suggestions?.length >= 2) {
        setSuggestions(res.data.suggestions);
        return;
      }

      // 3) Server word-based fallback (changes with each message)
      if (res.data.suggestions?.length) {
        setSuggestions(res.data.suggestions);
        if (res.data.source === "local") {
          toast.info(
            "Better AI: Render par GROQ_API_KEY add karo (free — console.groq.com)",
            { duration: 4000 },
          );
        }
        return;
      }

      toast.error("Suggestions generate nahi ho paye");
    } catch {
      if (clientKey) {
        try {
          const fromClient = await fetchGroqSuggestions(
            clientKey,
            normalized,
            user?.id,
          );
          if (fromClient.length) {
            setSuggestions(fromClient);
            return;
          }
        } catch {
          /* empty */
        }
      }
      toast.error("AI suggestions failed — check internet");
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const clearSuggestions = () => setSuggestions([]);

  return { suggestions, loading, getSuggestions, clearSuggestions };
};

export default useSmartReply;
