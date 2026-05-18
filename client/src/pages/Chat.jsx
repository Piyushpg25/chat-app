import { useEffect, useState } from "react";
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

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || "https://chat-app-ttrq.onrender.com";

const Chat = () => {
  const [socket, setSocket] = useState(null);
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
    const s = io(SOCKET_URL, {
      transports: ["polling", "websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
    });

    s.on("online_users", setOnlineUsers);
    s.on("message_history", setMessages);
    s.on("receive_message", addMessage);
    s.on("user_typing", setTypingUser);
    s.on("user_stop_typing", () => setTypingUser(null));
    s.on("message_deleted", deleteMessage);
    s.on("message_edited", editMessage);

    setSocket(s);

    return () => {
      s.disconnect();
      setSocket(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (socket && user?.id) {
      socket.emit("user_online", user.id);
    }
  }, [socket, user?.id]);

  useEffect(() => {
    if (socket && currentRoom) {
      socket.emit("join_room", currentRoom);
      toast.info(`#${currentRoom} Joined`, { duration: 1500 });
    }
  }, [socket, currentRoom]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="h-screen bg-black flex overflow-hidden"
    >
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

        <MessageBox socket={socket} />
        <ChatInput socket={socket} />
      </motion.div>
    </motion.div>
  );
};

export default Chat;
