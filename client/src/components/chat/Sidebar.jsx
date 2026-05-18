import { motion } from "framer-motion";
import { Hash, LogOut, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import useAuthStore from "@/store/authStore";
import useChatStore from "@/store/chatStore";
import { useNavigate } from "react-router-dom";

const rooms = ["general", "tech", "gaming", "music", "random"];

const SideBar = () => {
  const { user, logout } = useAuthStore();
  const { currentRoom, setRoom, onlineUsers } = useChatStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <motion.div
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="w-64 h-screen bg-black/40 backdrop-blur-xl border-r border-white/10 flex flex-col"
    >
      {/* Logo */}
      <div className="p-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-500/20 border border-indigo-500/30">
            <MessageSquare className="w-5 h-5 text-indigo-400" />
          </div>
          <span className="text-white font-bold text-lg">ChatApp</span>
        </div>
      </div>

      {/* Rooms */}
      <div className="flex-1 overflow-y-auto p-4">
        <p className="text-white/30 text-xs uppercase tracking-widest mb-3 px-2">
          Rooms
        </p>
        <div className="space-y-1">
          {rooms.map((room, i) => (
            <motion.button
              key={room}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => setRoom(room)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                currentRoom === room
                  ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                  : "text-white/50 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Hash className="w-4 h-4" />
              <span>{room}</span>
              {currentRoom === room && (
                <motion.div
                  layoutId="activeRoom"
                  className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400"
                />
              )}
            </motion.button>
          ))}
        </div>

        {/* Online users */}
        <p className="text-white/30 text-xs uppercase tracking-widest mb-3 px-2 mt-6">
          Online - {onlineUsers.length}
        </p>
        <div className="space-y-1">
          {onlineUsers.map((userId) => (
            <div key={userId} className="flex items-center gap-2 px-3 py-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-white/50 text-sm truncate">{userId}</span>
            </div>
          ))}
        </div>
      </div>

      {/* User Info */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-500/30 border border-indigo-500/50 flex items-center justify-center">
              <span className="text-indigo-300 text-sm font-bold">
                {user?.username?.[0]?.toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-white text-sm font-medium">{user?.username}</p>
              <p className="text-white/30 text-xs">Online</p>
            </div>
          </div>
          <Button
            onClick={handleLogout}
            variant="ghost"
            size="icon"
            className="text-white/30 hover:text-red-400 hover:bg-red-400/10"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default SideBar;
