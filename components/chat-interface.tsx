'use client';

import { useEffect, useRef, useState } from 'react';
import { Send, Settings, RotateCcw, Copy, Check } from 'lucide-react';
import { useChatStore } from '@/lib/store';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  tokens?: number;
  duration?: number;
}

export function ChatInterface() {
  const { settings, updateSettings, resetSettings } = useChatStore();
  const [showSettings, setShowSettings] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
            messages.map((message, i) => (
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
                  <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                  {message.role === 'assistant' && (
                    <div className="mt-2 space-y-2">
                      <button
                        onClick={() => handleCopy(message.content, i)}
                        className="text-xs opacity-70 hover:opacity-100 transition-opacity"
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
                      {(message.tokens || message.duration) && (
                        <div className="text-xs opacity-60 space-y-0.5">
                          {message.tokens && (
                            <p>📊 Tokens: {message.tokens}</p>
                          )}
                          {message.duration && (
                            <p>⏱️ Time: {message.duration}s</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
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
            onSubmit={async (e) => {
              e.preventDefault();
              if (!input.trim() || isLoading) return;

              const userMessage = input;
              setInput('');
              setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
              setIsLoading(true);

              try {
                const response = await fetch('/api/chat', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    messages: [
                      ...messages,
                      { role: 'user', content: userMessage },
                    ],
                    model: settings.model,
                    temperature: settings.temperature,
                    topP: settings.topP,
                    maxTokens: settings.maxTokens,
                  }),
                });

                if (!response.ok) {
                  const error = await response.json();
                  throw new Error(error.error || 'Failed to get response');
                }

                const reader = response.body?.getReader();
                if (!reader) throw new Error('No response body');

                let fullContent = '';
                setMessages((prev) => [...prev, { role: 'assistant', content: fullContent }]);

                const decoder = new TextDecoder();
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;

                  fullContent += decoder.decode(value, { stream: true });
                  setMessages((prev) => {
                    const updated = [...prev];
                    const lastMsg = updated[updated.length - 1];
                    if (lastMsg && lastMsg.role === 'assistant') {
                      // Extract clean content without metadata
                      const cleanContent = fullContent
                        .replace(/\[METADATA\].*?\[\/METADATA\]/s, '')
                        .trim();
                      updated[updated.length - 1] = {
                        ...lastMsg,
                        content: cleanContent,
                      };
                    }
                    return updated;
                  });
                }

                // Extract metadata after stream completes
                const metadataMatch = fullContent.match(/\[METADATA\](.*?)\[\/METADATA\]/);
                let tokens = 0;
                let duration = 0;

                if (metadataMatch) {
                  try {
                    const metadata = JSON.parse(metadataMatch[1]);
                    tokens = metadata.totalTokens;
                    duration = parseFloat(metadata.duration);
                  } catch (e) {
                    console.error('Failed to parse metadata:', e);
                  }
                }

                // Update final message with metrics
                setMessages((prev) => {
                  const updated = [...prev];
                  const lastMsg = updated[updated.length - 1];
                  if (lastMsg && lastMsg.role === 'assistant') {
                    updated[updated.length - 1] = {
                      ...lastMsg,
                      tokens,
                      duration,
                    };
                  }
                  return updated;
                });
              } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'An error occurred';
                setMessages((prev) => [
                  ...prev,
                  { role: 'assistant', content: `Error: ${errorMessage}` },
                ]);
              } finally {
                setIsLoading(false);
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
