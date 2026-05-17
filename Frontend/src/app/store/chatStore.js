import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getConversations, getMessages, getOrCreateConversation, markMessagesRead } from '../services/api';

const useChatStore = create(
  persist(
    (set, get) => ({
      conversations: [],
      activeConversation: null,
      messages: [],
      loading: false,
      messagesLoading: false,
      error: null,

      setConversations: (conversations) => set({ conversations }),
      
      setActiveConversation: (conversation) => set({ activeConversation: conversation }),
      
      setMessages: (messages) => set({ messages }),
      
      addMessage: (message) => {
        const { messages } = get();
        const exists = messages.some(m => m._id === message._id);
        if (!exists) {
          set({ messages: [...messages, message] });
        }
      },

      updateConversationLastMessage: (conversationId, lastMessage, lastMessageAt) => {
        const { conversations } = get();
        set({
          conversations: conversations.map(c => 
            c._id === conversationId 
              ? { ...c, lastMessage, lastMessageAt, unreadCount: (c.unreadCount || 0) + 1 }
              : c
          ).sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt))
        });
      },

      loadConversations: async () => {
        set({ loading: true, error: null });
        try {
          const res = await getConversations();
          set({ conversations: res.data || [], loading: false });
        } catch (error) {
          set({ error: error.message, loading: false });
        }
      },

      loadMessages: async (conversationId) => {
        set({ messagesLoading: true, error: null });
        try {
          const res = await getMessages(conversationId);
          set({ messages: res.data?.reverse() || [], messagesLoading: false });
        } catch (error) {
          set({ error: error.message, messagesLoading: false });
        }
      },

      selectConversation: async (conversation) => {
        set({ activeConversation: conversation, messagesLoading: true });
        try {
          const res = await getMessages(conversation._id);
          set({ messages: res.data?.reverse() || [], messagesLoading: false });
          await markMessagesRead(conversation._id);
        } catch (error) {
          set({ error: error.message, messagesLoading: false });
        }
      },

      startNewChat: async (participantId) => {
        try {
          const res = await getOrCreateConversation(participantId);
          await get().selectConversation(res.data);
          return res.data;
        } catch (error) {
          set({ error: error.message });
          throw error;
        }
      },

      clearActiveConversation: () => set({ activeConversation: null, messages: [] }),
      
      clearError: () => set({ error: null }),
    }),
    {
      name: 'guruconnect-chat',
      partialize: (state) => ({
        conversations: state.conversations,
      }),
    }
  )
);

export default useChatStore;