import { create } from 'zustand';

export interface ChatSettings {
  model: string;
  temperature: number;
  topP: number;
  maxTokens: number;
  systemPrompt: string;
}

export interface ChatState {
  settings: ChatSettings;
  updateSettings: (settings: Partial<ChatSettings>) => void;
  resetSettings: () => void;
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

export const useChatStore = create<ChatState>((set) => ({
  settings: DEFAULT_SETTINGS,
  updateSettings: (newSettings) =>
    set((state) => ({
      settings: { ...state.settings, ...newSettings },
    })),
  resetSettings: () =>
    set({ settings: DEFAULT_SETTINGS }),
}));
