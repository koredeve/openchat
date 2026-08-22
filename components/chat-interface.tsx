'use client';

import { useChat } from '@ai-sdk/react';
import { useEffect, useRef, useState } from 'react';
import { Send, Settings, RotateCcw, Copy, Check } from 'lucide-react';
import { useChatStore } from '@/lib/store';

export function ChatInterface() {
  const { settings, updateSettings, resetSettings } = useChatStore();
  const [showSettings, setShowSettings] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, input, setInput, sendMessage, status } = useChat({
    api: '/api/chat',
    body: {
      model: settings.model,
      temperature: settings.temperature,
      topP: settings.topP,
      maxTokens: settings.maxTokens,
      systemPrompt: settings.systemPrompt,
    },
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleCopy = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-border bg-card px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">OpenChat</h1>
            <p className="text-sm text-muted-foreground">
              Model: <code className="bg-muted px-2 py-1 rounded">{settings.model}</code>
            </p>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            title="Toggle settings"
          >
            <Settings size={20} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-center">
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">Start a conversation</h2>
                <p className="text-muted-foreground">Configure your model settings and send a message to get started</p>
              </div>
            </div>
          ) : (
            messages.map((message, i) => {
              const content = message.parts
                ?.filter((part) => part.type === 'text')
                .map((part) => (part as any).text)
                .join('') || '';

              return (
                <div
                  key={i}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-2xl rounded-lg px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card border border-border'
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-sm">{content}</p>
                    {message.role === 'assistant' && (
                      <button
                        onClick={() => handleCopy(content, i)}
                        className="mt-2 text-xs opacity-70 hover:opacity-100 transition-opacity"
                      >
                        {copiedId === i ? (
                          <span className="flex items-center gap-1">
                            <Check size={14} /> Copied
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Copy size={14} /> Copy
                          </span>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
          {isLoading && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex justify-start">
              <div className="bg-card border border-border rounded-lg px-4 py-3">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                  <div
                    className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                    style={{ animationDelay: '0.2s' }}
                  />
                  <div
                    className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                    style={{ animationDelay: '0.4s' }}
                  />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-border bg-card px-6 py-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (input.trim()) {
                sendMessage({ text: input });
                setInput('');
              }
            }}
            className="flex gap-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              disabled={isLoading}
              className="flex-1 bg-input border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-2"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>

      {/* Settings sidebar */}
      {showSettings && (
        <div className="w-80 border-l border-border bg-card p-6 overflow-y-auto space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Settings</h2>
            <button
              onClick={resetSettings}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              title="Reset to defaults"
            >
              <RotateCcw size={16} />
            </button>
          </div>

          {/* Model Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Model ID</label>
            <input
              type="text"
              value={settings.model}
              onChange={(e) => updateSettings({ model: e.target.value })}
              placeholder="e.g., meta-llama/llama-3.1-8b-instruct"
              className="w-full bg-input border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground">
              Use any OpenRouter model ID. Find models at{' '}
              <a
                href="https://openrouter.ai/models"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                openrouter.ai/models
              </a>
            </p>
          </div>

          {/* Temperature */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">Temperature</label>
              <span className="text-xs bg-muted px-2 py-1 rounded">{settings.temperature.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={settings.temperature}
              onChange={(e) => updateSettings({ temperature: parseFloat(e.target.value) })}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Higher = more creative, Lower = more focused
            </p>
          </div>

          {/* Top P */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">Top P</label>
              <span className="text-xs bg-muted px-2 py-1 rounded">{settings.topP.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={settings.topP}
              onChange={(e) => updateSettings({ topP: parseFloat(e.target.value) })}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Nucleus sampling: controls diversity
            </p>
          </div>

          {/* Max Tokens */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">Max Tokens</label>
              <span className="text-xs bg-muted px-2 py-1 rounded">{settings.maxTokens}</span>
            </div>
            <input
              type="range"
              min="256"
              max="4096"
              step="256"
              value={settings.maxTokens}
              onChange={(e) => updateSettings({ maxTokens: parseInt(e.target.value) })}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Max response length
            </p>
          </div>

          {/* System Prompt */}
          <div className="space-y-2">
            <label className="text-sm font-medium">System Prompt</label>
            <textarea
              value={settings.systemPrompt}
              onChange={(e) => updateSettings({ systemPrompt: e.target.value })}
              placeholder="You are a helpful AI assistant..."
              className="w-full bg-input border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none h-24"
            />
            <p className="text-xs text-muted-foreground">
              Instructions for how the model should behave
            </p>
          </div>

          {/* Info */}
          <div className="bg-muted rounded p-3 space-y-2 text-xs">
            <p className="font-semibold">About OpenChat</p>
            <p className="text-muted-foreground">
              This chat app uses OpenRouter to access 100+ AI models. Configure your model ID, parameters, and system prompt to customize the behavior.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
