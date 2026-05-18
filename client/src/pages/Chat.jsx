import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { io } from "socket.io-client";
import { Hash } from "lucide-react";
import { toast } from "sonner";
import Sidebar from "@/components/chat/Sidebar";
import MessageBox from "@/components/chat/MessageBox";
import ChatInput from "@/components/chat/ChatInput";
import ParticlesBackground from "@/components/three/ParticlesBackground";
import useAuthStore from "@/store/authStore";
import useChatStore from "@/store/chatStore";

const Chat = () => {
  const socketRef = useRef(null);
  const { user } = useAuthStore();
  const {
    currentRoom,
    setMessages,
    addMessage,
    setOnlineUsers,
    setTypingUser,
    deleteMessage,
    editMessage,
  } = useChatStore();

  useEffect(() => {
    if (socketRef.current) return; // Double connect rokna

    socketRef.current = io("http://localhost:5000", {
      reconnection: true,
      reconnectionAttempts: 5,
    });

    socketRef.current.emit("user_online", user?.id);

    socketRef.current.on("online_users", setOnlineUsers);

    // ✅ Message history load karo
    socketRef.current.on("message_history", (msgs) => {
      setMessages(msgs);
    });

    socketRef.current.on("receive_message", (msg) => {
      addMessage(msg);
    });

    socketRef.current.on("user_typing", (username) => {
      setTypingUser(username);
    });

    socketRef.current.on("user_stop_typing", () => {
      setTypingUser(null);
    });

    // ✅ Delete/Edit events
    socketRef.current.on("message_deleted", (messageId) => {
      deleteMessage(messageId);
    });

    socketRef.current.on("message_edited", (updatedMsg) => {
      editMessage(updatedMsg);
    });

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (socketRef.current) {
      socketRef.current.emit("join_room", currentRoom);
      toast.info(`#${currentRoom} Joined`, { duration: 1500 });
    }
  }, [currentRoom]);

  return (
    <div className="h-screen bg-black flex overflow-hidden">
      <ParticlesBackground />

      <Sidebar />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex-1 flex flex-col relative z-10"
      >
        <div className="px-6 py-4 border-b border-white/10 bg-black/20 backdrop-blur-xl flex items-center gap-3">
          <Hash className="w-5 h-5 text-indigo-400" />
          <h2 className="text-white font-semibold">{currentRoom}</h2>
          <span className="text-white/30 text-sm">— {currentRoom} room</span>
        </div>

        {/* ✅ Socket pass kiya MessageBox ko */}
        <MessageBox socket={socketRef.current} />

        <ChatInput socket={socketRef.current} />
      </motion.div>
    </div>
  );
};

export default Chat;