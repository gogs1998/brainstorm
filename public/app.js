// App State
let currentConversation = null;
let ws = null;
let models = {};
let templates = {};
let conversationHistory = []; // All saved conversations

// localStorage keys
const STORAGE_KEY = 'ai_brainstorm_conversations';
const CURRENT_CONVERSATION_KEY = 'ai_brainstorm_current_id';

// DOM Elements
const messagesContainer = document.getElementById('messagesContainer');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const newChatBtn = document.getElementById('newChatBtn');
const settingsBtn = document.getElementById('settingsBtn');
const modeSelect = document.getElementById('modeSelect');
const templateSelect = document.getElementById('templateSelect');
const temperatureSlider = document.getElementById('temperatureSlider');
const temperatureValue = document.getElementById('temperatureValue');
const personasPanel = document.getElementById('personasPanel');
const personaInputs = document.getElementById('personaInputs');
const interactBtn = document.getElementById('interactBtn');
const synthesizeBtn = document.getElementById('synthesizeBtn');
const exportBtn = document.getElementById('exportBtn');
const thinkingIndicators = document.getElementById('thinkingIndicators');
const synthesisModal = document.getElementById('synthesisModal');
const shortcutsModal = document.getElementById('shortcutsModal');
const settingsModal = document.getElementById('settingsModal');
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');
const messageCount = document.getElementById('messageCount');
const tokenCount = document.getElementById('tokenCount');
const costCount = document.getElementById('costCount');
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const stopBtn = document.getElementById('stopBtn');
const themeToggle = document.getElementById('themeToggle');

// Track if generation is in progress
let isGenerating = false;

// Theme preference
const THEME_KEY = 'ai_brainstorm_theme';
let currentTheme = localStorage.getItem(THEME_KEY) || 'dark';

// localStorage Functions
function loadConversationsFromStorage() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            conversationHistory = JSON.parse(stored);
            // Sort by last updated (most recent first)
            conversationHistory.sort((a, b) =>
                new Date(b.lastUpdated || b.createdAt) - new Date(a.lastUpdated || a.createdAt)
            );
        }
    } catch (error) {
        console.error('Error loading conversations from storage:', error);
        conversationHistory = [];
    }
}

function saveConversationToStorage(conversation) {
    try {
        // Add timestamp
        conversation.lastUpdated = new Date().toISOString();

        // Find existing conversation or add new one
        const existingIndex = conversationHistory.findIndex(c => c.id === conversation.id);
        if (existingIndex >= 0) {
            conversationHistory[existingIndex] = conversation;
        } else {
            conversationHistory.unshift(conversation);
        }

        // Limit to 50 most recent conversations
        if (conversationHistory.length > 50) {
            conversationHistory = conversationHistory.slice(0, 50);
        }

        // Save to localStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(conversationHistory));
        localStorage.setItem(CURRENT_CONVERSATION_KEY, conversation.id);

        // Update UI
        renderConversationsList();
    } catch (error) {
        console.error('Error saving conversation to storage:', error);
    }
}

function deleteConversationFromStorage(conversationId) {
    try {
        conversationHistory = conversationHistory.filter(c => c.id !== conversationId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(conversationHistory));
        renderConversationsList();

        // If we deleted the current conversation, create a new one
        if (currentConversation?.id === conversationId) {
            createNewConversation();
        }
    } catch (error) {
        console.error('Error deleting conversation:', error);
    }
}

function loadConversationFromStorage(conversationId) {
    const conversation = conversationHistory.find(c => c.id === conversationId);
    if (conversation) {
        currentConversation = conversation;
        localStorage.setItem(CURRENT_CONVERSATION_KEY, conversationId);
        renderConversation(conversation);
        renderConversationsList(); // Update active state
    }
}

function generateConversationTitle(conversation) {
    if (conversation.messages && conversation.messages.length > 0) {
        const firstUserMessage = conversation.messages.find(m => m.role === 'user');
        if (firstUserMessage) {
            // Take first 50 chars of first user message
            return firstUserMessage.content.substring(0, 50) + (firstUserMessage.content.length > 50 ? '...' : '');
        }
    }
    return 'New Conversation';
}

function renderConversationsList() {
    const conversationsList = document.getElementById('conversationsList');

    if (conversationHistory.length === 0) {
        conversationsList.innerHTML = '<div class="empty-state">No conversations yet</div>';
        return;
    }

    conversationsList.innerHTML = conversationHistory.map(conv => {
        const title = generateConversationTitle(conv);
        const isActive = currentConversation?.id === conv.id;
        const date = new Date(conv.lastUpdated || conv.createdAt).toLocaleDateString();
        const messageCount = conv.messages ? conv.messages.length : 0;

        return `
            <div class="conversation-item ${isActive ? 'active' : ''}" onclick="loadConversation('${conv.id}')">
                <div class="conversation-header">
                    <span class="conversation-title">${escapeHtml(title)}</span>
                    <button class="conversation-delete" onclick="event.stopPropagation(); deleteConversation('${conv.id}')" title="Delete">×</button>
                </div>
                <div class="conversation-meta">
                    <span>${messageCount} messages</span>
                    <span>•</span>
                    <span>${date}</span>
                </div>
            </div>
        `;
    }).join('');
}

function renderConversation(conversation) {
    // Clear current messages
    messagesContainer.innerHTML = '';

    // Update UI with conversation settings
    temperatureSlider.value = conversation.temperature || 0.7;
    temperatureValue.textContent = (conversation.temperature || 0.7).toFixed(1);
    modeSelect.value = conversation.mode || 'collaborate';

    // Update model toggles
    document.querySelectorAll('.model-toggle input').forEach(checkbox => {
        checkbox.checked = (conversation.activeModels || []).includes(checkbox.value);
    });

    // Render messages
    if (conversation.messages && conversation.messages.length > 0) {
        conversation.messages.forEach(message => {
            addMessageToUI(message);
        });
    } else {
        messagesContainer.innerHTML = generateWelcomeMessage();
    }

    // Update stats
    updateStats();

    messageInput.focus();
}

// Make functions available globally
// Note: window.loadConversation is set up in setupEventListeners to include mobile menu closing
window.deleteConversation = deleteConversationFromStorage;

// Theme functions
function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    themeToggle.textContent = theme === 'dark' ? '🌙' : '☀️';
    themeToggle.title = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
    currentTheme = theme;
    localStorage.setItem(THEME_KEY, theme);
}

function toggleTheme() {
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
}

// Initialize
async function init() {
    // Apply saved theme
    applyTheme(currentTheme);

    // Load conversations from storage
    loadConversationsFromStorage();

    // Load available models
    const modelsResponse = await fetch('/api/models');
    models = await modelsResponse.json();

    // Populate model toggles
    populateModelToggles();

    // Load available templates
    const templatesResponse = await fetch('/api/templates');
    templates = await templatesResponse.json();

    // Populate template selector
    populateTemplateSelector();

    // Setup WebSocket
    setupWebSocket();

    // Load last conversation or create new one
    const lastConvId = localStorage.getItem(CURRENT_CONVERSATION_KEY);
    if (lastConvId && conversationHistory.find(c => c.id === lastConvId)) {
        loadConversationFromStorage(lastConvId);
    } else {
        await createNewConversation();
    }

    // Render conversations list
    renderConversationsList();

    // Setup event listeners
    setupEventListeners();

    // Auto-resize textarea
    messageInput.addEventListener('input', autoResizeTextarea);

    // Setup keyboard shortcuts
    setupKeyboardShortcuts();
}

function populateModelToggles() {
    const modelToggles = document.getElementById('modelToggles');
    const modelEntries = Object.entries(models);
    
    // Sort: free models first, then by cost
    const sortedModels = modelEntries.sort((a, b) => {
        if (a[1].free && !b[1].free) return -1;
        if (!a[1].free && b[1].free) return 1;
        return 0;
    });
    
    modelToggles.innerHTML = sortedModels.map(([key, model]) => {
        // Default checked: claude and gpt5
        const checked = (key === 'claude' || key === 'gpt5') ? 'checked' : '';
        const costBadge = model.free ? '<span class="cost-badge free">FREE</span>' : 
                         `<span class="cost-badge">${model.cost}</span>`;
        
        return `
            <label class="model-toggle">
                <input type="checkbox" value="${key}" ${checked}>
                <span class="model-label">
                    <span class="avatar">${model.avatar}</span>
                    <span class="model-info">
                        <span class="model-name">${model.name}</span>
                        <span class="model-desc">${model.description}</span>
                    </span>
                    ${costBadge}
                </span>
            </label>
        `;
    }).join('');
    
    // Add event listeners after populating
    document.querySelectorAll('.model-toggle input').forEach(checkbox => {
        checkbox.addEventListener('change', updateActiveModels);
    });
}

function populateTemplateSelector() {
    templateSelect.innerHTML = '<option value="">Custom conversation</option>';
    Object.entries(templates).forEach(([key, template]) => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = `${template.icon} ${template.name}`;
        templateSelect.appendChild(option);
    });
}

function setupWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${window.location.host}`);
    
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
    };
    
    ws.onclose = () => {
        console.log('WebSocket disconnected');
        setTimeout(setupWebSocket, 3000);
    };
}

function handleWebSocketMessage(data) {
    if (data.conversationId !== currentConversation?.id) return;

    switch (data.type) {
        case 'stream':
            // Handle streaming chunks - update message in real-time
            updateStreamingMessage(data);
            isGenerating = true;
            stopBtn.classList.remove('hidden');
            break;
        case 'message':
            addMessageToUI(data.message);
            updateStats();
            // Save to localStorage after each message
            saveConversationToStorage(currentConversation);
            break;
        case 'thinking':
            addThinkingIndicator(data.model);
            isGenerating = true;
            stopBtn.classList.remove('hidden');
            break;
        case 'complete':
            clearThinkingIndicators();
            isGenerating = false;
            stopBtn.classList.add('hidden');
            break;
        case 'reaction':
            updateMessageReactions(data.messageId, data.reactions);
            break;
        case 'vote':
            updateMessageVote(data.messageId, data.avgVote);
            break;
    }
}

function setupEventListeners() {
    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Stop generation button
    stopBtn.addEventListener('click', () => {
        isGenerating = false;
        stopBtn.classList.add('hidden');
        clearThinkingIndicators();
        sendBtn.disabled = false;
        messageInput.disabled = false;
        messageInput.focus();
    });

    // Theme toggle button
    themeToggle.addEventListener('click', toggleTheme);

    // Mobile menu toggle
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            sidebarOverlay.classList.toggle('active');
        });

        sidebarOverlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            sidebarOverlay.classList.remove('active');
        });

        // Close sidebar when clicking on a conversation
        window.loadConversation = function(conversationId) {
            loadConversationFromStorage(conversationId);
            // Close mobile menu after selection
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('open');
                sidebarOverlay.classList.remove('active');
            }
        };
    }

    newChatBtn.addEventListener('click', () => {
        createNewConversation();
        // Close mobile menu after creating new conversation
        if (window.innerWidth <= 768) {
            sidebar.classList.remove('open');
            sidebarOverlay.classList.remove('active');
        }
    });
    
    modeSelect.addEventListener('change', (e) => {
        updateConversationMode(e.target.value);
    });
    
    templateSelect.addEventListener('change', (e) => {
        if (e.target.value) {
            applyTemplate(e.target.value);
        }
    });
    
    temperatureSlider.addEventListener('input', (e) => {
        const temp = parseFloat(e.target.value);
        temperatureValue.textContent = temp.toFixed(1);
        updateTemperature(temp);
    });
    
    interactBtn.addEventListener('click', () => {
        sendMessage("What do you think of each other's ideas? Any thoughts to build on or alternative perspectives?");
    });
    
    synthesizeBtn.addEventListener('click', synthesizeConversation);
    exportBtn.addEventListener('click', exportConversation);
    
    document.querySelector('.modal-close').addEventListener('click', () => {
        synthesisModal.classList.add('hidden');
    });
    
    document.querySelector('.modal-close-shortcuts').addEventListener('click', () => {
        shortcutsModal.classList.add('hidden');
    });

    // Settings modal
    settingsBtn.addEventListener('click', () => {
        settingsModal.classList.remove('hidden');
        populateModelsTab();
    });

    document.querySelector('.modal-close-settings').addEventListener('click', () => {
        settingsModal.classList.add('hidden');
    });

    synthesisModal.addEventListener('click', (e) => {
        if (e.target === synthesisModal) {
            synthesisModal.classList.add('hidden');
        }
    });

    shortcutsModal.addEventListener('click', (e) => {
        if (e.target === shortcutsModal) {
            shortcutsModal.classList.add('hidden');
        }
    });

    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            settingsModal.classList.add('hidden');
        }
    });

    // Settings tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;

            // Update active tab button
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Update active tab content
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            document.querySelector(`.tab-content[data-tab="${tab}"]`).classList.add('active');
        });
    });

    // Search functionality
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => performSearch(e.target.value), 300);
    });
}

function populateModelsTab() {
    const modelsList = document.getElementById('modelsList');
    const modelEntries = Object.entries(models);

    // Sort: free models first, then by cost
    const sortedModels = modelEntries.sort((a, b) => {
        if (a[1].free && !b[1].free) return -1;
        if (!a[1].free && b[1].free) return 1;
        return 0;
    });

    modelsList.innerHTML = sortedModels.map(([key, model]) => {
        const costBadge = model.free ? '<span class="cost-badge free">FREE</span>' :
                         `<span class="cost-badge">${model.cost}</span>`;

        return `
            <div class="model-card">
                <span class="avatar">${model.avatar}</span>
                <div class="model-info">
                    <div class="model-name">${model.name}</div>
                    <div class="model-desc">${model.description}</div>
                </div>
                ${costBadge}
            </div>
        `;
    }).join('');
}

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Cmd/Ctrl + K - Focus search
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            searchInput.focus();
        }
        
        // Cmd/Ctrl + N - New conversation
        if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
            e.preventDefault();
            createNewConversation();
        }
        
        // Cmd/Ctrl + I - Interact
        if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
            e.preventDefault();
            interactBtn.click();
        }
        
        // Cmd/Ctrl + S - Synthesize
        if ((e.metaKey || e.ctrlKey) && e.key === 's') {
            e.preventDefault();
            synthesizeBtn.click();
        }
        
        // Cmd/Ctrl + / - Show shortcuts
        if ((e.metaKey || e.ctrlKey) && e.key === '/') {
            e.preventDefault();
            shortcutsModal.classList.toggle('hidden');
        }
        
        // Esc - Close modals/clear search
        if (e.key === 'Escape') {
            synthesisModal.classList.add('hidden');
            shortcutsModal.classList.add('hidden');
            settingsModal.classList.add('hidden');
            searchInput.value = '';
            searchResults.classList.add('hidden');
        }
    });
}

async function createNewConversation() {
    const activeModels = getActiveModels();
    const mode = modeSelect.value;
    const template = templateSelect.value || null;
    
    const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activeModels, mode, template })
    });
    
    const data = await response.json();
    currentConversation = data.conversation;
    
    // Reset UI
    messagesContainer.innerHTML = generateWelcomeMessage();
    temperatureSlider.value = currentConversation.temperature;
    temperatureValue.textContent = currentConversation.temperature.toFixed(1);
    
    // If template was applied, show initial prompt
    if (template && templates[template]) {
        const tmpl = templates[template];
        messageInput.value = tmpl.initialPrompt;
        
        // Update model toggles
        document.querySelectorAll('.model-toggle input').forEach(checkbox => {
            checkbox.checked = tmpl.suggestedModels.includes(checkbox.value);
        });
        
        // Update mode
        modeSelect.value = tmpl.mode;
        if (tmpl.mode === 'personas') {
            personasPanel.classList.remove('hidden');
            renderPersonaInputs();
        }
    }
    
    updateStats();
    messageInput.focus();
}

async function applyTemplate(templateKey) {
    const template = templates[templateKey];
    if (!template) return;
    
    // Update models
    document.querySelectorAll('.model-toggle input').forEach(checkbox => {
        checkbox.checked = template.suggestedModels.includes(checkbox.value);
    });
    await updateActiveModels();
    
    // Update mode
    modeSelect.value = template.mode;
    await updateConversationMode(template.mode);
    
    // Set personas if applicable
    if (template.personas) {
        await fetch(`/api/conversations/${currentConversation.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ personas: template.personas })
        });
        currentConversation.personas = template.personas;
        if (template.mode === 'personas') {
            renderPersonaInputs();
        }
    }
    
    // Set initial prompt
    messageInput.value = template.initialPrompt;
    autoResizeTextarea();
}

function generateWelcomeMessage() {
    return `
        <div class="welcome-message">
            <h2>👋 Welcome to AI Brainstorm v2.1</h2>
            <p>Have collaborative discussions with multiple AI models at once.</p>
            <p>Models can see each other's responses and naturally build on ideas, disagree constructively, and ask each other questions.</p>
            <div class="welcome-tips">
                <h3>✨ Features:</h3>
                <ul>
                    <li><strong>🤖 9 AI Models:</strong> Including 2 FREE models (Qwen, Phi-3)</li>
                    <li><strong>📂 GitHub Integration:</strong> Analyze repos automatically</li>
                    <li><strong>🎭 Historical Figures:</strong> Chat with Einstein, Curie, da Vinci, etc.</li>
                    <li><strong>📝 8 Templates:</strong> Quick-start for common use cases</li>
                    <li><strong>👍 Reactions:</strong> React to messages with emoji</li>
                    <li><strong>⭐ Voting:</strong> Rate model responses</li>
                    <li><strong>🔍 Search:</strong> Find specific messages (Cmd+K)</li>
                    <li><strong>⌨️ Shortcuts:</strong> Press Cmd+/ to see all shortcuts</li>
                    <li><strong>🎚️ Temperature:</strong> Adjust creativity vs focus</li>
                </ul>
            </div>
        </div>
    `;
}

function getActiveModels() {
    return Array.from(document.querySelectorAll('.model-toggle input:checked'))
        .map(input => input.value);
}

async function updateActiveModels() {
    const activeModels = getActiveModels();
    
    if (activeModels.length === 0) {
        alert('Please select at least one model');
        return;
    }
    
    await fetch(`/api/conversations/${currentConversation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activeModels })
    });
    
    currentConversation.activeModels = activeModels;
    
    // Update persona inputs if in personas mode
    if (modeSelect.value === 'personas') {
        renderPersonaInputs();
    }
}

async function updateConversationMode(mode) {
    await fetch(`/api/conversations/${currentConversation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode })
    });
    
    currentConversation.mode = mode;
    
    if (mode === 'personas') {
        personasPanel.classList.remove('hidden');
        renderPersonaInputs();
    } else {
        personasPanel.classList.add('hidden');
    }
}

async function updateTemperature(temperature) {
    await fetch(`/api/conversations/${currentConversation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ temperature })
    });
    
    currentConversation.temperature = temperature;
}

function renderPersonaInputs() {
    const activeModels = getActiveModels();
    
    personaInputs.innerHTML = activeModels.map(modelKey => {
        const model = models[modelKey];
        return `
            <div class="persona-input">
                <label for="persona-${modelKey}">${model.avatar} ${model.name}</label>
                <input 
                    type="text" 
                    id="persona-${modelKey}" 
                    placeholder="e.g., Play devil's advocate"
                    value="${currentConversation.personas[modelKey] || ''}"
                />
            </div>
        `;
    }).join('');
    
    // Add event listeners
    activeModels.forEach(modelKey => {
        document.getElementById(`persona-${modelKey}`).addEventListener('change', async (e) => {
            const personas = { ...currentConversation.personas };
            personas[modelKey] = e.target.value;
            
            await fetch(`/api/conversations/${currentConversation.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ personas })
            });
            
            currentConversation.personas = personas;
        });
    });
}

async function sendMessage(customMessage = null) {
    // Handle if called as event handler
    if (customMessage && typeof customMessage === 'object' && customMessage.preventDefault) {
        customMessage = null;
    }

    const content = customMessage || messageInput.value.trim();

    if (!content) return;

    // Check if this is a GitHub repo analysis request
    if (currentConversation.template === 'github_repo' ||
        (typeof content === 'string' && content.match(/github\.com\/[^\/\s]+\/[^\/\s]+/)) ||
        (typeof content === 'string' && content.match(/^[a-zA-Z0-9-_]+\/[a-zA-Z0-9-_]+$/))) {
        
        // Extract repo identifier
        let repoMatch = content.match(/github\.com\/([^\/\s]+\/[^\/\s]+)/);
        if (!repoMatch) {
            repoMatch = content.match(/^([a-zA-Z0-9-_]+\/[a-zA-Z0-9-_]+)$/);
        }
        
        if (repoMatch) {
            const repo = repoMatch[1] || repoMatch[0];
            
            // Show analyzing indicator
            const analyzingMsg = {
                id: 'analyzing-' + Date.now(),
                role: 'system',
                content: `🔍 Analyzing GitHub repository: ${repo}...`,
                name: 'System',
                timestamp: new Date()
            };
            addMessageToUI(analyzingMsg);
            
            try {
                // Fetch GitHub analysis
                const response = await fetch('/api/github/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ repo })
                });
                
                if (response.ok) {
                    const { analysis } = await response.json();
                    
                    // Remove analyzing message
                    const analyzingDiv = document.querySelector(`[data-message-id="${analyzingMsg.id}"]`);
                    if (analyzingDiv) analyzingDiv.remove();
                    
                    // Build context message for the models
                    const contextMessage = `GitHub Repository Analysis: ${analysis.name}

**Description:** ${analysis.description || 'No description'}

**Statistics:**
- ⭐ Stars: ${analysis.stats.stars.toLocaleString()}
- 🔱 Forks: ${analysis.stats.forks.toLocaleString()}
- 👀 Watchers: ${analysis.stats.watchers.toLocaleString()}
- 🐛 Open Issues: ${analysis.stats.open_issues.toLocaleString()}

**Details:**
- Primary Language: ${analysis.info.language}
- Languages: ${analysis.info.languages.join(', ')}
- License: ${analysis.info.license}
- Created: ${new Date(analysis.info.created).toLocaleDateString()}
- Last Updated: ${new Date(analysis.info.updated).toLocaleDateString()}

**Activity:**
- Contributors: ${analysis.activity.contributors}
- Top Contributors: ${analysis.activity.top_contributors.join(', ')}
- Recent Commits: ${analysis.activity.recent_commits}
- Last Commit: ${analysis.activity.last_commit}

**README Preview:**
${analysis.readme ? analysis.readme : 'No README found'}

---

Now please provide your analysis of this repository.`;
                    
                    // Send the enriched content
                    await fetch(`/api/conversations/${currentConversation.id}/messages`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ content: contextMessage })
                    });
                    
                    if (!customMessage) {
                        messageInput.value = '';
                        autoResizeTextarea();
                    }
                    
                    sendBtn.disabled = false;
                    messageInput.disabled = false;
                    messageInput.focus();
                    return;
                } else {
                    const error = await response.json();
                    
                    // Remove analyzing message
                    const analyzingDiv = document.querySelector(`[data-message-id="${analyzingMsg.id}"]`);
                    if (analyzingDiv) analyzingDiv.remove();
                    
                    const errorMsg = {
                        id: 'error-' + Date.now(),
                        role: 'system',
                        content: `❌ Error analyzing repository: ${error.details || error.error}\n\n${error.note || ''}`,
                        name: 'System',
                        timestamp: new Date()
                    };
                    addMessageToUI(errorMsg);
                }
            } catch (err) {
                console.error('GitHub analysis error:', err);
            }
        }
    }
    
    // Clear input
    if (!customMessage) {
        messageInput.value = '';
        autoResizeTextarea();
    }
    
    // Disable input while processing
    sendBtn.disabled = true;
    messageInput.disabled = true;
    
    try {
        await fetch(`/api/conversations/${currentConversation.id}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content })
        });
    } finally {
        sendBtn.disabled = false;
        messageInput.disabled = false;
        messageInput.focus();
    }
}

function updateStreamingMessage(data) {
    const { messageId, modelKey, content, isComplete } = data;

    // Remove welcome message if it exists
    const welcome = messagesContainer.querySelector('.welcome-message');
    if (welcome) welcome.remove();

    // Check if message div already exists
    let messageDiv = document.querySelector(`[data-message-id="${messageId}"]`);

    if (!messageDiv) {
        // Create new message div for first chunk
        messageDiv = document.createElement('div');
        messageDiv.className = `message ${modelKey}`;
        messageDiv.dataset.messageId = messageId;

        const model = models[modelKey];
        const avatar = model?.avatar || '🤖';
        const time = new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });

        messageDiv.innerHTML = `
            <div class="message-avatar">${avatar}</div>
            <div class="message-content">
                <div class="message-header">
                    <span class="message-name">${model.name}</span>
                    <span class="message-time">${time}</span>
                </div>
                <div class="message-text"></div>
                ${!isComplete ? '<div class="streaming-cursor">▊</div>' : ''}
                <div class="message-reactions" data-message-id="${messageId}"></div>
            </div>
        `;

        messagesContainer.appendChild(messageDiv);

        // Remove the thinking indicator for this model
        const thinkingIndicator = thinkingIndicators.querySelector(`[data-model="${modelKey}"]`);
        if (thinkingIndicator) thinkingIndicator.remove();
    }

    // Update the message text
    const messageText = messageDiv.querySelector('.message-text');
    if (messageText) {
        // Render markdown if available
        const renderedContent = typeof marked !== 'undefined'
            ? marked.parse(content)
            : escapeHtml(content);
        messageText.innerHTML = renderedContent;
    }

    // If complete, add interaction buttons and save to conversation
    if (isComplete) {
        // Remove streaming cursor
        const cursor = messageDiv.querySelector('.streaming-cursor');
        if (cursor) cursor.remove();

        // Add reaction and voting UI
        const messageContent = messageDiv.querySelector('.message-content');
        const model = models[modelKey];

        if (!messageContent.querySelector('.reaction-picker')) {
            messageContent.innerHTML += `
                <div class="reaction-picker">
                    <button class="reaction-btn" onclick="addReaction('${messageId}', '👍')">👍</button>
                    <button class="reaction-btn" onclick="addReaction('${messageId}', '❤️')">❤️</button>
                    <button class="reaction-btn" onclick="addReaction('${messageId}', '💡')">💡</button>
                    <button class="reaction-btn" onclick="addReaction('${messageId}', '🔥')">🔥</button>
                    <button class="reaction-btn" onclick="addReaction('${messageId}', '👎')">👎</button>
                </div>
                <div class="message-vote">
                    Rate this response:
                    <span class="vote-stars">
                        ${[1, 2, 3, 4, 5].map(n =>
                            `<span class="vote-star" onclick="voteMessage('${messageId}', ${n})">⭐</span>`
                        ).join('')}
                    </span>
                </div>
            `;
        }

        // Add the complete message to conversation history
        const assistantMessage = {
            id: messageId,
            role: 'assistant',
            content: content,
            name: model.name,
            modelKey: modelKey,
            timestamp: new Date(),
            reactions: {},
            votes: 0
        };

        // Only add if not already in conversation (to prevent duplicates)
        if (!currentConversation.messages.find(m => m.id === messageId)) {
            currentConversation.messages.push(assistantMessage);
            saveConversationToStorage(currentConversation);
            updateStats();
        }
    }

    // Auto-scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function addMessageToUI(message) {
    // Check if message already exists (prevent duplicates)
    const existing = document.querySelector(`[data-message-id="${message.id}"]`);
    if (existing) return;

    // Remove welcome message if it exists
    const welcome = messagesContainer.querySelector('.welcome-message');
    if (welcome) welcome.remove();

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.role === 'user' ? 'user' : message.modelKey || 'assistant'}`;
    messageDiv.dataset.messageId = message.id;

    const time = new Date(message.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    });

    const model = message.modelKey ? models[message.modelKey] : null;
    const avatar = message.role === 'user' ? '👤' : (model?.avatar || '🤖');

    // Render markdown if available
    const content = typeof marked !== 'undefined'
        ? marked.parse(message.content)
        : escapeHtml(message.content);

    messageDiv.innerHTML = `
        <div class="message-avatar">${avatar}</div>
        <div class="message-content">
            <div class="message-header">
                <span class="message-name">${message.name}</span>
                <span class="message-time">${time}</span>
            </div>
            <div class="message-text">${content}</div>
            <div class="message-actions">
                <button class="action-btn copy-btn" onclick="copyMessage('${message.id}')" title="Copy message">
                    📋 Copy
                </button>
                ${message.role !== 'user' ? `
                    <button class="action-btn regenerate-btn" onclick="regenerateResponse()" title="Regenerate all responses">
                        🔄 Regenerate
                    </button>
                ` : ''}
            </div>
            <div class="message-reactions" data-message-id="${message.id}">
                ${renderReactions(message.reactions || {})}
            </div>
            ${message.role !== 'user' ? `
                <div class="reaction-picker">
                    <button class="reaction-btn" onclick="addReaction('${message.id}', '👍')">👍</button>
                    <button class="reaction-btn" onclick="addReaction('${message.id}', '❤️')">❤️</button>
                    <button class="reaction-btn" onclick="addReaction('${message.id}', '💡')">💡</button>
                    <button class="reaction-btn" onclick="addReaction('${message.id}', '🔥')">🔥</button>
                    <button class="reaction-btn" onclick="addReaction('${message.id}', '👎')">👎</button>
                </div>
                <div class="message-vote">
                    Rate this response:
                    <span class="vote-stars">
                        ${[1, 2, 3, 4, 5].map(n =>
                            `<span class="vote-star" onclick="voteMessage('${message.id}', ${n})">⭐</span>`
                        ).join('')}
                    </span>
                    ${message.votes > 0 ? `<span>(Avg: ${message.votes.toFixed(1)})</span>` : ''}
                </div>
            ` : ''}
        </div>
    `;

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function renderReactions(reactions) {
    return Object.entries(reactions)
        .map(([emoji, count]) => `
            <div class="reaction">
                <span>${emoji}</span>
                <span class="reaction-count">${count}</span>
            </div>
        `)
        .join('');
}

async function addReaction(messageId, emoji) {
    await fetch(`/api/conversations/${currentConversation.id}/messages/${messageId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji })
    });
}

function updateMessageReactions(messageId, reactions) {
    const reactionsDiv = document.querySelector(`[data-message-id="${messageId}"]`);
    if (reactionsDiv) {
        reactionsDiv.innerHTML = renderReactions(reactions);
    }
}

async function voteMessage(messageId, value) {
    await fetch(`/api/conversations/${currentConversation.id}/messages/${messageId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value })
    });
}

function updateMessageVote(messageId, avgVote) {
    const messageDiv = document.querySelector(`[data-message-id="${messageId}"]`);
    if (messageDiv) {
        const voteSpan = messageDiv.querySelector('.message-vote span:last-child');
        if (voteSpan) {
            voteSpan.textContent = `(Avg: ${avgVote.toFixed(1)})`;
        }
    }
}

async function performSearch(query) {
    if (!query.trim()) {
        searchResults.classList.add('hidden');
        return;
    }
    
    const response = await fetch(
        `/api/conversations/${currentConversation.id}/search?query=${encodeURIComponent(query)}`
    );
    const data = await response.json();
    
    if (data.results.length === 0) {
        searchResults.innerHTML = '<div style="padding: 12px; text-align: center; color: var(--text-secondary);">No results found</div>';
    } else {
        searchResults.innerHTML = data.results.map(msg => `
            <div class="search-result-item" onclick="scrollToMessage('${msg.id}')">
                <div class="search-result-name">${msg.name}</div>
                <div class="search-result-content">${msg.content.substring(0, 100)}...</div>
            </div>
        `).join('');
    }
    
    searchResults.classList.remove('hidden');
}

function scrollToMessage(messageId) {
    const messageDiv = document.querySelector(`[data-message-id="${messageId}"]`);
    if (messageDiv) {
        messageDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
        messageDiv.style.animation = 'none';
        setTimeout(() => {
            messageDiv.style.animation = 'highlight 1s';
        }, 10);
    }
}

function addThinkingIndicator(modelKey) {
    const model = models[modelKey];
    const indicator = document.createElement('div');
    indicator.className = 'thinking-indicator';
    indicator.dataset.model = modelKey;
    indicator.innerHTML = `${model.avatar} ${model.name} is thinking...`;
    thinkingIndicators.appendChild(indicator);
}

function clearThinkingIndicators() {
    thinkingIndicators.innerHTML = '';
}

async function synthesizeConversation() {
    if (!currentConversation || currentConversation.messages.length === 0) {
        alert('No conversation to synthesize');
        return;
    }
    
    synthesisModal.classList.remove('hidden');
    document.getElementById('synthesisContent').innerHTML = '<div class="loading">Synthesizing conversation...</div>';
    
    const response = await fetch(`/api/conversations/${currentConversation.id}/synthesize`, {
        method: 'POST'
    });
    
    const data = await response.json();
    
    if (data.synthesis) {
        const content = typeof marked !== 'undefined' 
            ? marked.parse(data.synthesis)
            : escapeHtml(data.synthesis);
        document.getElementById('synthesisContent').innerHTML = 
            `<div class="message-text">${content}</div>`;
    } else {
        document.getElementById('synthesisContent').innerHTML = 
            '<div class="error">Failed to generate synthesis</div>';
    }
}

async function exportConversation() {
    if (!currentConversation) return;
    
    window.open(`/api/conversations/${currentConversation.id}/export`, '_blank');
}

async function updateStats() {
    if (!currentConversation) return;
    
    const response = await fetch(`/api/conversations/${currentConversation.id}`);
    const data = await response.json();
    
    currentConversation = data;
    
    messageCount.textContent = data.messages.length;
    tokenCount.textContent = data.totalTokens.toLocaleString();
    costCount.textContent = `$${data.totalCost.toFixed(4)}`;
}

function autoResizeTextarea() {
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 150) + 'px';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML.replace(/\n/g, '<br>');
}

// Copy message to clipboard
async function copyMessage(messageId) {
    const message = currentConversation.messages.find(m => m.id === messageId);
    if (!message) return;

    try {
        await navigator.clipboard.writeText(message.content);

        // Visual feedback
        const btn = document.querySelector(`[data-message-id="${messageId}"] .copy-btn`);
        if (btn) {
            const originalText = btn.textContent;
            btn.textContent = '✓ Copied!';
            btn.style.color = 'var(--secondary)';
            setTimeout(() => {
                btn.textContent = originalText;
                btn.style.color = '';
            }, 2000);
        }
    } catch (err) {
        console.error('Failed to copy:', err);
        alert('Failed to copy message');
    }
}

// Regenerate response - resend the last user message
async function regenerateResponse() {
    if (!currentConversation || currentConversation.messages.length === 0) {
        return;
    }

    // Find the last user message
    const lastUserMessage = [...currentConversation.messages]
        .reverse()
        .find(m => m.role === 'user');

    if (!lastUserMessage) {
        alert('No user message to regenerate from');
        return;
    }

    // Remove all messages after the last user message
    const userMessageIndex = currentConversation.messages.findIndex(m => m.id === lastUserMessage.id);
    const messagesToKeep = currentConversation.messages.slice(0, userMessageIndex + 1);

    // Update conversation
    currentConversation.messages = messagesToKeep;
    saveConversationToStorage(currentConversation);

    // Re-render messages
    messagesContainer.innerHTML = '';
    messagesToKeep.forEach(msg => addMessageToUI(msg));

    // Resend the last user message
    sendBtn.disabled = true;
    messageInput.disabled = true;

    try {
        await fetch(`/api/conversations/${currentConversation.id}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: lastUserMessage.content })
        });
    } finally {
        sendBtn.disabled = false;
        messageInput.disabled = false;
        messageInput.focus();
    }
}

// Make functions available globally for onclick handlers
window.addReaction = addReaction;
window.voteMessage = voteMessage;
window.scrollToMessage = scrollToMessage;
window.copyMessage = copyMessage;
window.regenerateResponse = regenerateResponse;

// Add highlight animation to CSS dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes highlight {
        0%, 100% { background: transparent; }
        50% { background: var(--primary); opacity: 0.2; }
    }
`;
document.head.appendChild(style);

// Initialize app
init();
