import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { 
  MessageCircle, 
  Search,
  Send,
  ArrowLeft,
  MoreVertical,
  Phone,
  Video,
  X,
  Loader2,
  Circle,
  UserPlus,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { searchMentors, getMyBookings } from '../services/api';
import useAuthStore from '../store/authStore';
import useChatStore from '../store/chatStore';

export function MessagesPage({ onBack }) {
  const { user } = useAuthStore();
  const { 
    conversations, 
    activeConversation, 
    messages, 
    loading, 
    messagesLoading,
    loadConversations, 
    selectConversation,
    setMessages,
    updateConversationLastMessage,
    clearActiveConversation
  } = useChatStore();

  const [inputValue, setInputValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sending, setSending] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const messagesEndRef = useRef(null);
  const [socketReady, setSocketReady] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (!window.socket) {
      const checkSocket = setInterval(() => {
        if (window.socket) {
          socketRef.current = window.socket;
          setSocketReady(true);
          clearInterval(checkSocket);
        }
      }, 500);
      return () => clearInterval(checkSocket);
    } else {
      socketRef.current = window.socket;
      setSocketReady(true);
    }
  }, []);

  useEffect(() => {
    if (!socketReady || !socketRef.current) return;

    const handleNewMessage = (data) => {
      const { message } = data;
      
      if (activeConversation?._id === message.conversationId) {
        setMessages([...messages, message]);
        scrollToBottom();
      }
      
      loadConversations();
    };

    socketRef.current.on('chat:new-message', handleNewMessage);

    return () => {
      socketRef.current?.off('chat:new-message', handleNewMessage);
    };
  }, [activeConversation, messages, socketReady, loadConversations, setMessages]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSend = async () => {
    if (!inputValue.trim() || sending || !activeConversation) return;

    setSending(true);
    const tempMessage = {
      _id: `temp-${Date.now()}`,
      sender: user?._id,
      content: inputValue.trim(),
      createdAt: new Date().toISOString()
    };
    
    setMessages([...messages, tempMessage]);
    setInputValue('');
    scrollToBottom();

    try {
      socketRef.current?.emit('chat:send-message', {
        conversationId: activeConversation._id,
        content: inputValue.trim()
      });
    } catch (err) {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const loadAvailableUsers = async () => {
    try {
      setUsersLoading(true);
      
      if (user?.role === 'candidate') {
        const res = await searchMentors({ skill: userSearchQuery, radius: 500000 });
        setAvailableUsers(res.data.mentors || []);
      } else {
        const res = await getMyBookings();
        const studentsMap = {};
        res.data.bookings?.forEach(b => {
          const studentId = b.candidateId?._id;
          if (studentId && !studentsMap[studentId]) {
            studentsMap[studentId] = {
              _id: studentId,
              name: b.candidateId?.userId?.name || b.candidateId?.name || 'Student',
              profileImage: b.candidateId?.profileImage || b.candidateId?.userId?.profileImage || '',
              role: 'candidate'
            };
          }
        });
        setAvailableUsers(Object.values(studentsMap));
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setUsersLoading(false);
    }
  };

  const startNewChat = async (selectedUser) => {
    try {
      const conversation = await useChatStore.getState().startNewChat(selectedUser._id);
      setShowNewChat(false);
    } catch (err) {
      toast.error('Failed to start chat');
    }
  };

  const closeConversation = () => {
    if (activeConversation) {
      socketRef.current?.emit('chat:leave-conversation', activeConversation._id);
    }
    clearActiveConversation();
  };

  const getOtherUser = (conversation) => {
    return conversation.participants?.find(p => p._id !== user?._id);
  };

  const isUnread = (conversation) => {
    return conversation.unreadCount > 0;
  };

  const formatTime = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    
    if (diff < 86400000 && d.getDate() === now.getDate()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const filteredConversations = conversations.filter(c => {
    const otherUser = getOtherUser(c);
    return otherUser?.name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const filteredUsers = availableUsers.filter(u => 
    u.name?.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-120px)] flex bg-card rounded-2xl border border-border overflow-hidden">
      {/* Conversations List */}
      <div className={`w-full md:w-80 lg:w-96 flex-shrink-0 flex flex-col bg-background border-r border-border ${activeConversation ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={onBack}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold">Messages</h2>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => { setShowNewChat(true); loadAvailableUsers(); }}>
              <UserPlus className="w-5 h-5" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center p-4">
              <MessageCircle className="w-10 h-10 text-muted-foreground/30 mb-2" />
              <p className="text-muted-foreground text-sm">No conversations yet</p>
              <Button variant="link" className="text-primary mt-2" onClick={() => { setShowNewChat(true); loadAvailableUsers(); }}>
                Start a new chat
              </Button>
            </div>
          ) : (
            <div className="p-2">
              {filteredConversations.map((conversation) => {
                const otherUser = getOtherUser(conversation);
                const unread = isUnread(conversation);
                
                return (
                  <motion.button
                    key={conversation._id}
                    onClick={() => selectConversation(conversation)}
                    className={`w-full p-3 rounded-xl hover:bg-accent transition-colors text-left flex items-center gap-3 ${activeConversation?._id === conversation._id ? 'bg-primary/10' : ''}`}
                  >
                    <div className="relative flex-shrink-0">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={otherUser?.profileImage} />
                        <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                          {otherUser?.name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      {unread && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-background" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`font-bold text-sm truncate ${unread ? 'text-foreground' : 'text-foreground'}`}>
                          {otherUser?.name || 'Unknown'}
                        </p>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {formatTime(conversation.lastMessageAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {unread && <Circle className="w-2 h-2 fill-primary text-primary" />}
                        <p className={`text-sm truncate ${unread ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                          {typeof conversation.lastMessage === 'string' 
                            ? conversation.lastMessage 
                            : conversation.lastMessage?.content || 'Start a conversation'}
                        </p>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col bg-background ${!activeConversation && !showNewChat ? 'hidden md:flex' : 'flex'}`}>
        {showNewChat ? (
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => setShowNewChat(false)}>
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-bold">New Conversation</h2>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowNewChat(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="p-4 border-b border-border">
              <Input
                placeholder={`Search ${user?.role === 'candidate' ? 'mentors' : 'students'}...`}
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                onKeyDown={() => loadAvailableUsers()}
                className="h-10"
              />
            </div>
            
            <ScrollArea className="flex-1 p-4">
              {usersLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-center">
                  <Users className="w-10 h-10 text-muted-foreground/30 mb-2" />
                  <p className="text-muted-foreground text-sm">
                    {user?.role === 'candidate' ? 'No mentors found' : 'No students found'}
                  </p>
                  <Button variant="link" className="text-primary mt-2" onClick={loadAvailableUsers}>
                    Load all users
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredUsers.map((u) => (
                    <button
                      key={u._id}
                      onClick={() => startNewChat(u)}
                      className="w-full p-3 rounded-xl hover:bg-accent transition-colors text-left flex items-center gap-3"
                    >
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={u.profileImage} />
                        <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                          {u.name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm">{u.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {u.role || (user?.role === 'candidate' ? 'mentor' : 'student')}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {u.skills?.slice(0, 2)?.join(', ') || 'Chat'}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        ) : activeConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="md:hidden" onClick={closeConversation}>
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <Avatar className="w-10 h-10">
                  <AvatarImage src={getOtherUser(activeConversation)?.profileImage} />
                  <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                    {getOtherUser(activeConversation)?.name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-bold">{getOtherUser(activeConversation)?.name || 'Unknown'}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {getOtherUser(activeConversation)?.role || 'User'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon">
                  <Phone className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon">
                  <Video className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              {messagesLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageCircle className="w-12 h-12 text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">No messages yet</p>
                  <p className="text-muted-foreground text-sm mt-1">Send a message to start the conversation</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg, idx) => {
                    const isOwn = msg.sender?.toString() === user?._id?.toString() || msg.sender?._id?.toString() === user?._id?.toString();
                    return (
                      <div key={msg._id || idx} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] ${isOwn ? 'order-2' : 'order-1'}`}>
                          <div className={`px-4 py-3 rounded-2xl ${
                            isOwn 
                              ? 'bg-primary text-primary-foreground rounded-br-md' 
                              : 'bg-muted text-foreground rounded-bl-md'
                          }`}>
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          </div>
                          <p className={`text-[10px] text-muted-foreground mt-1 ${isOwn ? 'text-right' : 'text-left'}`}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t border-border">
              <div className="flex items-center gap-3">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  className="flex-1 h-11"
                  disabled={sending}
                />
                <Button onClick={handleSend} disabled={!inputValue.trim() || sending} size="icon" className="h-11 w-11 rounded-full">
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <MessageCircle className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">Select a conversation</h3>
            <p className="text-muted-foreground mb-4">Choose a conversation from the list or start a new one</p>
            <Button onClick={() => { setShowNewChat(true); loadAvailableUsers(); }}>
              <UserPlus className="w-4 h-4 mr-2" />
              Start New Chat
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default MessagesPage;