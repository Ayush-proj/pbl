import { useEffect, useState, createContext, useContext, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_TARGET || 'http://localhost:5000';

const SocketContext = createContext();

let socketInstance = null;
const listenersMap = new Map();

export function SocketProvider({ children, userId, userType }) {
  const [isConnected, setIsConnected] = useState(false);
  const reconnectAttemptRef = useRef(0);

  useEffect(() => {
    if (!userId) {
      if (socketInstance) {
        socketInstance.disconnect();
        socketInstance = null;
        setIsConnected(false);
      }
      return;
    }

    const connectSocket = () => {
      if (socketInstance?.connected) {
        socketInstance.disconnect();
      }

      socketInstance = io(SOCKET_URL, {
        query: {
          userId: userId,
          userType: userType || 'candidate'
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      socketInstance.on('connect', () => {
        console.log('🔌 Socket connected:', socketInstance.id);
        setIsConnected(true);
        reconnectAttemptRef.current = 0;
      });

      socketInstance.on('disconnect', (reason) => {
        console.log('🔌 Socket disconnected:', reason);
        setIsConnected(false);
      });

      socketInstance.on('connect_error', (error) => {
        console.error('Socket connection error:', error.message);
        reconnectAttemptRef.current++;
      });

      socketInstance.on('reconnect', (attemptNumber) => {
        console.log('🔌 Socket reconnected after', attemptNumber, 'attempts');
        setIsConnected(true);
      });

      socketInstance.on('reconnect_error', (error) => {
        console.error('Socket reconnect error:', error.message);
      });

      socketInstance.on('reconnect_failed', () => {
        console.error('Socket reconnect failed after max attempts');
      });

      if (typeof window !== 'undefined') {
        window.socket = socketInstance;
      }
    };

    connectSocket();

    return () => {
      if (socketInstance) {
        socketInstance.removeAllListeners();
        socketInstance.disconnect();
        socketInstance = null;
        setIsConnected(false);
      }
    };
  }, [userId, userType]);

  const getSocket = useCallback(() => socketInstance, []);

  const emit = useCallback((event, data) => {
    if (socketInstance?.connected) {
      socketInstance.emit(event, data);
    } else {
      console.warn('Socket not connected, cannot emit:', event);
    }
  }, []);

  return (
    <SocketContext.Provider value={{ 
      socket: socketInstance, 
      getSocket,
      emit,
      isConnected 
    }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
}

export function getSocketInstance() {
  return socketInstance;
}

export default useSocket;