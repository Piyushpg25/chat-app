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
      const status = err.response?.status;
      let message = err.response?.data?.message;

      if (status === 404) {
        message =
          "AI route not found. Redeploy Render + Vercel, then hard refresh (Ctrl+Shift+R).";
      } else if (status === 503) {
        message =
          "Add GROQ_API_KEY in Render dashboard → Environment, then redeploy.";
      } else if (!message) {
        message = "Smart reply failed. Please try again later.";
      }

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
