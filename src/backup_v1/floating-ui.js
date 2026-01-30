// Aura Web Co-Pilot - Floating UI Implementation

(function () {
  // Prevent multiple injections
  if (window.__aura_ui_injected) return;
  window.__aura_ui_injected = true;

  // Only inject on allowed protocols (http, https, file)
  const allowedProtocols = ['http:', 'https:', 'file:'];
  if (!allowedProtocols.includes(window.location.protocol)) return;

  // Global protection against removal
  function setupGlobalProtection() {
    // Backup original removeChild method
    const originalRemoveChild = Node.prototype.removeChild;
    
    // Override removeChild to protect our elements
    Node.prototype.removeChild = function(child) {
      if (child && (child.hasAttribute?.('data-aura-protected') || 
                   child.classList?.contains('aura-ui') ||
                   child.classList?.contains('aura-sidebar') ||
                   child.classList?.contains('aura-window'))) {
        console.warn('🛡️ Blocked attempt to remove protected Aura UI element');
        return child; // Return the element but don't remove it
      }
      return originalRemoveChild.call(this, child);
    };
    
    // Also protect against innerHTML clearing
    const originalInnerHTML = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
    if (originalInnerHTML) {
      Object.defineProperty(Element.prototype, 'innerHTML', {
        set: function(value) {
          // If this element contains protected elements, preserve them
          if (this === document.body) {
            const protectedElements = this.querySelectorAll('[data-aura-protected="true"]');
            originalInnerHTML.set.call(this, value);
            // Re-add protected elements
            protectedElements.forEach(el => {
              if (!this.contains(el)) {
                this.appendChild(el);
              }
            });
          } else {
            originalInnerHTML.set.call(this, value);
          }
        },
        get: originalInnerHTML.get,
        configurable: true
      });
    }
  }

  // ===== Create UI Elements =====
  function createAuraUI() {
    console.log('🛠️ Creating Aura UI elements...');
    
    // Check if elements already exist
    const existingSidebar = document.querySelector('.aura-sidebar');
    const existingWindow = document.querySelector('.aura-window');
    
    if (existingSidebar) {
      console.log('⚠️ Sidebar already exists, removing old one');
      existingSidebar.remove();
    }
    
    if (existingWindow) {
      console.log('⚠️ Window already exists, removing old one');
      existingWindow.remove();
    }
    // Sidebar (draggable)
    const sidebar = document.createElement('div');
    sidebar.className = 'aura-ui aura-sidebar';
    sidebar.setAttribute('data-aura-ui', 'sidebar');
    sidebar.setAttribute('data-aura-protected', 'true');
    sidebar.innerHTML = `
      <div class="aura-logo">
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="auraSwooshGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#C4B5FD" />
              <stop offset="100%" stop-color="#A855F7" />
            </linearGradient>
            <filter id="auraSwooshGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <g stroke="rgba(255,255,255,0.7)" stroke-width="1.5">
            <path d="M 50 10 L 5 85" />
            <path d="M 50 10 L 95 85" />
            <path d="M 50 10 L 30 85" />
            <path d="M 50 10 L 70 85" />
          </g>
          <g filter="url(#auraSwooshGlow)">
            <path d="M 15 65 Q 50 45, 85 65 L 80 55 Q 50 38, 20 55 Z" fill="url(#auraSwooshGradient)"/>
            <path d="M 25 72 Q 50 55, 75 72 L 70 62 Q 50 48, 30 62 Z" fill="url(#auraSwooshGradient)" opacity="0.7"/>
          </g>
        </svg>
      </div>
      <div class="aura-status" id="aura-status">Idle</div>
      <div class="aura-controls">
        <button class="aura-control-btn" id="aura-toggle-window" title="Toggle Assistant">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </button>
      </div>
    `;
    document.body.appendChild(sidebar);
    console.log('🎆 Sidebar added to DOM');
    
    // Verify sidebar is actually in DOM
    if (!document.body.contains(sidebar)) {
      console.error('❌ Sidebar not in DOM after appendChild!');
    }

    // Main Window
    const window = document.createElement('div');
    window.className = 'aura-ui aura-window';
    window.id = 'aura-window';
    window.setAttribute('data-aura-ui', 'window');
    window.setAttribute('data-aura-protected', 'true');
    window.innerHTML = `
      <div class="aura-window-drag-handle" id="aura-window-drag-handle">
        <div class="aura-aurora">
          <div class="aura-aurora-shape aura-aurora-shape1"></div>
          <div class="aura-aurora-shape aura-aurora-shape2"></div>
          <div class="aura-aurora-shape aura-aurora-shape3"></div>
        </div>
        <div class="aura-window-header">
          <div class="aura-window-title">
            <h3>Aura Co-Pilot</h3>
            <div id="aura-thinking" style="display: none;" class="aura-thinking">
              <span class="aura-thinking-dot"></span>
              <span class="aura-thinking-dot"></span>
              <span class="aura-thinking-dot"></span>
            </div>
          </div>
          <button class="aura-window-close" id="aura-window-close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 6L6 18M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      </div>
      <div class="aura-chat-history" id="aura-chat-history"></div>
      <div class="aura-input-area">
        <div class="aura-input-container">
          <button class="aura-mic-btn" id="aura-mic-btn" title="Voice input">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
              <line x1="12" y1="19" x2="12" y2="23"></line>
              <line x1="8" y1="23" x2="16" y2="23"></line>
            </svg>
          </button>
          <textarea 
            class="aura-textarea" 
            id="aura-textarea" 
            placeholder="Type or Speak a task ..."
            rows="1"
          ></textarea>
          <button class="aura-send-btn" id="aura-send-btn" title="Execute task">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(window);
    console.log('🎆 Window added to DOM');
    
    // Verify window is actually in DOM
    if (!document.body.contains(window)) {
      console.error('❌ Window not in DOM after appendChild!');
    }

    // Set default positions directly - sidebar on left side, always visible
    sidebar.style.setProperty('left', '20px', 'important');
    sidebar.style.setProperty('top', '50%', 'important');
    sidebar.style.setProperty('transform', 'translateY(-50%)', 'important');
    sidebar.style.setProperty('position', 'fixed', 'important');
    sidebar.style.setProperty('z-index', '999998', 'important');
    
    // Force critical visibility styles
    sidebar.style.setProperty('display', 'flex', 'important');
    sidebar.style.setProperty('visibility', 'visible', 'important');
    sidebar.style.setProperty('opacity', '1', 'important');
    sidebar.style.setProperty('pointer-events', 'auto', 'important');
    
    // Ensure sidebar is always on top and visible
    sidebar.style.setProperty('width', '60px', 'important');
    sidebar.style.setProperty('height', 'auto', 'important');
    sidebar.style.setProperty('background', 'rgba(17, 24, 39, 0.95)', 'important');
    sidebar.style.setProperty('backdrop-filter', 'blur(20px)', 'important');
    sidebar.style.setProperty('border-radius', '16px', 'important');
    sidebar.style.setProperty('border', '1px solid rgba(255, 255, 255, 0.1)', 'important');

    // Set window position with important declarations
    window.style.setProperty('right', '30px', 'important');
    window.style.setProperty('bottom', '30px', 'important');
    window.style.setProperty('left', 'auto', 'important');
    window.style.setProperty('top', 'auto', 'important');
    
    // Add protection against style manipulation
    window.style.setProperty('position', 'fixed', 'important');
    window.style.setProperty('z-index', '999997', 'important');
    window.style.setProperty('pointer-events', 'auto', 'important');
    
    // Force immediate visibility
    sidebar.style.setProperty('display', 'flex', 'important');
    sidebar.style.setProperty('visibility', 'visible', 'important');
    sidebar.style.setProperty('opacity', '1', 'important');
    
    window.style.setProperty('display', 'block', 'important');
    window.style.setProperty('visibility', 'visible', 'important');
    window.style.setProperty('opacity', '1', 'important');
    
    // Lock critical properties to prevent tampering
    const lockElementProperties = (element) => {
      try {
        // Create a backup of the original remove method
        const originalRemove = element.remove.bind(element);
        
        // Override remove method to prevent deletion
        Object.defineProperty(element, 'remove', {
          value: function() {
            console.warn('🛡️ Attempt to remove Aura UI element blocked!');
            return false;
          },
          writable: false,
          configurable: false
        });
        
        // Protect parent node removeChild
        const originalRemoveChild = Node.prototype.removeChild;
        
        // Make the element non-deletable by marking it as protected
        element.setAttribute('data-aura-protected', 'true');
        element.setAttribute('data-critical-ui', 'true');
      } catch (e) {
        console.log('⚠️ Could not lock all properties:', e.message);
      }
    };
    
    lockElementProperties(sidebar);
    lockElementProperties(window);

    return {
      sidebar,
      window,
      elements: {
        status: document.getElementById('aura-status'),
        toggleWindow: document.getElementById('aura-toggle-window'),
        closeWindow: document.getElementById('aura-window-close'),
        chatHistory: document.getElementById('aura-chat-history'),
        textarea: document.getElementById('aura-textarea'),
        sendBtn: document.getElementById('aura-send-btn'),
        micBtn: document.getElementById('aura-mic-btn'),
        thinking: document.getElementById('aura-thinking'),
        dragHandle: document.getElementById('aura-window-drag-handle')
      }
    };
  }

  // ===== Core Functionality =====
  class AuraUI {
    constructor() {
      this.ui = createAuraUI();
      this.isWindowVisible = false;
      this.isRunning = false;
      this.isListening = false;
      this.recognition = null;
      this.chatHistory = []; // Store chat history

      // Initialize UI
      this.initDraggableSidebar();
      this.initDraggableWindow();
      this.initEventListeners();
      this.initSpeechRecognition();
      this.setupAutoResize();

      // Load persistent state and history
      this.loadPersistentState();
      
      // Set up protection against element removal - CRITICAL!
      this.setupDOMProtection();
      
      // Force visibility and protection
      this.enforceUIVisibility();
      
      // Make sidebar immediately visible for debugging
      console.log('👀 Making sidebar visible immediately');
      this.ui.sidebar.style.setProperty('display', 'flex', 'important');
      this.ui.sidebar.style.setProperty('visibility', 'visible', 'important');
      this.ui.sidebar.style.setProperty('opacity', '1', 'important');
      
      // Debug sidebar position and visibility
      setTimeout(() => {
        const rect = this.ui.sidebar.getBoundingClientRect();
        const computedStyle = getComputedStyle(this.ui.sidebar);
        console.log('🔍 Sidebar debug info:', {
          inDOM: document.body.contains(this.ui.sidebar),
          rect: rect,
          computed: {
            display: computedStyle.display,
            visibility: computedStyle.visibility,
            opacity: computedStyle.opacity,
            position: computedStyle.position,
            left: computedStyle.left,
            top: computedStyle.top,
            zIndex: computedStyle.zIndex
          }
        });
      }, 100);
    }

    // Fixed draggable sidebar implementation
    initDraggableSidebar() {
      const sidebar = this.ui.sidebar;

      let isDragging = false;
      let startX, startY, initialLeft, initialTop;

      const mouseDownHandler = (e) => {
        // Prevent default to avoid text selection
        e.preventDefault();

        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;

        const rect = sidebar.getBoundingClientRect();
        initialLeft = rect.left;
        initialTop = rect.top;

        sidebar.style.cursor = 'grabbing';

        // Add event listeners for move and up
        document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('mouseup', mouseUpHandler);
      };

      const mouseMoveHandler = (e) => {
        if (!isDragging) return;

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        const newLeft = initialLeft + dx;
        const newTop = initialTop + dy;

        // Ensure sidebar stays within viewport
        const maxX = window.innerWidth - sidebar.offsetWidth;
        const maxY = window.innerHeight - sidebar.offsetHeight;

        sidebar.style.left = Math.max(0, Math.min(newLeft, maxX)) + 'px';
        sidebar.style.top = Math.max(0, Math.min(newTop, maxY)) + 'px';
        sidebar.style.right = 'auto';
        sidebar.style.bottom = 'auto';
        sidebar.style.transform = 'none';
      };

      const mouseUpHandler = () => {
        isDragging = false;
        sidebar.style.cursor = 'grab';

        // Remove event listeners
        document.removeEventListener('mousemove', mouseMoveHandler);
        document.removeEventListener('mouseup', mouseUpHandler);

        // Save position to local storage
        try {
          chrome.storage.local.set({
            auraSidebarPos: {
              left: sidebar.style.left,
              top: sidebar.style.top
            }
          });
        } catch (e) {
          console.log('Could not save sidebar position');
        }
      };

      // Add mousedown event listener to sidebar
      sidebar.addEventListener('mousedown', mouseDownHandler);

      // Load saved position from chrome.storage (persistent across all pages)
      try {
        chrome.storage.local.get('auraSidebarPos', (result) => {
          if (result.auraSidebarPos) {
            console.log('📍 Loading saved sidebar position:', result.auraSidebarPos);
            sidebar.style.setProperty('left', result.auraSidebarPos.left, 'important');
            sidebar.style.setProperty('top', result.auraSidebarPos.top, 'important');
            sidebar.style.setProperty('transform', 'none', 'important');
          } else {
            console.log('📍 Using default sidebar position');
            // Default position: left center
            sidebar.style.setProperty('left', '20px', 'important');
            sidebar.style.setProperty('top', '50%', 'important');
            sidebar.style.setProperty('transform', 'translateY(-50%)', 'important');
          }
        });
      } catch (e) {
        console.log('⚠️ Could not load sidebar position, using default');
        sidebar.style.setProperty('left', '20px', 'important');
        sidebar.style.setProperty('top', '50%', 'important');
        sidebar.style.setProperty('transform', 'translateY(-50%)', 'important');
      }
    }

    // Fixed draggable window implementation
    initDraggableWindow() {
      const window = this.ui.window;
      const dragHandle = this.ui.elements.dragHandle;

      if (!window || !dragHandle) return;

      let isDragging = false;
      let startX, startY, initialLeft, initialTop;

      const mouseDownHandler = (e) => {
        // Only handle left mouse button clicks directly on the drag handle or header
        if (e.button !== 0) return;

        // Verify click target is the handle or direct child elements
        const isHeader = e.target === dragHandle ||
          e.target.closest('.aura-window-header') === dragHandle.querySelector('.aura-window-header');

        if (!isHeader) return;

        // Don't drag if clicking close button
        if (e.target.closest('.aura-window-close')) return;

        e.preventDefault();
        e.stopPropagation();

        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;

        const rect = window.getBoundingClientRect();
        initialLeft = rect.left;
        initialTop = rect.top;

        dragHandle.style.cursor = 'grabbing';

        // Add event listeners for move and up
        document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('mouseup', mouseUpHandler);
      };

      const mouseMoveHandler = (e) => {
        if (!isDragging) return;

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        const newLeft = initialLeft + dx;
        const newTop = initialTop + dy;

        // Ensure window stays within viewport
        const maxX = window.innerWidth - window.offsetWidth;
        const maxY = window.innerHeight - window.offsetHeight;

        window.style.left = Math.max(0, Math.min(newLeft, maxX)) + 'px';
        window.style.top = Math.max(0, Math.min(newTop, maxY)) + 'px';
        window.style.right = 'auto';
        window.style.bottom = 'auto';
      };

      const mouseUpHandler = () => {
        isDragging = false;
        dragHandle.style.cursor = '';

        // Remove event listeners
        document.removeEventListener('mousemove', mouseMoveHandler);
        document.removeEventListener('mouseup', mouseUpHandler);

        // Save position to local storage
        try {
          chrome.storage.local.set({
            auraWindowPos: {
              left: window.style.left,
              top: window.style.top
            }
          });
        } catch (e) {
          console.log('Could not save window position');
        }
      };

      // Add mousedown event listener to drag handle
      dragHandle.addEventListener('mousedown', mouseDownHandler);

      // Load saved position and state from chrome.storage (persistent across all pages)
      try {
        chrome.storage.local.get(['auraWindowPos', 'auraWindowVisible', 'auraChatHistory'], (result) => {
          // Restore window position
          if (result.auraWindowPos && 
              result.auraWindowPos.left !== 'auto' && 
              result.auraWindowPos.top !== 'auto') {
            console.log('📍 Loading saved window position:', result.auraWindowPos);
            window.style.setProperty('left', result.auraWindowPos.left, 'important');
            window.style.setProperty('top', result.auraWindowPos.top, 'important');
            window.style.setProperty('right', 'auto', 'important');
            window.style.setProperty('bottom', 'auto', 'important');
          } else {
            // Default position: bottom-right
            window.style.setProperty('right', '30px', 'important');
            window.style.setProperty('bottom', '30px', 'important');
            window.style.setProperty('left', 'auto', 'important');
            window.style.setProperty('top', 'auto', 'important');
          }
          
          // Restore window visibility state
          if (result.auraWindowVisible) {
            console.log('📍 Restoring window visibility');
            setTimeout(() => {
              window.classList.add('visible');
            }, 300);
          }
          
          // Restore chat history
          if (result.auraChatHistory && result.auraChatHistory.length > 0) {
            console.log('💬 Restoring chat history:', result.auraChatHistory.length, 'messages');
            this.restoreChatHistory(result.auraChatHistory);
          }
        });
      } catch (e) {
        console.log('⚠️ Could not load window state, using defaults');
        window.style.setProperty('right', '30px', 'important');
        window.style.setProperty('bottom', '30px', 'important');
        window.style.setProperty('left', 'auto', 'important');
        window.style.setProperty('top', 'auto', 'important');
      }
    }

    initEventListeners() {
      const { toggleWindow, closeWindow, textarea, sendBtn, micBtn } = this.ui.elements;

      // Toggle window visibility
      toggleWindow.addEventListener('click', () => this.toggleWindow());
      closeWindow.addEventListener('click', () => this.hideWindow());

      // Text input handling
      textarea.addEventListener('input', () => this.handleTextareaInput());
      textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.handleSend();
        }
      });

      // Send button
      sendBtn.addEventListener('click', () => this.handleSend());

      // Mic button
      micBtn.addEventListener('click', () => this.toggleVoice());

      // Close when clicking outside (but be more conservative)
      document.addEventListener('click', (e) => {
        // Only close if:
        // 1. Window is visible
        // 2. Click is not on our UI elements
        // 3. Click is not on input elements, buttons, or interactive content
        // 4. Click is on the page body or main content
        if (this.isWindowVisible &&
          !this.ui.window.contains(e.target) &&
          !this.ui.sidebar.contains(e.target) &&
          !e.target.closest('input, textarea, button, select, [role="button"], [role="menu"]') &&
          (e.target === document.body || e.target === document.documentElement)) {
          this.hideWindow();
        }
      });

      // Listen for messages from background script
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        this.handleBackgroundMessage(message);
        return true;
      });
    }

    initSpeechRecognition() {
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';

        this.recognition.onstart = () => {
          this.isListening = true;
          this.ui.elements.micBtn.classList.add('listening');
        };

        this.recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          this.ui.elements.textarea.value = transcript;
          this.handleTextareaInput();
        };

        this.recognition.onend = () => {
          this.isListening = false;
          this.ui.elements.micBtn.classList.remove('listening');
        };

        this.recognition.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          this.isListening = false;
          this.ui.elements.micBtn.classList.remove('listening');
        };
      }
    }

    setupAutoResize() {
      const textarea = this.ui.elements.textarea;

      textarea.addEventListener('input', () => {
        textarea.style.height = 'auto';
        textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
      });
    }

    // Load persistent state from storage
    loadPersistentState() {
      try {
        chrome.storage.local.get(['auraChatHistory', 'auraWindowVisible'], (result) => {
          // Restore chat history if exists
          if (result.auraChatHistory && result.auraChatHistory.length > 0) {
            console.log('💬 Loading', result.auraChatHistory.length, 'previous messages');
            this.chatHistory = result.auraChatHistory;
            this.restoreChatHistory(result.auraChatHistory);
          } else {
            // Show welcome message only if no history
            this.addMessage('Welcome to Aura Co-Pilot. How can I assist you today?', 'system');
          }
          
          // Restore window visibility
          if (result.auraWindowVisible) {
            this.isWindowVisible = true;
            this.ui.window.classList.add('visible');
          }
        });
      } catch (e) {
        console.log('⚠️ Could not load persistent state');
        this.addMessage('Welcome to Aura Co-Pilot. How can I assist you today?', 'system');
      }
      
      // Set up message listener for background script communication
      this.setupMessageListener();
    }
    
    // Set up message listener for background script communication
    setupMessageListener() {
      console.log('📡 Setting up message listener for background communication');
      
      // Listen for messages from background script
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.log('📨 Received message from background:', message.type);
        
        // Handle background script messages
        this.handleBackgroundMessage(message);
        
        // Always send response to avoid hanging
        sendResponse({ received: true });
        return true;
      });
    }
    
    // Restore chat history from array
    restoreChatHistory(historyArray) {
      const chatHistory = this.ui.elements.chatHistory;
      chatHistory.innerHTML = ''; // Clear current content
      
      historyArray.forEach(message => {
        this.addMessageToDOM(message.text, message.type, message.timestamp);
      });
    }
    
    // Save current state to storage
    savePersistentState() {
      try {
        chrome.storage.local.set({
          auraChatHistory: this.chatHistory,
          auraWindowVisible: this.isWindowVisible
        });
      } catch (e) {
        console.log('⚠️ Could not save persistent state');
      }
    }

    toggleWindow() {
      if (this.isWindowVisible) {
        this.hideWindow();
      } else {
        this.showWindow();
      }
    }

    showWindow() {
      this.ui.window.classList.add('visible');
      this.isWindowVisible = true;
      
      // Save visibility state
      this.savePersistentState();

      // Focus textarea after animation completes
      setTimeout(() => {
        this.ui.elements.textarea.focus();
        this.handleTextareaInput(); // Resize properly
      }, 300);
    }

    hideWindow() {
      this.ui.window.classList.remove('visible');
      this.isWindowVisible = false;
      
      // Save visibility state
      this.savePersistentState();

      // Stop voice if active
      if (this.isListening) {
        this.recognition?.stop();
      }
    }

    toggleVoice() {
      if (!this.recognition) {
        this.addMessage('Speech recognition is not supported in your browser.', 'error');
        return;
      }

      if (this.isListening) {
        this.recognition.stop();
      } else {
        this.recognition.start();
      }
    }

    handleTextareaInput() {
      const textarea = this.ui.elements.textarea;

      // Auto-resize
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;

      // Enable/disable send button based on content
      this.ui.elements.sendBtn.disabled = !textarea.value.trim();
    }

    handleSend() {
      if (this.isRunning) {
        this.terminateTask();
      } else {
        this.executeTask();
      }
    }

    executeTask() {
      const textarea = this.ui.elements.textarea;
      const task = textarea.value.trim();

      if (!task) return;

      // Add to chat history
      this.addMessage(task, 'user');

      // Clear input
      textarea.value = '';
      textarea.style.height = '50px';

      // Update UI state
      this.setStatus('working');
      this.setRunning(true);

      // Show thinking animation
      this.ui.elements.thinking.style.display = 'inline-flex';

      // FIX: Improved messaging to background script with error handling
      try {
        console.log("Sending task to background script:", task);

        chrome.runtime.sendMessage({
          type: 'EXECUTE_TASK',
          task: task
        }, response => {
          console.log("Background script response:", response);

          // Handle immediate response if available
          if (response && response.error) {
            this.addMessage(`Error: ${response.error}`, 'error');
            this.setStatus('error');
            this.setRunning(false);
            this.ui.elements.thinking.style.display = 'none';
          }
        });

        // Add a fallback in case background doesn't respond in time
        setTimeout(() => {
          if (this.isRunning) {
            console.log("Background script not responding, checking connection...");

            // Ping background to check connection
            chrome.runtime.sendMessage({ type: 'PING' }, response => {
              if (!response) {
                console.error("Background script not responding to ping");
                this.addMessage("The agent is not responding. Please reload the extension.", 'error');
                this.setStatus('error');
                this.setRunning(false);
                this.ui.elements.thinking.style.display = 'none';
              }
            });
          }
        }, 5000);
      } catch (e) {
        console.error('Failed to send message to background script:', e);
        this.addMessage('Error: Could not connect to agent. Please reload the extension.', 'error');
        this.setStatus('error');
        this.setRunning(false);
        this.ui.elements.thinking.style.display = 'none';
      }
    }

    terminateTask() {
      // Instantly terminate
      this.setRunning(false);
      this.setStatus('terminated');
      this.ui.elements.thinking.style.display = 'none';

      // Add termination message
      this.addMessage('Task terminated by user', 'terminated');

      // Notify background script
      try {
        chrome.runtime.sendMessage({
          type: 'TERMINATE_TASK'
        });
      } catch (e) {
        console.error('Failed to send termination message:', e);
      }
    }

    setRunning(isRunning) {
      this.isRunning = isRunning;
      const sendBtn = this.ui.elements.sendBtn;

      if (isRunning) {
        sendBtn.classList.add('terminate');
        sendBtn.title = 'Terminate task';
        sendBtn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
            <rect x="6" y="6" width="12" height="12" rx="2"></rect>
          </svg>
        `;
      } else {
        // Always show send button, never terminate for completed tasks
        sendBtn.classList.remove('terminate');
        sendBtn.title = 'Execute task';
        sendBtn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        `;
      }
    }

    setStatus(status) {
      const statusEl = this.ui.elements.status;
      statusEl.textContent = status.charAt(0).toUpperCase() + status.slice(1);

      // Remove all status classes
      statusEl.classList.remove('idle', 'working', 'terminated', 'executed');

      // Add current status class
      statusEl.classList.add(status);
    }

    addMessage(text, type = 'system') {
      const timestamp = Date.now();
      
      // Store in chat history array
      const messageData = {
        text: text,
        type: type,
        timestamp: timestamp
      };
      
      this.chatHistory.push(messageData);
      
      // Add to DOM
      this.addMessageToDOM(text, type, timestamp);
      
      // Save persistent state
      this.savePersistentState();
    }
    
    addMessageToDOM(text, type = 'system', timestamp = Date.now()) {
      const chatHistory = this.ui.elements.chatHistory;
      const messageEl = document.createElement('div');
      messageEl.className = 'aura-message';

      const icons = {
        user: `<line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>`,
        assistant: `<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>`,
        system: `<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>`,
        terminated: `<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>`,
        error: `<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>`
      };

      const iconSvg = icons[type] || icons.system;
      const timeString = new Date(timestamp).toLocaleTimeString('en-US', { hour12: false });

      messageEl.innerHTML = `
        <div class="aura-message-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
            ${iconSvg}
          </svg>
        </div>
        <div class="aura-message-content">
          <div class="aura-message-time">${timeString}</div>
          <div class="aura-message-text">${type === 'user' ? `Task initiated: ${text}` : text}</div>
        </div>
      `;

      chatHistory.appendChild(messageEl);
      chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    // Process messages from the background script
    handleBackgroundMessage(message) {
      console.log('🔄 Processing background message:', message.type, message);
      
      switch (message.type) {
        case 'LOG_MESSAGE':
          this.addMessage(message.message, message.level || 'info');
          break;

        case 'STATUS_UPDATE':
          if (message.status) {
            const statusText = message.status.text;
            console.log('🔄 Status update:', statusText);
            
            if (statusText === 'Working...' || statusText === 'Running...' || statusText === 'Processing...' || 
                statusText === 'Initializing...' || statusText === 'At Google.com' || statusText === 'Scanning page...' || 
                statusText === 'AI Processing...' || statusText === 'Navigating...' || statusText === 'Clicking...' || 
                statusText === 'Typing...' || statusText === 'Scrolling...' || statusText === 'Reading...') {
              this.setStatus('working');
              this.ui.elements.thinking.style.display = 'inline-flex';
            } else if (statusText === 'Complete!' || statusText === 'Complete') {
              this.setStatus('executed');
              this.setRunning(false);
              this.ui.elements.thinking.style.display = 'none';
            } else if (statusText === 'Stopped' || statusText === 'Terminated') {
              this.setStatus('terminated');
              this.setRunning(false);
              this.ui.elements.thinking.style.display = 'none';
            } else if (statusText === 'Error' || statusText === 'Config Error') {
              this.setStatus('error');
              this.setRunning(false);
              this.ui.elements.thinking.style.display = 'none';
            } else if (statusText === 'Ready' || statusText === 'Idle') {
              this.setStatus('idle');
              this.setRunning(false);
              this.ui.elements.thinking.style.display = 'none';
            }
          }
          break;

        case 'TASK_RESULT':
          if (message.result) {
            this.addMessage(message.result, 'assistant');
          }
          this.setStatus('executed');
          // Automatically stop agent after successful completion
          this.setRunning(false);
          this.ui.elements.thinking.style.display = 'none';
          console.log('✅ Task completed successfully - agent stopped automatically');
          break;

        case 'TASK_ERROR':
          if (message.error) {
            this.addMessage(`Error: ${message.error}`, 'error');
          }
          this.setStatus('terminated');
          this.setRunning(false);
          this.ui.elements.thinking.style.display = 'none';
          break;

        case 'CLEANUP_UI':
          this.cleanup();
          break;
          
        default:
          console.log('🔄 Unknown message type:', message.type);
      }
    }

    cleanup() {
      this.setRunning(false);
      this.ui.elements.thinking.style.display = 'none';
      
      // Clean up protection
      if (this.domObserver) {
        this.domObserver.disconnect();
      }
      if (this.protectionInterval) {
        clearInterval(this.protectionInterval);
      }
    }
    
    setupDOMProtection() {
      console.log('🛡️ Setting up DOM protection...');
      
      // Store references for protection
      this.protectedElements = [this.ui.sidebar, this.ui.window];
      
      // Monitor if elements get removed from DOM
      this.domObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList') {
            mutation.removedNodes.forEach((node) => {
              if (this.protectedElements.includes(node) ||
                  (node.nodeType === Node.ELEMENT_NODE && 
                   (node.classList?.contains('aura-sidebar') || 
                    node.classList?.contains('aura-window') ||
                    node.classList?.contains('aura-ui')))) {
                console.warn('⚠️ Aura UI element was removed from DOM, restoring immediately...');
                setTimeout(() => this.restoreUI(), 0); // Immediate restore
              }
            });
          }
          
          // Also monitor style changes that could hide elements
          if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
            const target = mutation.target;
            if (this.protectedElements.includes(target)) {
              this.enforceElementVisibility(target);
            }
          }
        });
      });
      
      // Observe the entire document for maximum protection
      this.domObserver.observe(document, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class']
      });
      
      // Aggressive periodic checks
      this.protectionInterval = setInterval(() => {
        this.enforceUIVisibility();
      }, 1000); // Check every second
      
      console.log('🛡️ DOM protection active');
    }
    
    enforceUIVisibility() {
      if (!this.ui || !this.ui.sidebar || !this.ui.window) return;
      
      // Check and restore sidebar
      if (!document.body.contains(this.ui.sidebar)) {
        console.log('🔧 Restoring sidebar to DOM...');
        try {
          document.body.appendChild(this.ui.sidebar);
          this.enforceElementVisibility(this.ui.sidebar);
        } catch (e) {
          console.error('❌ Failed to restore sidebar:', e);
        }
      } else {
        this.enforceElementVisibility(this.ui.sidebar);
      }
      
      // Check and restore window
      if (!document.body.contains(this.ui.window)) {
        console.log('🔧 Restoring window to DOM...');
        try {
          document.body.appendChild(this.ui.window);
          this.enforceElementVisibility(this.ui.window);
        } catch (e) {
          console.error('❌ Failed to restore window:', e);
        }
      } else {
        this.enforceElementVisibility(this.ui.window);
      }
    }
    
    enforceElementVisibility(element) {
      if (!element) return;
      
      const elementType = element.classList.contains('aura-sidebar') ? 'sidebar' : 'window';
      console.log(`🔧 Enforcing visibility for ${elementType}`);
      
      // Force critical styles with !important
      const criticalStyles = {
        'position': 'fixed',
        'display': element.classList.contains('aura-sidebar') ? 'flex' : 'block',
        'visibility': 'visible',
        'opacity': '1',
        'pointer-events': 'auto'
      };
      
      Object.entries(criticalStyles).forEach(([prop, value]) => {
        element.style.setProperty(prop, value, 'important');
      });
      
      // Set z-index based on element type
      if (element.classList.contains('aura-sidebar')) {
        element.style.setProperty('z-index', '999998', 'important');
        // Extra sidebar-specific styles
        element.style.setProperty('width', '60px', 'important');
        element.style.setProperty('height', 'auto', 'important');
        element.style.setProperty('left', '20px', 'important');
        element.style.setProperty('top', '50%', 'important');
        element.style.setProperty('transform', 'translateY(-50%)', 'important');
        
        // Debug current computed styles
        const computedStyle = getComputedStyle(element);
        console.log(`📊 Sidebar computed styles:`, {
          display: computedStyle.display,
          visibility: computedStyle.visibility,
          opacity: computedStyle.opacity,
          position: computedStyle.position,
          zIndex: computedStyle.zIndex,
          left: computedStyle.left,
          top: computedStyle.top
        });
      } else if (element.classList.contains('aura-window')) {
        element.style.setProperty('z-index', '999997', 'important');
      }
    }
    
    restoreUI() {
      console.log('🔄 Attempting UI restoration...');
      this.enforceUIVisibility();
    }
  }

  // Initialize the UI
  let auraUI;
  function initAuraUI() {
    if (auraUI) {
      console.log('🔄 Aura UI already exists, skipping initialization');
      return;
    }

    try {
      console.log('✨ Aura UI initializing...');
      
      // Set up global protection first
      setupGlobalProtection();
      
      auraUI = new AuraUI();

      // Expose for debugging and external access
      window.auraUI = auraUI;

      console.log('✅ Aura UI initialized successfully');
      
      // Add a check to see if elements stay in DOM
      setTimeout(() => {
        const sidebar = document.querySelector('.aura-sidebar');
        const window = document.querySelector('.aura-window');
        console.log('🔍 DOM check after 2s:', {
          sidebarExists: !!sidebar,
          windowExists: !!window,
          sidebarVisible: sidebar ? getComputedStyle(sidebar).display !== 'none' : false
        });
      }, 2000);
      
    } catch (error) {
      console.error('❌ Failed to initialize Aura UI:', error);
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuraUI);
  } else {
    setTimeout(initAuraUI, 100);
  }

  // Handle SPA navigation
  let lastUrl = location.href;
  new MutationObserver(() => {
    if (lastUrl !== location.href) {
      lastUrl = location.href;
      if (!document.querySelector('.aura-sidebar')) {
        initAuraUI();
      }
    }
  }).observe(document, { subtree: true, childList: true });

})();
