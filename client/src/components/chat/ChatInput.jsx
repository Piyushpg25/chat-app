import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Smile, X, ImagePlus, Video, FileUp, Loader2, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';
import { toast } from 'sonner';
import api from '@/lib/axios';
import useAuthStore from '@/store/authStore';
import useChatStore from '@/store/chatStore';
import useSmartReply from '@/hooks/useSmartReply';

const ChatInput = ({ socket }) => {
  const [message, setMessage]         = useState('');
  const [showEmoji, setShowEmoji]     = useState(false);
  const [uploading, setUploading]     = useState(false);
  const [uploadProgress, setProgress] = useState('');
  const typingTimeout = useRef(null);
  const imageRef      = useRef(null);
  const videoRef      = useRef(null);
  const fileRef       = useRef(null);

  const { user }        = useAuthStore();
  const { currentRoom, messages } = useChatStore();

  // ── AI Smart Reply hook ──
  const { suggestions, loading: aiLoading, getSuggestions, clearSuggestions } = useSmartReply();

  // ── Typing handler ──
  const handleTyping = (e) => {
    setMessage(e.target.value);
    socket?.emit('typing', { room: currentRoom, username: user?.username });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket?.emit('stop_typing', { room: currentRoom });
    }, 2000);
  };

  // ── Emoji ──
  const onEmojiSelect = (emoji) => {
    setMessage((prev) => prev + emoji.native);
    setShowEmoji(false);
  };

  // ── Text send ──
  const sendMessage = (text) => {
    const content = text || message;
    if (!content.trim() || !socket) return;

    socket.emit('send_message', {
      senderId:  user?.id,
      room:      currentRoom,
      content:   content.trim(),
      mediaType: 'text',
    });

    setMessage('');
    clearSuggestions();
    socket?.emit('stop_typing', { room: currentRoom });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ── AI Smart Reply trigger ──
  const handleSmartReply = () => {
    // Sirf text messages filter karo
    const textMessages = messages.filter(m => m.mediaType === 'text' && m.content);
    if (textMessages.length === 0) {
      toast.info('Pehle kuch messages hone chahiye!');
      return;
    }
    getSuggestions(textMessages);
  };

  // ── Upload ──
  const handleUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!socket) {
      toast.error('Connection nahi hai — refresh karo!');
      return;
    }

    const limits = { image: 10, video: 100, file: 25 };
    if (file.size > limits[type] * 1024 * 1024) {
      toast.error(`Max size: ${limits[type]}MB`);
      return;
    }

    try {
      setUploading(true);
      let finalFile = file;

      if (type === 'image') {
        setProgress('🖼️ Image compress ho rahi hai...');
        const imageCompression = (await import('browser-image-compression')).default;
        finalFile = await imageCompression(file, {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 800,
          useWebWorker: true,
        });
      }

      setProgress('⬆️ Upload ho rahi hai...');

      const formData = new FormData();
      formData.append('file', finalFile);

      const res = await api.post(`/upload/${type}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setProgress(`⬆️ Upload: ${percent}%`);
        },
      });

      socket.emit('send_message', {
        senderId:  user?.id,
        room:      currentRoom,
        content:   '',
        mediaUrl:  res.data.url,
        mediaType: type,
        mediaName: res.data.name,
        mediaSize: res.data.size,
      });

      toast.success(`${type} send ho gaya! 🎉`);
    } catch (err) {
      console.error('Upload error:', err);
      toast.error(`${type} upload failed!`);
    } finally {
      setUploading(false);
      setProgress('');
      e.target.value = '';
    }
  };

  return (
    <div className="border-t border-white/10 bg-black/20 backdrop-blur-xl relative">

      {/* ── AI Smart Reply Suggestions ── */}
      <AnimatePresence>
        {suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="px-4 pt-3 flex items-center gap-2 flex-wrap"
          >
            <span className="text-white/30 text-xs flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-400" />
              AI Suggestions:
            </span>
            {suggestions.map((suggestion, i) => (
              <motion.button
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                onClick={() => sendMessage(suggestion)}
                className="px-3 py-1 rounded-full text-xs bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/30 hover:text-indigo-200 transition-all"
              >
                {suggestion}
              </motion.button>
            ))}
            <button
              onClick={clearSuggestions}
              className="text-white/20 hover:text-white/40 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Upload Progress ── */}
      <AnimatePresence>
        {uploading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-4 pt-2 flex items-center gap-2 text-indigo-400 text-xs"
          >
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>{uploadProgress}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Emoji Picker ── */}
      <AnimatePresence>
        {showEmoji && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowEmoji(false)} />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-20 left-4 z-50"
            >
              <Picker data={data} onEmojiSelect={onEmojiSelect}
                theme="dark" previewPosition="none" skinTonePosition="none" />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Hidden file inputs ── */}
      <input ref={imageRef} type="file" accept="image/*"
        className="hidden" onChange={(e) => handleUpload(e, 'image')} />
      <input ref={videoRef} type="file" accept="video/*"
        className="hidden" onChange={(e) => handleUpload(e, 'video')} />
      <input ref={fileRef} type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
        className="hidden" onChange={(e) => handleUpload(e, 'file')} />

      {/* ── Main Input Row ── */}
      <div className="p-4 flex items-center gap-2">

        {/* Emoji */}
        <Button onClick={() => setShowEmoji(!showEmoji)} variant="ghost" size="icon"
          className={`rounded-xl flex-shrink-0 transition-all ${
            showEmoji ? 'text-indigo-400 bg-indigo-500/20' : 'text-white/30 hover:text-indigo-400'
          }`}>
          {showEmoji ? <X className="w-5 h-5" /> : <Smile className="w-5 h-5" />}
        </Button>

        {/* Image */}
        <Button onClick={() => imageRef.current?.click()} variant="ghost" size="icon"
          disabled={uploading}
          className="rounded-xl flex-shrink-0 text-white/30 hover:text-pink-400 hover:bg-pink-500/10">
          <ImagePlus className="w-5 h-5" />
        </Button>

        {/* Video */}
        <Button onClick={() => videoRef.current?.click()} variant="ghost" size="icon"
          disabled={uploading}
          className="rounded-xl flex-shrink-0 text-white/30 hover:text-purple-400 hover:bg-purple-500/10">
          <Video className="w-5 h-5" />
        </Button>

        {/* File */}
        <Button onClick={() => fileRef.current?.click()} variant="ghost" size="icon"
          disabled={uploading}
          className="rounded-xl flex-shrink-0 text-white/30 hover:text-yellow-400 hover:bg-yellow-500/10">
          <FileUp className="w-5 h-5" />
        </Button>

        {/* ── AI Smart Reply Button ── */}
        <Button
          onClick={handleSmartReply}
          variant="ghost"
          size="icon"
          disabled={aiLoading}
          className="rounded-xl flex-shrink-0 text-white/30 hover:text-indigo-400 hover:bg-indigo-500/10"
        >
          {aiLoading
            ? <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
            : <Sparkles className="w-5 h-5" />
          }
        </Button>

        {/* Text Input */}
        <Input
          value={message}
          onChange={handleTyping}
          onKeyDown={handleKeyDown}
          placeholder={`#${currentRoom} mein message karo...`}
          className="flex-1 bg-white/10 border-white/10 text-white placeholder:text-white/30 focus:border-indigo-500 rounded-xl"
        />

        {/* Send */}
        <Button onClick={() => sendMessage()} disabled={!message.trim()}
          className="bg-indigo-600 hover:bg-indigo-500 rounded-xl px-4 disabled:opacity-30 flex-shrink-0">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default ChatInput;