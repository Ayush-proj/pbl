import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  MessageCircle, 
  Search,
  Phone,
  MoreVertical,
  Circle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { getConversations, getUnreadCount, markMessagesRead } from '../services/api';
import { useChat } from '../hooks/useChat';
import useAuthStore from '../store/authStore';

let socketRef = null;

export function ChatList({ onSelectConversation, onClose }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuthStore();
  const { connected, newMessage, socket } = useChat(user?._id, user?.role);

  useEffect(() => {
    socketRef = socket;
  }, [socket]);

  useEffect(() => {
    loadConversations();
    loadUnreadCount();
  }, []);

  useEffect(() => {
    if (!socketRef) return;

    const handleNewMessage = (message) => {
      setConversations(prev => {
        const exists = prev.find(c => c._id === message.conversationId);
        if (exists) {
          return prev.map(c => c._id === message.conversationId 
            ? { ...c, lastMessage: message, lastMessageAt: new Date() }
            : c
          ).sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
        }
        return prev;
      });
    };

    const handleNotification = (data) => {
      loadUnreadCount();
      loadConversations();
    };

    socketRef.on('chat:new-message', handleNewMessage);
    socketRef.on('chat:notification', handleNotification);

    return () => {
      socketRef?.off('chat:new-message', handleNewMessage);
      socketRef?.off('chat:notification', handleNotification);
    };
  }, []);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const res = await getConversations();
      setConversations(res.data || []);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const res = await getUnreadCount();
      setUnreadCount(res.data?.unreadCount || 0);
    } catch (err) {
      console.error('Failed to load unread count:', err);
    }
  };

  const handleSelect = async (conversation) => {
    const otherUser = conversation.participants.find(p => p._id !== user?._id);
    await markMessagesRead(conversation._id);
    onSelectConversation?.({ conversationId: conversation._id, otherUser });
  };

  const filteredConversations = conversations.filter(c => {
    const otherUser = c.participants?.find(p => p._id !== user?._id);
    return otherUser?.name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getOtherUser = (participants) => {
    return participants?.find(p => p._id !== user?._id);
  };

  const isUnread = (conversation) => {
    const lastMsg = conversation.lastMessage;
    if (!lastMsg) return false;
    const isFromOther = lastMsg.sender !== user?._id;
    const notRead = !lastMsg.readBy?.includes(user?._id);
    return isFromOther && notRead;
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black">Messages</h2>
            {unreadCount > 0 && (
              <Badge className="bg-primary text-primary-foreground">{unreadCount}</Badge>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <MoreVertical className="w-5 h-5" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <MessageCircle className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm">No conversations yet</p>
            <p className="text-muted-foreground text-xs mt-1">Start a chat from a booking</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {filteredConversations.map((conversation) => {
              const otherUser = getOtherUser(conversation.participants);
              const unread = isUnread(conversation);
              
              return (
                <motion.button
                  key={conversation._id}
                  onClick={() => handleSelect(conversation)}
                  className="w-full p-3 rounded-xl hover:bg-accent transition-colors text-left flex items-center gap-3"
                >
                  <div className="relative flex-shrink-0">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={otherUser?.profileImage} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {otherUser?.name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    {connected && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`font-bold text-sm truncate ${unread ? 'text-foreground' : 'text-foreground'}`}>
                        {otherUser?.name || 'Unknown'}
                      </p>
                      {conversation.lastMessageAt && (
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {new Date(conversation.lastMessageAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {unread && <Circle className="w-2 h-2 fill-primary text-primary" />}
                      <p className={`text-sm truncate ${unread ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                        {conversation.lastMessage?.content || 'Start a conversation'}
                      </p>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}