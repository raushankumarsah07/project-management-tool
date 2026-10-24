import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext.jsx';

const SocketContext = createContext(null);
export const useSocket = () => useContext(SocketContext);

// One WebSocket connection for the whole app while logged in
export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!user) return;
    const s = io({ auth: { token: localStorage.getItem('token') } });
    setSocket(s);
    return () => {
      s.disconnect();
      setSocket(null);
    };
  }, [user?._id]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}
