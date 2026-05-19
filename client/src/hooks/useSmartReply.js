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
      username: user?.username,
    };

    const clientKey = import.meta.env.VITE_GROQ_API_KEY?.trim();

    try {
      setLoading(true);
      setSuggestions([]);

      if (clientKey) {
        try {
          const fromClient = await fetchGroqSuggestions(
            clientKey,
            normalized,
            user?.id,
            user?.username,
          );
          if (fromClient.length >= 2) {
            setSuggestions(fromClient);
            return;
          }
        } catch {
          /* try server */
        }
      }

      const res = await api.post("/ai/suggestions", payload);

      if (res.data.suggestions?.length >= 2) {
        setSuggestions(res.data.suggestions);
        if (res.data.source === "local") {
          toast.info(
            "Smart AI ke liye Render par GROQ_API_KEY lagao (free — console.groq.com). Abhi basic suggestions chal rahe hain.",
            { duration: 5000 },
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
            user?.username,
          );
          if (fromClient.length) {
            setSuggestions(fromClient);
            return;
          }
        } catch {
          /* empty */
        }
      }
      toast.error("AI suggestions failed");
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const clearSuggestions = () => setSuggestions([]);

  return { suggestions, loading, getSuggestions, clearSuggestions };
};

export default useSmartReply;
