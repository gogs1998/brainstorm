import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { Octokit } from '@octokit/rest';

dotenv.config();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // Optional - for higher rate limits

// Initialize Octokit (GitHub API client)
const octokit = new Octokit({
  auth: GITHUB_TOKEN
});

// Available models with metadata
const MODELS = {
  claude: {
    id: 'anthropic/claude-3.5-sonnet:beta',
    name: 'Claude',
    color: '#9b59b6',
    avatar: '🤖',
    description: 'Thoughtful and detailed',
    cost: '$$$'
  },
  gpt5: {
    id: 'openai/gpt-4o',
    name: 'GPT4o',
    color: '#10a37f',
    avatar: '🧠',
    description: 'Creative and versatile',
    cost: '$$$'
  },
  gemini: {
    id: 'google/gemini-pro-1.5-exp',
    name: 'Gemini',
    color: '#4285f4',
    avatar: '✨',
    description: 'Fast and analytical',
    cost: '$$'
  },
  gpt4o: {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    color: '#74aa9c',
    avatar: '🔮',
    description: 'Multimodal powerhouse',
    cost: '$$'
  },
  llama: {
    id: 'meta-llama/llama-3.3-70b-instruct',
    name: 'Llama 3.3',
    color: '#ff6b35',
    avatar: '🦙',
    description: 'Open source, capable',
    cost: '$'
  },
  mixtral: {
    id: 'mistralai/mixtral-8x7b-instruct',
    name: 'Mixtral',
    color: '#ff6b9d',
    avatar: '🌀',
    description: 'Fast and efficient',
    cost: '$'
  },
  deepseek: {
    id: 'deepseek/deepseek-chat',
    name: 'DeepSeek',
    color: '#00d4ff',
    avatar: '🌊',
    description: 'Reasoning specialist',
    cost: '$'
  },
  // FREE MODELS
  qwen: {
    id: 'qwen/qwen-2.5-72b-instruct',
    name: 'Qwen',
    color: '#ff4757',
    avatar: '🎯',
    description: 'Free & capable',
    cost: 'FREE',
    free: true
  },
  phi: {
    id: 'microsoft/phi-3-medium-128k-instruct',
    name: 'Phi-3',
    color: '#5f27cd',
    avatar: '🔬',
    description: 'Free small model',
    cost: 'FREE',
    free: true
  }
};

// Conversation templates
const TEMPLATES = {
  product_brainstorm: {
    name: 'Product Brainstorm',
    icon: '💡',
    description: 'Explore new product ideas and features',
    initialPrompt: 'Let\'s brainstorm ideas for: [YOUR PRODUCT/FEATURE]',
    suggestedModels: ['claude', 'gpt5', 'gemini'],
    mode: 'collaborate',
    personas: {
      claude: 'Focus on user experience and practical implementation',
      gpt5: 'Think creatively about innovative features',
      gemini: 'Consider technical feasibility and scalability'
    }
  },
  code_review: {
    name: 'Code Review',
    icon: '🔍',
    description: 'Get multiple perspectives on code quality',
    initialPrompt: 'Please review this code for: [PASTE CODE OR DESCRIBE]',
    suggestedModels: ['claude', 'gpt5'],
    mode: 'collaborate',
    personas: {
      claude: 'Focus on code quality, maintainability, and best practices',
      gpt5: 'Look for bugs, edge cases, and security issues'
    }
  },
  debate: {
    name: 'Structured Debate',
    icon: '⚔️',
    description: 'Explore multiple sides of an argument',
    initialPrompt: 'Let\'s debate: [YOUR TOPIC]',
    suggestedModels: ['claude', 'gpt5'],
    mode: 'debate',
    personas: {
      claude: 'Argue FOR the proposition',
      gpt5: 'Argue AGAINST the proposition'
    }
  },
  research: {
    name: 'Research Deep Dive',
    icon: '🔬',
    description: 'Comprehensive analysis of a topic',
    initialPrompt: 'Help me research: [YOUR TOPIC]',
    suggestedModels: ['claude', 'gpt5', 'gemini'],
    mode: 'collaborate',
    personas: {
      claude: 'Provide detailed analysis and context',
      gpt5: 'Find connections and synthesize insights',
      gemini: 'Challenge assumptions and provide alternative views'
    }
  },
  decision_making: {
    name: 'Decision Making',
    icon: '🎯',
    description: 'Evaluate options and make informed choices',
    initialPrompt: 'Help me decide: [YOUR DECISION]',
    suggestedModels: ['claude', 'gpt5', 'gemini'],
    mode: 'collaborate',
    personas: {
      claude: 'Analyze pros and cons systematically',
      gpt5: 'Consider long-term implications',
      gemini: 'Identify risks and opportunities'
    }
  },
  creative_writing: {
    name: 'Creative Writing',
    icon: '✍️',
    description: 'Collaborative story and content creation',
    initialPrompt: 'Let\'s write: [YOUR CREATIVE PROJECT]',
    suggestedModels: ['claude', 'gpt5'],
    mode: 'collaborate',
    personas: {
      claude: 'Focus on narrative structure and character development',
      gpt5: 'Add creative flourishes and unexpected twists'
    }
  },
  historical_figures: {
    name: 'Historical Figures',
    icon: '🎭',
    description: 'Chat with historical personalities (AI roleplay)',
    initialPrompt: 'Let\'s discuss: [YOUR TOPIC] - each of you share your perspective!',
    suggestedModels: ['claude', 'gpt5', 'gemini'],
    mode: 'personas',
    personas: {
      claude: 'You are Albert Einstein. Respond as Einstein would - curious, witty, focused on physics and philosophy. Use "I" and speak in first person. Reference your actual work and life experiences.',
      gpt5: 'You are Marie Curie. Respond as Curie would - determined, scientific, pioneering. Use "I" and speak in first person. Reference your research and experiences as a woman in science.',
      gemini: 'You are Leonardo da Vinci. Respond as da Vinci would - artistic, inventive, renaissance mindset. Use "I" and speak in first person. Reference your art, inventions, and observations.'
    },
    note: 'Customize personas with your favorite historical figures!'
  },
  github_repo: {
    name: 'GitHub Repo Analysis',
    icon: '📂',
    description: 'Analyze GitHub repositories collaboratively',
    initialPrompt: 'Analyze this repository: [GITHUB URL OR OWNER/REPO]',
    suggestedModels: ['claude', 'gpt5'],
    mode: 'collaborate',
    personas: {
      claude: 'Analyze code quality, architecture, and documentation',
      gpt5: 'Identify potential issues, suggest improvements, evaluate project health'
    },
    requiresGitHub: true
  },
  test_sequential: {
    name: '🧪 Test - Sequential',
    icon: '🧪',
    description: 'Models respond one after another (experimental)',
    initialPrompt: 'Let\'s test sequential responses - what do you think about AI?',
    suggestedModels: ['qwen', 'phi'],
    mode: 'sequential',
    personas: {
      qwen: 'Respond first, then wait for others to build on your ideas',
      phi: 'Build on what Qwen said, adding your own perspective'
    }
  },
  test_turnbased: {
    name: '🧪 Test - Turn-Based',
    icon: '🎲',
    description: 'Only one model responds per message, rotating turns',
    initialPrompt: 'Let\'s take turns responding - what are your thoughts?',
    suggestedModels: ['qwen', 'phi', 'deepseek'],
    mode: 'turnbased',
    personas: {
      qwen: 'When it\'s your turn, provide your perspective clearly and concisely',
      phi: 'When it\'s your turn, build on the conversation and add new insights',
      deepseek: 'When it\'s your turn, analyze what\'s been said and offer deeper thoughts'
    }
  },
  test_facilitator: {
    name: '🧪 Test - Facilitator',
    icon: '🎤',
    description: 'One model leads discussion, others respond when called on',
    initialPrompt: 'Let\'s have a facilitated discussion',
    suggestedModels: ['claude', 'qwen', 'phi'],
    mode: 'facilitator',
    personas: {
      claude: 'You are the FACILITATOR. Ask thoughtful questions to Qwen and Phi-3. Guide the discussion by calling on them by name. Do not answer your own questions.',
      qwen: 'You are a PARTICIPANT. Only respond when the facilitator (Claude) asks you a direct question or calls on you by name.',
      phi: 'You are a PARTICIPANT. Only respond when the facilitator (Claude) asks you a direct question or calls on you by name.'
    }
  },
  test_debate_rounds: {
    name: '🧪 Test - Debate Rounds',
    icon: '⚔️',
    description: 'Structured debate with opening, rebuttal, and closing',
    initialPrompt: 'Debate topic: [YOUR TOPIC] - Opening statements first!',
    suggestedModels: ['qwen', 'phi'],
    mode: 'debate_rounds',
    personas: {
      qwen: 'You are arguing FOR the topic. First give opening statement, then rebuttals, then closing.',
      phi: 'You are arguing AGAINST the topic. First give opening statement, then rebuttals, then closing.'
    }
  },
  test_socratic: {
    name: '🧪 Test - Socratic Method',
    icon: '🤔',
    description: 'One model asks probing questions, others explore answers',
    initialPrompt: 'Let\'s explore this topic deeply through questions',
    suggestedModels: ['phi', 'qwen'],
    mode: 'socratic',
    personas: {
      phi: 'You are the QUESTIONER. Ask one deep, probing question at a time to help explore the topic. Be like Socrates - guide through questions, not answers.',
      qwen: 'You are the THINKER. Answer the questions thoughtfully and honestly. Explore your reasoning and admit what you don\'t know.'
    }
  }
};

// Store active conversations
const conversations = new Map();

// WebSocket connections
const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log('Client connected');

  ws.on('close', () => {
    clients.delete(ws);
    console.log('Client disconnected');
  });
});

// Broadcast to all connected clients
function broadcast(data) {
  const message = JSON.stringify(data);
  clients.forEach((client) => {
    if (client.readyState === 1) { // OPEN
      client.send(message);
    }
  });
}

// Call OpenRouter API (non-streaming)
async function callModel(modelKey, messages, persona = null, temperature = 0.7) {
  const model = MODELS[modelKey];

  let systemPrompt = `You are ${model.name} participating in a collaborative brainstorming session with other AI models and a human user.

IMPORTANT: Just respond naturally - do NOT prefix your response with your name or say things like "${model.name}:" or "I'm ${model.name}...". Your name is already shown in the interface.

Messages show speaker names. When responding:
- Build on others' ideas naturally
- Offer alternative perspectives constructively
- Reference specific points by name (e.g., "I like Claude's point about..." or "Building on what Qwen said...")
- Ask clarifying questions to any participant
- Be conversational and concise (2-4 paragraphs typically)
- Be collaborative, not competitive
- Respond as yourself, but don't announce your name in the response`;

  if (persona) {
    systemPrompt += `\n\n${persona}`;
  }

  const messagesWithSystem = [
    { role: 'system', content: systemPrompt },
    ...messages
  ];

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'AI Brainstorm App'
      },
      body: JSON.stringify({
        model: model.id,
        messages: messagesWithSystem,
        max_tokens: 600,
        temperature: temperature
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error: ${response.status} - ${error}`);
    }

    const data = await response.json();

    return {
      content: data.choices[0].message.content,
      usage: data.usage,
      model: data.model
    };
  } catch (error) {
    console.error(`Error calling ${modelKey}:`, error);
    return null;
  }
}

// Call OpenRouter API with streaming
async function callModelStreaming(modelKey, messages, persona, temperature, conversationId) {
  const model = MODELS[modelKey];

  let systemPrompt = `You are ${model.name} participating in a collaborative brainstorming session with other AI models and a human user.

IMPORTANT: Just respond naturally - do NOT prefix your response with your name or say things like "${model.name}:" or "I'm ${model.name}...". Your name is already shown in the interface.

Messages show speaker names. When responding:
- Build on others' ideas naturally
- Offer alternative perspectives constructively
- Reference specific points by name (e.g., "I like Claude's point about..." or "Building on what Qwen said...")
- Ask clarifying questions to any participant
- Be conversational and concise (2-4 paragraphs typically)
- Be collaborative, not competitive
- Respond as yourself, but don't announce your name in the response`;

  if (persona) {
    systemPrompt += `\n\n${persona}`;
  }

  const messagesWithSystem = [
    { role: 'system', content: systemPrompt },
    ...messages
  ];

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'AI Brainstorm App'
      },
      body: JSON.stringify({
        model: model.id,
        messages: messagesWithSystem,
        max_tokens: 600,
        temperature: temperature,
        stream: true
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error: ${response.status} - ${error}`);
    }

    let fullContent = '';
    const messageId = uuidv4();

    // Stream the response
    const reader = response.body;
    reader.setEncoding('utf8');

    for await (const chunk of reader) {
      const lines = chunk.split('\n').filter(line => line.trim() !== '');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices[0]?.delta?.content || '';

            if (content) {
              fullContent += content;

              // Broadcast streaming chunk
              broadcast({
                type: 'stream',
                conversationId,
                modelKey,
                messageId,
                content: fullContent,
                isComplete: false
              });
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }

    return {
      content: fullContent,
      messageId,
      model: model.id
    };
  } catch (error) {
    console.error(`Error streaming ${modelKey}:`, error);
    return null;
  }
}

// Create new conversation
app.post('/api/conversations', (req, res) => {
  const { activeModels = ['claude', 'gpt5'], mode = 'collaborate', template = null } = req.body;
  
  const conversationId = uuidv4();
  const conversation = {
    id: conversationId,
    messages: [],
    activeModels,
    mode, // collaborate, debate, personas
    personas: {},
    temperature: 0.7,
    totalTokens: 0,
    totalCost: 0,
    createdAt: new Date(),
    template: template
  };
  
  // Apply template settings if provided
  if (template && TEMPLATES[template]) {
    const tmpl = TEMPLATES[template];
    conversation.activeModels = tmpl.suggestedModels;
    conversation.mode = tmpl.mode;
    conversation.personas = { ...tmpl.personas };
  }
  
  conversations.set(conversationId, conversation);
  
  res.json({ conversationId, conversation });
});

// Get conversation
app.get('/api/conversations/:id', (req, res) => {
  const conversation = conversations.get(req.params.id);
  if (!conversation) {
    return res.status(404).json({ error: 'Conversation not found' });
  }
  res.json(conversation);
});

// Update conversation settings
app.patch('/api/conversations/:id', (req, res) => {
  const conversation = conversations.get(req.params.id);
  if (!conversation) {
    return res.status(404).json({ error: 'Conversation not found' });
  }
  
  const { activeModels, mode, personas, temperature } = req.body;
  if (activeModels) conversation.activeModels = activeModels;
  if (mode) conversation.mode = mode;
  if (personas) conversation.personas = personas;
  if (temperature !== undefined) conversation.temperature = temperature;
  
  res.json(conversation);
});

// Send message and get responses
app.post('/api/conversations/:id/messages', async (req, res) => {
  const conversation = conversations.get(req.params.id);
  if (!conversation) {
    return res.status(404).json({ error: 'Conversation not found' });
  }
  
  const { content, action = 'message' } = req.body;

  // Check for @mentions to target specific models
  const mentionPattern = /@(claude|gpt4o|gpt5|gemini|llama|mixtral|deepseek|qwen|phi)/gi;
  const mentions = content.match(mentionPattern);
  const mentionedModels = mentions
    ? [...new Set(mentions.map(m => m.substring(1).toLowerCase()))]
    : null;

  console.log('📝 User message:', content);
  console.log('🏷️  Detected mentions:', mentionedModels);
  console.log('✅ Active models:', conversation.activeModels);

  // Determine which models should respond
  let respondingModels = conversation.activeModels;
  if (mentionedModels && mentionedModels.length > 0) {
    // Only call mentioned models that are active
    respondingModels = mentionedModels.filter(m => conversation.activeModels.includes(m));
    console.log('🎯 Responding models (filtered):', respondingModels);
  } else {
    console.log('🌐 Responding models (all active):', respondingModels);
  }

  // Add user message
  const userMessage = {
    id: uuidv4(),
    role: 'user',
    content,
    name: 'You',
    timestamp: new Date(),
    action,
    reactions: {}
  };

  conversation.messages.push(userMessage);

  // Broadcast user message
  broadcast({
    type: 'message',
    conversationId: conversation.id,
    message: userMessage
  });

  // Prepare messages for API (convert to OpenRouter format)
  // Include speaker name in content to show who said what, but don't use the name field
  const apiMessages = conversation.messages.map(msg => {
    if (msg.role === 'assistant' && msg.name) {
      return {
        role: msg.role,
        content: `[${msg.name}]: ${msg.content}`
      };
    }
    return {
      role: msg.role,
      content: msg.content
    };
  });

  res.json({ message: userMessage });

  // Handle turn-based mode (initialize turn counter if needed)
  if (conversation.mode === 'turnbased' && !conversation.turnIndex) {
    conversation.turnIndex = 0;
  }

  // Get responses from models (different strategies based on mode)
  if (conversation.mode === 'turnbased') {
    // Turn-based: only one model responds, rotating through models
    const modelKey = respondingModels[conversation.turnIndex % respondingModels.length];
    conversation.turnIndex++;

    broadcast({
      type: 'thinking',
      conversationId: conversation.id,
      model: modelKey
    });

    const persona = conversation.personas[modelKey];
    const temperature = conversation.temperature || 0.7;

    const updatedApiMessages = conversation.messages.map(msg => {
      if (msg.role === 'assistant' && msg.name) {
        return {
          role: msg.role,
          content: `[${msg.name}]: ${msg.content}`
        };
      }
      return {
        role: msg.role,
        content: msg.content
      };
    });

    const result = await callModel(modelKey, updatedApiMessages, persona, temperature);

    if (result) {
      const model = MODELS[modelKey];
      const assistantMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: result.content,
        name: model.name,
        modelKey,
        timestamp: new Date(),
        usage: result.usage,
        reactions: {},
        votes: 0
      };

      conversation.messages.push(assistantMessage);

      if (result.usage) {
        conversation.totalTokens += (result.usage.total_tokens || 0);
        conversation.totalCost += (result.usage.total_tokens || 0) * 0.000015;
      }

      broadcast({
        type: 'message',
        conversationId: conversation.id,
        message: assistantMessage
      });
    }
  } else if (conversation.mode === 'facilitator' || conversation.mode === 'socratic' || conversation.mode === 'debate_rounds') {
    // Facilitator/Socratic/Debate: Sequential with specific roles
    // These modes work like sequential but rely on personas to define behavior
    for (const modelKey of respondingModels) {
      broadcast({
        type: 'thinking',
        conversationId: conversation.id,
        model: modelKey
      });

      const persona = conversation.personas[modelKey];
      const temperature = conversation.temperature || 0.7;

      const updatedApiMessages = conversation.messages.map(msg => {
        if (msg.role === 'assistant' && msg.name) {
          return {
            role: msg.role,
            content: `[${msg.name}]: ${msg.content}`
          };
        }
        return {
          role: msg.role,
          content: msg.content
        };
      });

      const result = await callModel(modelKey, updatedApiMessages, persona, temperature);

      if (result) {
        const model = MODELS[modelKey];
        const assistantMessage = {
          id: uuidv4(),
          role: 'assistant',
          content: result.content,
          name: model.name,
          modelKey,
          timestamp: new Date(),
          usage: result.usage,
          reactions: {},
          votes: 0
        };

        conversation.messages.push(assistantMessage);

        if (result.usage) {
          conversation.totalTokens += (result.usage.total_tokens || 0);
          conversation.totalCost += (result.usage.total_tokens || 0) * 0.000015;
        }

        broadcast({
          type: 'message',
          conversationId: conversation.id,
          message: assistantMessage
        });

        // Add delay for natural flow
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }
  } else if (conversation.mode === 'sequential') {
    // Sequential mode: models respond one after another
    for (const modelKey of respondingModels) {
      broadcast({
        type: 'thinking',
        conversationId: conversation.id,
        model: modelKey
      });

      const persona = conversation.personas[modelKey];
      const temperature = conversation.temperature || 0.7;

      // Update apiMessages to include previous sequential responses
      const updatedApiMessages = conversation.messages.map(msg => {
        if (msg.role === 'assistant' && msg.name) {
          return {
            role: msg.role,
            content: `[${msg.name}]: ${msg.content}`
          };
        }
        return {
          role: msg.role,
          content: msg.content
        };
      });

      const result = await callModel(modelKey, updatedApiMessages, persona, temperature);

      if (result) {
        const model = MODELS[modelKey];
        const assistantMessage = {
          id: uuidv4(),
          role: 'assistant',
          content: result.content,
          name: model.name,
          modelKey,
          timestamp: new Date(),
          usage: result.usage,
          reactions: {},
          votes: 0
        };

        conversation.messages.push(assistantMessage);

        // Update token usage
        if (result.usage) {
          conversation.totalTokens += (result.usage.total_tokens || 0);
          conversation.totalCost += (result.usage.total_tokens || 0) * 0.000015;
        }

        // Broadcast model response
        broadcast({
          type: 'message',
          conversationId: conversation.id,
          message: assistantMessage
        });

        // Add delay before next model (makes it feel more natural)
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }
  } else {
    // Parallel mode: all models respond at once (default) - with streaming!
    const modelResponses = await Promise.all(
      respondingModels.map(async (modelKey) => {
        broadcast({
          type: 'thinking',
          conversationId: conversation.id,
          model: modelKey
        });

        const persona = conversation.personas[modelKey];
        const temperature = conversation.temperature || (conversation.mode === 'debate' ? 0.8 : 0.7);

        const result = await callModelStreaming(modelKey, apiMessages, persona, temperature, conversation.id);

        if (result) {
          const model = MODELS[modelKey];
          const assistantMessage = {
            id: result.messageId,
            role: 'assistant',
            content: result.content,
            name: model.name,
            modelKey,
            timestamp: new Date(),
            usage: result.usage,
            reactions: {},
            votes: 0
          };

          conversation.messages.push(assistantMessage);

          // Update token usage (estimating since streaming doesn't always return usage)
          const estimatedTokens = Math.ceil(result.content.length / 4);
          conversation.totalTokens += estimatedTokens;
          conversation.totalCost += estimatedTokens * 0.000015;

          // Broadcast final complete message
          broadcast({
            type: 'stream',
            conversationId: conversation.id,
            modelKey,
            messageId: result.messageId,
            content: result.content,
            isComplete: true
          });

          return assistantMessage;
        }

        return null;
      })
    );
  }

  broadcast({
    type: 'complete',
    conversationId: conversation.id
  });
});

// Get conversation summary/synthesis
app.post('/api/conversations/:id/synthesize', async (req, res) => {
  const conversation = conversations.get(req.params.id);
  if (!conversation) {
    return res.status(404).json({ error: 'Conversation not found' });
  }
  
  // Use Claude to synthesize the conversation
  const synthesisPrompt = `Review this entire brainstorming conversation and provide:

1. **Key Ideas** - The 3-5 most important concepts discussed
2. **Consensus Points** - Where all models agreed
3. **Divergent Views** - Interesting disagreements or alternative perspectives
4. **Action Items** - Concrete next steps or recommendations
5. **Summary** - A 2-3 sentence overview

Keep it concise and actionable.`;
  
  const apiMessages = conversation.messages.map(msg => ({
    role: msg.role,
    content: msg.content,
    ...(msg.name && msg.role !== 'user' && { name: msg.name })
  }));
  
  apiMessages.push({
    role: 'user',
    content: synthesisPrompt
  });
  
  const result = await callModel('claude', apiMessages, null, 0.3);
  
  if (result) {
    res.json({ synthesis: result.content });
  } else {
    res.status(500).json({ error: 'Failed to generate synthesis' });
  }
});

// Export conversation to markdown
app.get('/api/conversations/:id/export', (req, res) => {
  const conversation = conversations.get(req.params.id);
  if (!conversation) {
    return res.status(404).json({ error: 'Conversation not found' });
  }
  
  let markdown = `# AI Brainstorm Session\n\n`;
  markdown += `**Date:** ${conversation.createdAt.toLocaleString()}\n`;
  markdown += `**Mode:** ${conversation.mode}\n`;
  markdown += `**Models:** ${conversation.activeModels.map(m => MODELS[m].name).join(', ')}\n`;
  markdown += `**Total Tokens:** ${conversation.totalTokens}\n`;
  markdown += `**Estimated Cost:** $${conversation.totalCost.toFixed(4)}\n\n`;
  markdown += `---\n\n`;
  
  conversation.messages.forEach(msg => {
    const timestamp = new Date(msg.timestamp).toLocaleTimeString();
    markdown += `### ${msg.name} (${timestamp})\n\n`;
    markdown += `${msg.content}\n\n`;
  });
  
  res.setHeader('Content-Type', 'text/markdown');
  res.setHeader('Content-Disposition', `attachment; filename="brainstorm-${conversation.id}.md"`);
  res.send(markdown);
});

// Get available models
app.get('/api/models', (req, res) => {
  res.json(MODELS);
});

// Get available templates
app.get('/api/templates', (req, res) => {
  res.json(TEMPLATES);
});

// Add reaction to message
app.post('/api/conversations/:id/messages/:messageId/reactions', (req, res) => {
  const conversation = conversations.get(req.params.id);
  if (!conversation) {
    return res.status(404).json({ error: 'Conversation not found' });
  }
  
  const message = conversation.messages.find(m => m.id === req.params.messageId);
  if (!message) {
    return res.status(404).json({ error: 'Message not found' });
  }
  
  const { emoji } = req.body;
  if (!message.reactions) message.reactions = {};
  message.reactions[emoji] = (message.reactions[emoji] || 0) + 1;
  
  broadcast({
    type: 'reaction',
    conversationId: conversation.id,
    messageId: message.id,
    reactions: message.reactions
  });
  
  res.json({ reactions: message.reactions });
});

// Vote on message
app.post('/api/conversations/:id/messages/:messageId/vote', (req, res) => {
  const conversation = conversations.get(req.params.id);
  if (!conversation) {
    return res.status(404).json({ error: 'Conversation not found' });
  }
  
  const message = conversation.messages.find(m => m.id === req.params.messageId);
  if (!message) {
    return res.status(404).json({ error: 'Message not found' });
  }
  
  const { value } = req.body; // 1 to 5 stars
  if (!message.votes) message.votes = [];
  message.votes.push(value);
  
  const avgVote = message.votes.reduce((a, b) => a + b, 0) / message.votes.length;
  
  broadcast({
    type: 'vote',
    conversationId: conversation.id,
    messageId: message.id,
    votes: message.votes,
    avgVote
  });
  
  res.json({ votes: message.votes, avgVote });
});

// Search messages
app.get('/api/conversations/:id/search', (req, res) => {
  const conversation = conversations.get(req.params.id);
  if (!conversation) {
    return res.status(404).json({ error: 'Conversation not found' });
  }
  
  const { query, model } = req.query;
  let results = conversation.messages;
  
  if (query) {
    results = results.filter(msg => 
      msg.content.toLowerCase().includes(query.toLowerCase())
    );
  }
  
  if (model) {
    results = results.filter(msg => msg.modelKey === model || msg.role === 'user');
  }
  
  res.json({ results, total: results.length });
});

// Analyze GitHub repository
app.post('/api/github/analyze', async (req, res) => {
  const { repo } = req.body; // e.g., "facebook/react" or full URL
  
  try {
    // Parse repo owner and name
    let owner, repoName;
    if (repo.includes('github.com')) {
      const match = repo.match(/github\.com\/([^\/]+)\/([^\/\s]+)/);
      if (match) {
        owner = match[1];
        repoName = match[2].replace(/\.git$/, '');
      }
    } else if (repo.includes('/')) {
      [owner, repoName] = repo.split('/');
    } else {
      return res.status(400).json({ error: 'Invalid repo format. Use "owner/repo" or GitHub URL' });
    }
    
    // Fetch repo data
    const [repoData, languages, readme, recentCommits, contributors] = await Promise.all([
      octokit.repos.get({ owner, repo: repoName }),
      octokit.repos.listLanguages({ owner, repo: repoName }),
      octokit.repos.getReadme({ owner, repo: repoName }).catch(() => null),
      octokit.repos.listCommits({ owner, repo: repoName, per_page: 10 }).catch(() => ({ data: [] })),
      octokit.repos.listContributors({ owner, repo: repoName, per_page: 10 }).catch(() => ({ data: [] }))
    ]);
    
    const repo_info = repoData.data;
    
    // Decode README if available
    let readmeContent = '';
    if (readme && readme.data.content) {
      readmeContent = Buffer.from(readme.data.content, 'base64').toString('utf-8');
      // Truncate if too long
      if (readmeContent.length > 3000) {
        readmeContent = readmeContent.substring(0, 3000) + '\n\n[README truncated for length...]';
      }
    }
    
    // Build analysis summary
    const analysis = {
      name: repo_info.full_name,
      description: repo_info.description,
      url: repo_info.html_url,
      stats: {
        stars: repo_info.stargazers_count,
        forks: repo_info.forks_count,
        watchers: repo_info.watchers_count,
        open_issues: repo_info.open_issues_count,
        size: repo_info.size
      },
      info: {
        language: repo_info.language,
        languages: Object.keys(languages.data),
        created: repo_info.created_at,
        updated: repo_info.updated_at,
        license: repo_info.license?.name || 'None',
        default_branch: repo_info.default_branch
      },
      activity: {
        recent_commits: recentCommits.data.length,
        last_commit: recentCommits.data[0]?.commit.message || 'N/A',
        contributors: contributors.data.length,
        top_contributors: contributors.data.slice(0, 5).map(c => c.login)
      },
      readme: readmeContent
    };
    
    res.json({ analysis });
    
  } catch (error) {
    console.error('GitHub API error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze repository',
      details: error.message,
      note: 'Make sure the repository exists and is public. For higher rate limits, add GITHUB_TOKEN to .env'
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    hasApiKey: !!OPENROUTER_API_KEY,
    hasGitHubToken: !!GITHUB_TOKEN
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket server ready`);
  
  if (!OPENROUTER_API_KEY) {
    console.warn('⚠️  Warning: OPENROUTER_API_KEY not set');
  }
});
