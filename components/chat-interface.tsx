'use client';

import { useEffect, useRef, useState } from 'react';
import { Send, Settings, RotateCcw, Copy, Check, Plus, Trash2, MessageSquare, Image as ImageIcon } from 'lucide-react';
import { useChatStore, type ConversationMessage, type ContentPart } from '@/lib/store';

export function ChatInterface() {
  const {
    settings,
    updateSettings,
    resetSettings,
    conversations,
    currentConversationId,
    createConversation,
    loadConversation,
    deleteConversation,
    renameConversation,
    addMessage,
    getCurrentConversation,
  } = useChatStore();

  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(true);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentConversation = getCurrentConversation();
  const messages = currentConversation?.messages || [];

  // Initialize first conversation if none exists
  useEffect(() => {
    if (conversations.length === 0) {
      createConversation();
    } else if (!currentConversationId) {
      loadConversation(conversations[0].id);
    }
  }, [conversations, currentConversationId, createConversation, loadConversation]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleCopy = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const processFiles = (files: File[]) => {
    files.forEach((file) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64 = event.target?.result as string;
          setSelectedImages((prev) => [...prev, base64]);
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    processFiles(files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  };

  const removeImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && selectedImages.length === 0) || isLoading) return;

    const userMessage = input;
    const images = [...selectedImages];

    // Create message parts
    const parts: ContentPart[] = [];
    if (userMessage) {
      parts.push({ type: 'text', text: userMessage });
    }
    images.forEach((img) => {
      parts.push({
        type: 'image',
        image: img,
        mediaType: 'image/jpeg',
      });
    });

    // Add user message
    addMessage({
      role: 'user',
      content: userMessage || '[Image]',
      parts: parts.length > 0 ? parts : undefined,
    });

    // Auto-generate title if this is the first message
    if (currentConversation && currentConversation.messages.length === 0) {
      const title =
        userMessage.slice(0, 50).trim() || 'Image conversation';
      renameConversation(currentConversation.id, title);
    }

    setInput('');
    setSelectedImages([]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...messages,
            {
              role: 'user',
              content: userMessage,
              parts: parts.length > 0 ? parts : undefined,
            },
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
      addMessage({
        role: 'assistant',
        content: fullContent,
      });

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        fullContent += decoder.decode(value, { stream: true });

        // Update streaming message
        const conv = getCurrentConversation();
        if (conv && conv.messages.length > 0) {
          const lastMsg = conv.messages[conv.messages.length - 1];
          if (lastMsg.role === 'assistant') {
            const cleanContent = fullContent
              .replace(/\[METADATA\].*?\[\/METADATA\]/s, '')
              .trim();
            lastMsg.content = cleanContent;
          }
        }
      }

      // Extract metadata
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

      // Update with metrics
      const conv = getCurrentConversation();
      if (conv && conv.messages.length > 0) {
        const lastMsg = conv.messages[conv.messages.length - 1];
        if (lastMsg.role === 'assistant') {
          lastMsg.tokens = tokens;
          lastMsg.duration = duration;
          lastMsg.content = fullContent
            .replace(/\[METADATA\].*?\[\/METADATA\]/s, '')
            .trim();
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      addMessage({
        role: 'assistant',
        content: `Error: ${errorMessage}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar - Conversation History */}
      {showHistory && (
        <div className="w-64 border-r border-border bg-card flex flex-col">
          <div className="p-4 border-b border-border">
            <button
              onClick={() => {
                createConversation();
                setShowHistory(true);
              }}
              className="w-full bg-primary text-primary-foreground px-3 py-2 rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2 text-sm"
            >
              <Plus size={16} /> New Chat
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`p-3 rounded-lg cursor-pointer transition-colors group ${
                  currentConversationId === conv.id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
                onClick={() => loadConversation(conv.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{conv.name}</p>
                    <p className="text-xs opacity-70">
                      {new Date(conv.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation(conv.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
          <div className="flex gap-2">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              title="Toggle conversation history"
            >
              <MessageSquare size={20} />
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              title="Toggle settings"
            >
              <Settings size={20} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div
          className="flex-1 overflow-y-auto p-6 space-y-4"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
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

                  {/* Images */}
                  {message.parts?.some((p) => p.type === 'image') && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {message.parts
                        .filter((p) => p.type === 'image')
                        .map((img, idx) => (
                          <img
                            key={idx}
                            src={img.image}
                            alt="Message attachment"
                            className="max-w-xs rounded-lg"
                          />
                        ))}
                    </div>
                  )}

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

        {/* Image Preview */}
        {selectedImages.length > 0 && (
          <div className="border-t border-border bg-card px-6 py-3">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {selectedImages.map((img, idx) => (
                <div key={idx} className="relative flex-shrink-0">
                  <img src={img} alt="Preview" className="h-16 rounded-lg" />
                  <button
                    onClick={() => removeImage(idx)}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:opacity-80"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-border bg-card px-6 py-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                disabled={isLoading}
                className="flex-1 bg-input border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="bg-secondary text-secondary-foreground px-3 py-2 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-2"
                title="Upload images"
              >
                <ImageIcon size={18} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <button
                type="submit"
                disabled={isLoading || (!input.trim() && selectedImages.length === 0)}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-2"
              >
                <Send size={18} />
              </button>
            </div>
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

          <div className="space-y-2">
            <label className="text-sm font-medium">Model ID</label>
            <input
              type="text"
              value={settings.model}
              onChange={(e) => updateSettings({ model: e.target.value })}
              placeholder="e.g., stealth/ox-alpha"
              className="w-full bg-input border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

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
          </div>

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
          </div>

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
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">System Prompt</label>
            <textarea
              value={settings.systemPrompt}
              onChange={(e) => updateSettings({ systemPrompt: e.target.value })}
              placeholder="Instructions for the model..."
              className="w-full bg-input border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none h-24"
            />
          </div>
        </div>
      )}
    </div>
  );
}
