import { useState } from "react";
import api from "@/lib/axios";

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

    try {
      setLoading(true);
      const res = await api.post("/ai/suggestions", {
        messages: lastMessages,
      });
      setSuggestions(res.data.suggestions || []);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const clearSuggestions = () => setSuggestions([]);

  return { suggestions, loading, getSuggestions, clearSuggestions };
};

export default useSmartReply;
