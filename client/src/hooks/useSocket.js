import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import useAuthStore from "../store/authStore";


const useSocket = () => {
  const socketRef = useRef(null);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    const socketUrl =
      import.meta.env.VITE_SOCKET_URL || "https://chat-app-ttrq.onrender.com";
    socketRef.current = io(socketUrl);

    if (user) {
      socketRef.current.emit("user_online", user.id);
    }

    return () => {
      socketRef.current.disconnect();
    };
  }, [user]);

  return socketRef.current;
};

export default useSocket