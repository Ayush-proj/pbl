import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  MessageCircle, 
  X, 
  Send, 
  ArrowLeft,
  MoreVertical,
  Phone,
  Video,
  Paperclip,
  Smile
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { getMessages, sendMessage, markMessagesRead, getOrCreateConversation } from '../services/api';
import { useChat } from '../hooks/useChat';
import useAuthStore from '../store/authStore';

let socketRef = null;

export function ChatButton({ participantId, participantName, participantImage, participantRole }) {
  const [isOpen, setIsOpen] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [typing, setTyping] = useState(null);
  const messagesEndRef = useRef(null);
  const { user } = useAuthStore();
  
  const { connected, joinConversation, leaveConversation, sendTyping, markAsRead, socket } = useChat(user?._id, user?.role);

  useEffect(() => {
    socketRef = socket;
  }, [socket]);

  useEffect(() => {
    if (isOpen && participantId) {
      loadMessages();
    }
  }, [isOpen, participantId]);

  useEffect(() => {
    if (!socketRef) return;

    const handleNewMessage = (data) => {
      setMessages(prev => {
        const exists = prev.some(m => m._id === data.message._id);
        if (exists) return prev;
        return [...prev, data.message];
      });
      scrollToBottom();
    };

    const handleTyping = (data) => {
      if (data.userId !== user?._id) {
        setTyping(data.isTyping ? data.userId : null);
      }
    };

    const handleMessagesRead = () => {
      markAsRead(conversationId);
    };

    socketRef.on('chat:new-message', handleNewMessage);
    socketRef.on('chat:user-typing', handleTyping);
    socketRef.on('chat:messages-read', handleMessagesRead);

    return () => {
      socketRef?.off('chat:new-message', handleNewMessage);
      socketRef?.off('chat:user-typing', handleTyping);
      socketRef?.off('chat:messages-read', handleMessagesRead);
    };
  }, [conversationId, user?._id, markAsRead]);

  useEffect(() => {
    if (conversationId) {
      joinConversation(conversationId);
      return () => leaveConversation(conversationId);
    }
  }, [conversationId]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const res = await getOrCreateConversation(participantId);
      if (res.data?._id) {
        setConversationId(res.data._id);
        const messagesRes = await getMessages(res.data._id);
        setMessages(messagesRes.data?.reverse() || []);
        scrollToBottom();
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!inputValue.trim()) return;
    
    const tempMessage = {
      _id: `temp-${Date.now()}`,
      conversationId,
      sender: user?._id,
      senderType: user?.role,
      content: inputValue.trim(),
      createdAt: new Date().toISOString()
    };
    
    if (conversationId) {
      socketRef.current?.emit('chat:send-message', { conversationId, content: inputValue.trim() });
      setMessages(prev => [...prev, tempMessage]);
      setInputValue('');
      scrollToBottom();
    } else {
      try {
        const res = await sendMessage({
          participantId,
          content: inputValue.trim()
        });
        if (res.data?.conversationId) {
          setConversationId(res.data.conversationId);
          socketRef.current?.emit('chat:join-conversation', res.data.conversationId);
          setMessages(prev => [...prev, res.data]);
        } else {
          setMessages(prev => [...prev, tempMessage]);
        }
        setInputValue('');
        scrollToBottom();
      } catch (err) {
        console.error('Failed to send message:', err);
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    if (conversationId) {
      sendTyping(conversationId, true);
      setTimeout(() => sendTyping(conversationId, false), 2000);
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25"
      >
        <MessageCircle className="w-6 h-6" />
      </Button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className="fixed bottom-6 right-6 w-80 h-[500px] bg-background border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(false)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="relative">
            <Avatar className="w-10 h-10">
              <AvatarImage src={participantImage} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {participantName?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            {connected && (
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
            )}
          </div>
          <div>
            <p className="font-bold text-sm">{participantName || 'Chat'}</p>
            <p className="text-xs text-muted-foreground capitalize">{participantRole || 'User'}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Phone className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Video className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background/50">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <MessageCircle className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm">Start a conversation with {participantName}</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isOwn = msg.sender === user?._id || msg.sender?._id === user?._id;
            return (
              <div key={idx} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] ${isOwn ? 'order-2' : 'order-1'}`}>
                  <div className={`px-4 py-2.5 rounded-2xl ${
                    isOwn 
                      ? 'bg-primary text-primary-foreground rounded-br-md' 
                      : 'bg-muted text-foreground rounded-bl-md'
                  }`}>
                    <p className="text-sm">{msg.content}</p>
                  </div>
                  <p className={`text-[10px] text-muted-foreground mt-1 ${isOwn ? 'text-right' : 'text-left'}`}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        
        {typing && typing !== user?._id && (
          <div className="flex justify-start">
            <div className="bg-muted px-4 py-2 rounded-2xl rounded-bl-md">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border bg-card">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Paperclip className="w-4 h-4" />
          </Button>
          <Input
            value={inputValue}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 h-9"
          />
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Smile className="w-4 h-4" />
          </Button>
          <Button onClick={handleSend} size="icon" className="h-9 w-9 rounded-full">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}