import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ChatSettings {
  model: string;
  temperature: number;
  topP: number;
  maxTokens: number;
  systemPrompt: string;
}

export interface ContentPart {
  type: 'text' | 'image';
  text?: string;
  image?: string; // base64 encoded
  mediaType?: string; // e.g., 'image/jpeg'
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  parts?: ContentPart[];
  tokens?: number;
  duration?: number;
}

export interface Conversation {
  id: string;
  name: string;
  messages: ConversationMessage[];
  settings: ChatSettings;
  createdAt: number;
  updatedAt: number;
}

export interface ChatState {
  settings: ChatSettings;
  updateSettings: (settings: Partial<ChatSettings>) => void;
  resetSettings: () => void;
  conversations: Conversation[];
  currentConversationId: string | null;
  createConversation: (name?: string) => string;
  loadConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  renameConversation: (id: string, name: string) => void;
  addMessage: (message: ConversationMessage) => void;
  getCurrentConversation: () => Conversation | null;
}

const DEFAULT_SETTINGS: ChatSettings = {
  model: 'stealth/ox-alpha',
  temperature: 0.7,
  topP: 0.95,
  maxTokens: 2048,
  systemPrompt: `You are a highly capable and helpful AI assistant. You provide accurate, thoughtful, and well-reasoned responses.

Guidelines:
- Be clear, concise, and direct in your answers
- Provide detailed explanations when needed
- Ask clarifying questions if the user's intent is unclear
- Admit when you're unsure rather than guessing
- Format code and structured data clearly
- Be friendly and professional`,
};

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      conversations: [],
      currentConversationId: null,

      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),

      resetSettings: () =>
        set({ settings: DEFAULT_SETTINGS }),

      createConversation: (name?: string) => {
        const id = `conv_${Date.now()}`;
        const timestamp = Date.now();
        const newConversation: Conversation = {
          id,
          name: name || `Chat ${new Date(timestamp).toLocaleString()}`,
          messages: [],
          settings: get().settings,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        set((state) => ({
          conversations: [newConversation, ...state.conversations],
          currentConversationId: id,
        }));
        return id;
      },

      loadConversation: (id: string) => {
        set({ currentConversationId: id });
      },

      deleteConversation: (id: string) => {
        set((state) => {
          const conversations = state.conversations.filter((c) => c.id !== id);
          return {
            conversations,
            currentConversationId:
              state.currentConversationId === id
                ? conversations[0]?.id || null
                : state.currentConversationId,
          };
        });
      },

      renameConversation: (id: string, name: string) => {
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === id ? { ...c, name, updatedAt: Date.now() } : c
          ),
        }));
      },

      addMessage: (message: ConversationMessage) => {
        set((state) => {
          const conversationId = state.currentConversationId;
          if (!conversationId) return state;

          return {
            conversations: state.conversations.map((c) =>
              c.id === conversationId
                ? {
                    ...c,
                    messages: [...c.messages, message],
                    updatedAt: Date.now(),
                  }
                : c
            ),
          };
        });
      },

      getCurrentConversation: () => {
        const state = get();
        if (!state.currentConversationId) return null;
        return (
          state.conversations.find((c) => c.id === state.currentConversationId) ||
          null
        );
      },
    }),
    {
      name: 'openchat-storage',
    }
  )
);
