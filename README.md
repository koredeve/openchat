# OpenChat

A full-featured chat interface with model selection, parameter control, and system prompts. Choose any model from OpenRouter and chat with complete control over temperature, top_p, max_tokens, and custom system prompts.

## Features

- 🎯 **Model Selection**: Use any OpenRouter model by entering its model ID
- 🎚️ **Advanced Controls**: Temperature, top_p, max_tokens sliders
- 📝 **System Prompts**: Customize how the model behaves
- ⚡ **Streaming Responses**: Real-time token streaming for fast feedback
- 🎨 **Beautiful UI**: Dark/light mode with responsive design
- 🔒 **Secure**: API key stays on the server, never exposed to the browser

## Getting Started

### Prerequisites

- Node.js 18+
- An OpenRouter API key (get one at [openrouter.ai](https://openrouter.ai))

### Installation

1. Clone or navigate to the project:

```bash
cd openchat
```

2. Install dependencies:

```bash
npm install
```

3. Set up your environment variable:

```bash
cp .env.example .env.local
```

Then edit `.env.local` and add your OpenRouter API key:

```env
OPENROUTER_API_KEY=your-key-here
```

### Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Using the App

1. **Choose a Model**: In the settings panel (click the ⚙️ icon), enter any OpenRouter model ID
   - Example: `meta-llama/llama-3.1-8b-instruct`
   - Browse available models at [openrouter.ai/models](https://openrouter.ai/models)

2. **Configure Parameters**:
   - **Temperature** (0-2): Controls randomness. Higher = more creative, Lower = more focused
   - **Top P** (0-1): Nucleus sampling for diversity
   - **Max Tokens**: Maximum response length

3. **Set System Prompt**: Guide how the model behaves

4. **Chat**: Type a message and hit send

## Deployment

### Deploy to Vercel

1. Push to GitHub

2. Deploy:

```bash
vercel
```

3. Set environment variables in the Vercel dashboard:
   - Go to Settings → Environment Variables
   - Add `OPENROUTER_API_KEY` with your key

4. Re-deploy and you're live!

## Available Models

Browse thousands of models at [openrouter.ai/models](https://openrouter.ai/models):

- **Open Source**: Llama, Mistral, Qwen, etc.
- **Proprietary**: GPT-4, Claude, Gemini (through OpenRouter)
- **Pricing**: See real-time pricing for each model

## Tech Stack

- **Frontend**: React + Next.js (App Router)
- **Streaming**: AI SDK from Vercel
- **Backend**: Next.js API Routes
- **Styling**: Tailwind CSS
- **State**: Zustand
- **API**: OpenRouter via @ai-sdk/openai

## Architecture

```
┌─────────────┐
│   Browser   │ (Chat UI, Settings)
└──────┬──────┘
       │ POST /api/chat
       ▼
┌─────────────┐
│ Next.js API │ (Validated request, calls OpenRouter)
└──────┬──────┘
       │ Stream
       ▼
┌──────────────────┐
│   OpenRouter     │ (Routes to actual model provider)
└──────────────────┘
```

## Key Files

- `app/page.tsx` - Main chat page
- `components/chat-interface.tsx` - Chat UI component
- `app/api/chat/route.ts` - Backend API for chat
- `lib/store.ts` - Chat settings state (Zustand)

## Customization

### Change Default Model

Edit `lib/store.ts`:

```ts
const DEFAULT_SETTINGS: ChatSettings = {
  model: 'your-preferred-model-here',
  // ...
};
```

### Customize Styling

Edit `app/globals.css` to change colors and themes.

### Add More Features

The architecture supports adding:
- Conversation history / persistent storage
- Model capabilities (vision, tools)
- Image upload support
- Export conversations

## Troubleshooting

### "OpenRouter API key not configured"

- Ensure `OPENROUTER_API_KEY` is set in `.env.local`
- Restart the dev server after changing env vars

### Model not found

- Check the model ID format at [openrouter.ai/models](https://openrouter.ai/models)
- Use the exact model ID shown on the site

### Slow responses

- Check internet connection
- Some models are slower than others (see pricing/speed on OpenRouter)

## License

MIT
