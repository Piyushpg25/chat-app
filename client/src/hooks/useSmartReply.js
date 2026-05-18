import { useState } from "react";
import { toast } from "sonner";
import api from "@/lib/axios";

const useSmartReply = () => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  const getSuggestions = async (lastMessages) => {
    if (!lastMessages || lastMessages.length === 0) return;

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
    } catch (err) {
      const message =
        err.response?.data?.message ||
        "Smart reply failed. Please try again later.";
      toast.error(message);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const clearSuggestions = () => setSuggestions([]);

  return { suggestions, loading, getSuggestions, clearSuggestions };
};

export default useSmartReply;
