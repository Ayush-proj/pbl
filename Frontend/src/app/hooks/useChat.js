import { useEffect, useRef, useCallback, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || '';

export function useChat(userId, userType) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(null);
  const [newMessage, setNewMessage] = useState(null);

  useEffect(() => {
    if (!userId) return;

    const token = localStorage.getItem('guruconnect-token');
    
    socketRef.current = io(SOCKET_URL, {
      auth: { token },
      query: { userId, userType },
      transports: ['websocket', 'polling']
    });

    socketRef.current.on('connect', () => {
      console.log('Chat socket connected');
      setConnected(true);
    });

    socketRef.current.on('disconnect', () => {
      console.log('Chat socket disconnected');
      setConnected(false);
    });

    socketRef.current.on('chat:new-message', (data) => {
      setNewMessage(data.message);
      setMessages(prev => [...prev, data.message]);
    });

    socketRef.current.on('chat:user-typing', (data) => {
      setTyping(data);
    });

    socketRef.current.on('chat:messages-read', (data) => {
      setMessages(prev => prev.map(m => ({
        ...m,
        readBy: [...(m.readBy || []), data.userId]
      })));
    });

    socketRef.current.on('chat:notification', (data) => {
      setNewMessage({ conversationId: data.conversationId, ...data });
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [userId, userType]);

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

  const addMessage = useCallback((message) => {
    setMessages(prev => [...prev, message]);
  }, []);

  const clearNewMessage = useCallback(() => {
    setNewMessage(null);
  }, []);

  return {
    connected,
    messages,
    newMessage,
    typing,
    joinConversation,
    leaveConversation,
    sendTyping,
    markAsRead,
    addMessage,
    clearNewMessage
  };
}