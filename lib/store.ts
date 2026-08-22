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
  model: 'meta-llama/llama-3.1-8b-instruct',
  temperature: 0.7,
  topP: 1,
  maxTokens: 2048,
  systemPrompt: 'You are a helpful AI assistant.',
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
