import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Pencil, Check, X } from "lucide-react";
import useAuthStore from "@/store/authStore";
import useChatStore from "@/store/chatStore";

const MessageBox = ({ socket }) => {
  const { messages, typingUser, currentRoom } = useChatStore();
  const { user } = useAuthStore();
  const bottomRef = useRef(null);
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState("");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleDelete = (messageId) => {
    socket?.emit("delete_message", {
      messageId,
      room: currentRoom,
      userId: user?.id,
    });
  };

  const handleEditStart = (msg) => {
    setEditingId(msg._id);
    setEditContent(msg.content);
  };

  const handleEditSave = (messageId) => {
    if (!editContent.trim()) return;
    socket?.emit("edit_message", {
      messageId,
      content: editContent.trim(),
      room: currentRoom,
      userId: user?.id,
    });
    setEditingId(null);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4">
      <AnimatePresence initial={false}>
        {messages
          .filter((msg) => msg !== null && msg !== undefined)
          .map((msg, i) => {
            const senderId = msg.sender?._id || msg.sender;
            const isMe = senderId === user?.id;
            const isEditing = editingId === msg._id;

            return (
              <motion.div
                key={msg._id || i}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className={`flex group ${isMe ? "justify-end" : "justify-start"}`}
              >
                <div className={`max-w-xs lg:max-w-md flex flex-col gap-1 ${isMe ? "items-end" : "items-start"}`}>

                  {/* Sender name — sirf doosron ka */}
                  {!isMe && (
                    <span className="text-white/30 text-xs px-1">
                      {msg.sender?.username || "Unknown"}
                    </span>
                  )}

                  <div className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}>

                    {/* ── Message Bubble ── */}
                    <div className={`px-4 py-2.5 rounded-2xl text-sm max-w-full ${
                      isMe
                        ? "bg-indigo-600 text-white rounded-br-sm"
                        : "bg-white/10 text-white/90 rounded-bl-sm backdrop-blur-sm border border-white/10"
                    }`}>

                      {/* ── Media type ke hisaab se render ── */}
                      {msg.mediaType === "image" && msg.mediaUrl ? (
                        // IMAGE
                        <img
                          src={msg.mediaUrl}
                          alt="image"
                          className="max-w-[250px] max-h-[300px] rounded-xl cursor-pointer object-cover hover:opacity-90 transition-opacity"
                          onClick={() => window.open(msg.mediaUrl, "_blank")}
                        />
                      ) : msg.mediaType === "video" && msg.mediaUrl ? (
                        // VIDEO
                        <video
                          src={msg.mediaUrl}
                          controls
                          className="max-w-[280px] rounded-xl"
                        />
                      ) : msg.mediaType === "file" && msg.mediaUrl ? (
                        // FILE
                        <a
                          href={msg.mediaUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 text-indigo-300 hover:text-indigo-200 underline text-sm"
                        >
                          📎 {msg.mediaName || "File download karo"}
                          {msg.mediaSize && (
                            <span className="text-white/30 text-xs no-underline">
                              ({(msg.mediaSize / (1024 * 1024)).toFixed(1)} MB)
                            </span>
                          )}
                        </a>
                      ) : isEditing ? (
                        // EDIT MODE
                        <div className="flex items-center gap-2">
                          <input
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleEditSave(msg._id);
                              if (e.key === "Escape") setEditingId(null);
                            }}
                            className="bg-white/10 rounded-lg px-2 py-1 text-white text-sm outline-none border border-indigo-400 min-w-[120px]"
                            autoFocus
                          />
                          <button onClick={() => handleEditSave(msg._id)}>
                            <Check className="w-4 h-4 text-green-400 hover:text-green-300" />
                          </button>
                          <button onClick={() => setEditingId(null)}>
                            <X className="w-4 h-4 text-red-400 hover:text-red-300" />
                          </button>
                        </div>
                      ) : (
                        // NORMAL TEXT
                        <span className="break-words whitespace-pre-wrap">
                          {msg.content}
                        </span>
                      )}

                      {/* Edited tag */}
                      {msg.edited && !isEditing && msg.mediaType === "text" && (
                        <span className="text-white/30 text-xs ml-2">(edited)</span>
                      )}
                    </div>

                    {/* ── Edit/Delete buttons — hover pe dikhte hain ── */}
                    {isMe && !isEditing && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity mb-1">
                        {/* Edit — sirf text messages pe */}
                        {msg.mediaType === "text" && (
                          <button
                            onClick={() => handleEditStart(msg)}
                            className="p-1 rounded-lg hover:bg-white/10 text-white/30 hover:text-indigo-400 transition-all"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {/* Delete — sab messages pe */}
                        <button
                          onClick={() => handleDelete(msg._id)}
                          className="p-1 rounded-lg hover:bg-white/10 text-white/30 hover:text-red-400 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Timestamp */}
                  <span className="text-white/20 text-xs px-1">
                    {new Date(msg.createdAt).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </motion.div>
            );
          })}
      </AnimatePresence>

      {/* ── Typing Indicator ── */}
      <><AnimatePresence>
    {typingUser && (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="flex items-center gap-2"
      >
        <div className="bg-white/10 rounded-2xl px-4 py-2.5 flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
              className="w-1.5 h-1.5 bg-white/40 rounded-full" />
          ))}
        </div>
        <span className="text-white/30 text-xs">{typingUser} typing...</span>
      </motion.div>
    )}
  </AnimatePresence><div ref={bottomRef} /></>
    </div>
  );
};

export default MessageBox;