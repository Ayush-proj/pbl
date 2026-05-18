import { useEffect, useRef, useCallback, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_TARGET || 'http://localhost:5002';

let socketInstance = null;

if (typeof window !== 'undefined' && !window.socket) {
  window.socket = socketInstance;
}

export function SocketProvider({ children, userId, userType }) {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!userId) return;

    if (!socketInstance) {
      socketInstance = io(SOCKET_URL, {
        query: { userId, userType },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });
      
      if (typeof window !== 'undefined') {
        window.socket = socketInstance;
      }
    }

    socketRef.current = socketInstance;

    socketInstance.on('connect', () => {
      console.log('🔌 Socket connected:', socketInstance.id);
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
    });

    return () => {
    };
  }, [userId, userType]);

  return children;
}

export function useSocket() {
  const socketRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const [isConnected, setIsConnected] = useState(false);
  const [listeners, setListeners] = useState({});

  useEffect(() => {
    if (!socketInstance) {
      socketInstance = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
      });
      
      if (typeof window !== 'undefined') {
        window.socket = socketInstance;
      }
    }

    socketRef.current = socketInstance;

    socketInstance.on('connect', () => {
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });

    return () => {
    };
  }, []);

  const joinConversation = useCallback((conversationId) => {
    if (socketRef.current) {
      socketRef.current.emit('chat:join-conversation', conversationId);
    }
  }, []);

  const leaveConversation = useCallback((conversationId) => {
    if (socketRef.current) {
      socketRef.current.emit('chat:leave-conversation', conversationId);
    }
  }, []);

  const sendMessage = useCallback((conversationId, content) => {
    if (socketRef.current) {
      socketRef.current.emit('chat:send-message', { conversationId, content });
    }
  }, []);

  const sendTyping = useCallback((conversationId, isTyping) => {
    if (socketRef.current) {
      socketRef.current.emit('chat:typing', { conversationId, isTyping });
    }
  }, []);

  const markAsRead = useCallback((conversationId) => {
    if (socketRef.current) {
      socketRef.current.emit('chat:mark-read', conversationId);
    }
  }, []);

  const onNewMessage = useCallback((callback) => {
    if (socketRef.current) {
      socketRef.current.on('chat:new-message', (data) => {
        callback(data.message);
      });
    }
  }, []);

  const onTyping = useCallback((callback) => {
    if (socketRef.current) {
      socketRef.current.on('chat:user-typing', (data) => {
        setTypingUsers(prev => ({
          ...prev,
          [data.conversationId]: data.isTyping ? data.userId : null
        }));
        callback(data);
      });
    }
  }, []);

  const onNotification = useCallback((callback) => {
    if (socketRef.current) {
      socketRef.current.on('chat:notification', callback);
    }
  }, []);

  const onMessagesRead = useCallback((callback) => {
    if (socketRef.current) {
      socketRef.current.on('chat:messages-read', callback);
    }
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    messages,
    typingUsers,
    joinConversation,
    leaveConversation,
    sendMessage,
    sendTyping,
    markAsRead,
    onNewMessage,
    onTyping,
    onNotification,
    onMessagesRead,
  };
}

export default useSocket;