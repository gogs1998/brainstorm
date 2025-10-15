# 🧠 AI Brainstorm v2 - Multi-Model Chat App

A beautiful, feature-rich messaging app for collaborative brainstorming with multiple AI models (Claude, GPT-5, Gemini) simultaneously. Models can see each other's responses and interact naturally.

![Version](https://img.shields.io/badge/version-2.0-blue)
![Features](https://img.shields.io/badge/features-15%2B-brightgreen)
![Models](https://img.shields.io/badge/models-3%2B-blue)

## ✨ What's New in v2

- 📝 **8 Conversation Templates** - Quick-start for common use cases (Product Brainstorm, Code Review, Historical Figures, GitHub Repo, etc.)
- 🤖 **9 AI Models** - Claude, GPT-5, GPT-4o, Gemini, Llama, Mixtral, DeepSeek, + 2 FREE models (Qwen, Phi-3)
- 📂 **GitHub Integration** - Analyze repositories with AI (stats, code quality, suggestions)
- 🎭 **Historical Figures Mode** - Chat with Einstein, Curie, da Vinci, or create custom personas
- 👍 **Message Reactions** - React with emoji (👍 ❤️ 💡 🔥 👎)
- ⭐ **Model Voting** - Rate responses 1-5 stars
- 🔍 **Search & Filter** - Find specific messages instantly
- ⌨️ **Keyboard Shortcuts** - 7 power-user shortcuts (Cmd+K, Cmd+N, etc.)
- 🎚️ **Temperature Control** - Adjust creativity vs focus (0.0-1.0)
- 📋 **Markdown Rendering** - Proper code blocks, lists, formatting
- 📊 **Enhanced Stats** - Real-time tracking of messages, tokens, costs
- 💰 **Cost Indicators** - See which models are FREE vs paid

## ✨ Core Features

### Core Functionality
- 💬 **Real-time messaging interface** - WhatsApp/iMessage style UI
- 🤖 **9 AI models** - Claude Sonnet 4.5, GPT-5, GPT-4o, Gemini Pro 1.5, Llama 3.3, Mixtral, DeepSeek, Qwen (FREE), Phi-3 (FREE)
- 🔄 **Live updates** - WebSocket-powered real-time responses
- 💾 **Conversation persistence** - All messages stored in session

### Collaboration Modes

#### 🤝 Collaborate Mode
Models work together to explore ideas, building on each other's contributions naturally.

#### ⚔️ Debate Mode  
Models take different perspectives and constructively challenge each other's ideas.

#### 🎭 Personas Mode
Assign specific roles to each model - including historical figures!

### Templates (8)

1. **💡 Product Brainstorm** - Explore product ideas and features
2. **🔍 Code Review** - Get multi-perspective code feedback
3. **⚔️ Structured Debate** - Explore multiple sides of arguments
4. **🔬 Research Deep Dive** - Comprehensive topic analysis
5. **🎯 Decision Making** - Evaluate options and make choices
6. **✍️ Creative Writing** - Collaborative storytelling
7. **🎭 Historical Figures** - Chat with Einstein, Curie, da Vinci, etc. (See HISTORICAL_FIGURES.md)
8. **📂 GitHub Repo Analysis** - Analyze repositories with AI insights

### Advanced Features

- **📂 GitHub Integration** - Analyze any public repository:
  - Repository stats (stars, forks, issues)
  - Language breakdown
  - README analysis
  - Recent activity and contributors
  - AI-powered code quality assessment
  - Just paste a GitHub URL or owner/repo
  
- **🎭 Historical Figures** - Preset personas:
  - Tech Visionaries (Jobs, Gates, Turing)
  - Scientists (Einstein, Curie, Feynman)  
  - Philosophers (Socrates, Nietzsche, Confucius)
  - Writers (Wilde, Angelou, Twain)
  - And many more! See `HISTORICAL_FIGURES.md` for all presets
  
- **💰 Free Model Options**:
  - Qwen 2.5 72B - Capable and completely free
  - Phi-3 Medium - Microsoft's free small model
  - Great for testing or budget-conscious usage
  
- **📝 8 Conversation Templates** - Pre-configured for:
  - Product development
  - Code review
  - Research
  - Decision making
  - Creative work
  - Debates
  - Historical roleplay
  - GitHub analysis
- **👍 Message Reactions** - React to any message with emoji
- **⭐ Model Voting** - Rate model responses 1-5 stars
- **🔍 Search** - Instant search through conversation history
- **⌨️ Keyboard Shortcuts** - Navigate like a pro:
  - `Cmd/Ctrl + Enter` - Send message
  - `Cmd/Ctrl + K` - Focus search
  - `Cmd/Ctrl + N` - New conversation
  - `Cmd/Ctrl + I` - Make models interact
  - `Cmd/Ctrl + S` - Synthesize discussion
  - `Cmd/Ctrl + /` - Show shortcuts
  - `Esc` - Close modals
- **🎚️ Temperature Control** - Slider to adjust model creativity (0.0 = focused, 1.0 = creative)
- **📋 Markdown Rendering** - Proper formatting for code, lists, emphasis
- **📊 Live Stats** - Track messages, tokens used, and estimated costs

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ installed
- OpenRouter API key ([get one here](https://openrouter.ai/keys))

### Installation

1. **Extract and navigate to the app directory:**
   ```bash
   cd ai-brainstorm-app
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure your API key:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your OpenRouter API key:
   ```
   OPENROUTER_API_KEY=sk-or-v1-your-actual-key-here
   ```

4. **Start the server:**
   ```bash
   npm start
   ```

5. **Open your browser:**
   ```
   http://localhost:3000
   ```

That's it! 🎉

## 📖 How to Use

### Starting a Conversation

1. **Select models** - Check which AI models you want in the conversation (2-3 recommended)
2. **Choose mode** - Pick Collaborate, Debate, or Personas
3. **Type your question** - Ask anything you want to brainstorm about
4. **Watch the magic** - Models will respond and reference each other's ideas

### Tips for Great Conversations

**Use Templates:**
- Select a template from the dropdown to quick-start
- Templates configure models, modes, and personas automatically

**Good starter questions:**
- "How can we improve remote team collaboration?"
- "What are the pros and cons of serverless architecture?"
- "Help me design a loyalty program for a coffee shop"
- "What's the best way to learn machine learning in 2025?"

**Using special features:**
- Click **"Make them interact"** after initial responses to prompt cross-model discussion
- Use **Debate mode** for controversial topics to see different perspectives
- Assign **personas** to get specialized viewpoints (e.g., one model as "UX expert", another as "engineer")
- Click **"Synthesize discussion"** when ready for a summary
- **React** to messages you find helpful or interesting
- **Vote** on model responses to track quality
- Use **Cmd+K** to search for specific topics discussed earlier
- Adjust **temperature** lower for factual tasks, higher for creative brainstorming

## 🎨 Customization

### Adding More Models

Edit `server.js` and add to the `MODELS` object:

```javascript
const MODELS = {
  claude: { ... },
  gpt5: { ... },
  gemini: { ... },
  llama: {
    id: 'meta-llama/llama-3.1-405b-instruct',
    name: 'Llama',
    color: '#ff6b35',
    avatar: '🦙',
    description: 'Open source powerhouse'
  }
};
```

Then update the HTML to add the checkbox in `public/index.html`.

### Adjusting Response Length

In `server.js`, modify the `max_tokens` parameter:

```javascript
max_tokens: 600,  // Increase for longer responses (costs more)
```

### Changing UI Colors

Edit `public/styles.css` and update the CSS variables:

```css
:root {
    --primary: #7c3aed;     /* Main accent color */
    --background: #0f172a;  /* Dark background */
    --surface: #1e293b;     /* Card backgrounds */
}
```

## 💰 Cost Management

**Approximate costs (as of 2025):**
- Claude Sonnet 4.5: ~$3 per million tokens
- GPT-5: ~$5 per million tokens  
- Gemini Pro 1.5: ~$1 per million tokens

**Average conversation:**
- 10 exchanges with 2 models ≈ 15,000 tokens ≈ $0.06
- 20 exchanges with 3 models ≈ 40,000 tokens ≈ $0.15

**Tips to save:**
- Use 2 models instead of 3
- Keep responses short (reduce `max_tokens`)
- Export and close conversations you're done with

## 🛠️ Troubleshooting

**"Cannot GET /" error**
- Make sure you're accessing `http://localhost:3000` not `http://localhost:3000/index.html`

**Models not responding**
- Check your OpenRouter API key in `.env`
- Ensure you have credits in your OpenRouter account
- Check browser console (F12) for errors

**WebSocket connection failed**
- This is usually fine - app will work without real-time updates
- Refresh the page to see new messages

**"Module not found" errors**
- Run `npm install` again
- Delete `node_modules` and `package-lock.json`, then run `npm install`

## 🔧 Architecture

**Backend** (`server.js`)
- Express.js server serving static files
- REST API for conversation management
- WebSocket server for real-time updates
- OpenRouter API integration

**Frontend** (`public/`)
- Vanilla JavaScript (no framework)
- WebSocket client for live updates
- Responsive CSS with dark theme

**Data Flow:**
```
User Input → Server → OpenRouter API → Multiple Models (parallel)
                ↓
         WebSocket Broadcast
                ↓
         Frontend Update → UI Render
```

## 🚀 Deployment

**Local network access:**
```bash
PORT=3000 npm start
# Access from other devices at: http://your-ip:3000
```

**Deploy to cloud:**
- Works on any Node.js hosting (Vercel, Railway, Render, Heroku)
- Add your `OPENROUTER_API_KEY` to environment variables
- Deploy and share the URL

## 🗺️ Roadmap

See [ROADMAP.md](ROADMAP.md) for the complete feature roadmap including:

**Coming Soon:**
- 📚 Document upload & RAG (conversation memory)
- 👥 Multi-user collaboration  
- 📊 Diagram generation (Mermaid flowcharts)
- 🔧 Code execution sandbox
- 🌳 Conversation branching
- 🔗 Notion/Google Docs integration
- 🎙️ Voice interface
- 📱 Mobile app

Plus 20+ more features planned! Check the roadmap for details.

## 🐛 Known Issues

- WebSocket may disconnect on some networks (app still works via polling)
- Very long conversations (100+ messages) can be slow to synthesize
- Markdown export doesn't preserve formatting perfectly

## 📄 License

MIT - Use it however you want!

## 🙏 Credits

- Built with [OpenRouter](https://openrouter.ai) for unified LLM access
- Powered by Claude (Anthropic), GPT-5 (OpenAI), and Gemini (Google)
- Inspired by the desire to stop copy-pasting between AI chat windows

---

**Enjoy your AI brainstorming sessions! 🚀**

Questions? Issues? Just ask the models for help! 😄
