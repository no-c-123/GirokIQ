import { create } from 'zustand';
import { db } from '@/db';
import { generateId } from '@/utils';
import type { Chat } from '@/data/models/chat';
import type { Message } from '@/data/models/message';

interface ChatState {
  chats: Chat[];
  messages: Message[];
  activeChatId: string | null;
  isLoading: boolean;
  
  // Actions
  loadChats: (userId: string) => Promise<void>;
  loadMessages: (chatId: string) => Promise<void>;
  createChat: (userId: string, title?: string) => Promise<string>;
  setActiveChat: (chatId: string) => void;
  sendMessage: (userId: string, content: string) => Promise<void>;
  clearChat: (chatId: string) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [],
  messages: [],
  activeChatId: null,
  isLoading: false,

  loadChats: async (userId: string) => {
    try {
      const chats = await db.chats
        .where('userId')
        .equals(userId)
        .reverse()
        .sortBy('updatedAt');
      set({ chats });
    } catch (error) {
      console.error('Failed to load chats:', error);
    }
  },

  loadMessages: async (chatId: string) => {
    try {
      const messages = await db.messages
        .where('chatId')
        .equals(chatId)
        .sortBy('createdAt');
      set({ messages });
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  },

  createChat: async (userId: string, title = 'New Conversation') => {
    const newChat: Chat = {
      id: generateId(),
      userId,
      title,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await db.chats.add(newChat);
    set((state) => ({ 
      chats: [newChat, ...state.chats],
      activeChatId: newChat.id 
    }));
    
    return newChat.id;
  },

  setActiveChat: (chatId: string) => {
    set({ activeChatId: chatId });
    get().loadMessages(chatId);
  },

  sendMessage: async (userId: string, content: string) => {
    let { activeChatId, messages } = get();
    
    // Create a new chat if none is active
    if (!activeChatId) {
      activeChatId = await get().createChat(userId, content.slice(0, 30) + '...');
    }

    const userMessage: Message = {
      id: generateId(),
      chatId: activeChatId,
      userId,
      role: 'user',
      content,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Optimistically update UI
    set((state) => ({ 
      messages: [...state.messages, userMessage],
      isLoading: true
    }));

    // Save to local DB
    await db.messages.add(userMessage);

    try {
      // Connect to AI API endpoint
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Send context of current chat
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content
          }))
        }),
      });

      if (!response.ok) throw new Error('Failed to fetch AI response');
      if (!response.body) throw new Error('No response body');

      // Set up streaming reader
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      
      const aiMessageId = generateId();
      let aiContent = '';

      const aiMessage: Message = {
        id: aiMessageId,
        chatId: activeChatId,
        userId,
        role: 'assistant',
        content: '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Add empty AI message to state
      set((state) => ({ messages: [...state.messages, aiMessage] }));

      // Read stream
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        aiContent += chunk;
        
        // Update state with new chunks
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg.id === aiMessageId ? { ...msg, content: aiContent } : msg
          )
        }));
      }

      // Save final AI message to local DB
      aiMessage.content = aiContent;
      await db.messages.add(aiMessage);
      
      // Update chat's updatedAt timestamp
      await db.chats.update(activeChatId, { updatedAt: Date.now() });

    } catch (error) {
      console.error('Error sending message:', error);
      // Optional: Add an error message to the chat
    } finally {
      set({ isLoading: false });
    }
  },

  clearChat: async (chatId: string) => {
    try {
      await db.messages.where('chatId').equals(chatId).delete();
      if (get().activeChatId === chatId) {
        set({ messages: [] });
      }
    } catch (error) {
      console.error('Failed to clear chat:', error);
    }
  }
}));
