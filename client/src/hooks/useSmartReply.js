import { useState } from 'react';

const useSmartReply = () => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  const getSuggestions = async (lastMessages) => {
    if (!lastMessages || lastMessages.length === 0) return;

    try {
      setLoading(true);

      const context = lastMessages
        .slice(-5)
        .filter(m => m?.content && m.content.trim() !== '')
        .map(msg => `${msg.sender?.username || 'User'}: ${msg.content}`)
        .join('\n');

      if (!context) {
        setSuggestions([]);
        return;
      }

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          max_tokens: 150,
          temperature: 0.7,
          messages: [
            {
              role: 'user',
              content: `Chat conversation:\n${context}\n\nGive 3 short reply suggestions (max 6 words each) matching the language used.\nRespond with ONLY a JSON array, nothing else: ["reply1", "reply2", "reply3"]`
            }
          ]
        })
      });

      // Response check karo
      if (!response.ok) {
        const errData = await response.json();
        console.error('Groq error:', errData);
        setSuggestions([]);
        return;
      }

      const data = await response.json();
      console.log('Groq response:', data); // debug

      const text = data?.choices?.[0]?.message?.content?.trim();
      if (!text) {
        setSuggestions([]);
        return;
      }

      // Clean — backticks remove karo
      const clean = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);

      if (Array.isArray(parsed)) {
        setSuggestions(parsed.slice(0, 3));
      }

    } catch (err) {
      console.error('Smart reply error:', err);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const clearSuggestions = () => setSuggestions([]);

  return { suggestions, loading, getSuggestions, clearSuggestions };
};

export default useSmartReply;