// Aura Co-Pilot - WORKING Floating UI Implementation

(function () {
  if (window.__aura_ui_injected) return;
  window.__aura_ui_injected = true;

  const allowedProtocols = ['http:', 'https:', 'file:'];
  if (!allowedProtocols.includes(window.location.protocol)) return;

  console.log('🎨 Initializing Aura Co-Pilot UI');

  // Global protection
  function setupGlobalProtection() {
    const originalRemoveChild = Node.prototype.removeChild;

    Node.prototype.removeChild = function (child) {
      if (child && (child.hasAttribute?.('data-aura-protected') ||
        child.classList?.contains('aura-ui'))) {
        console.warn('🛡️ Blocked attempt to remove protected Aura UI element');
        return child;
      }
      return originalRemoveChild.call(this, child);
    };
  }

  // Create UI elements
  function createAuraUI() {
    console.log('🛠️ Creating Aura UI elements...');

    // Remove existing elements
    document.querySelectorAll('.aura-sidebar, .aura-window').forEach(el => el.remove());

    // Sidebar
    const sidebar = document.createElement('div');
    sidebar.className = 'aura-ui aura-sidebar';
    sidebar.setAttribute('data-aura-protected', 'true');
    sidebar.innerHTML = `
      <div class="aura-logo">
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="auraSwooshGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#C4B5FD" />
              <stop offset="100%" stop-color="#A855F7" />
            </linearGradient>
          </defs>
          <g stroke="rgba(255,255,255,0.7)" stroke-width="1.5">
            <path d="M 50 10 L 5 85" />
            <path d="M 50 10 L 95 85" />
            <path d="M 50 10 L 30 85" />
            <path d="M 50 10 L 70 85" />
          </g>
          <g>
            <path d="M 15 65 Q 50 45, 85 65 L 80 55 Q 50 38, 20 55 Z" fill="url(#auraSwooshGradient)"/>
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

    // Main Window
    const windowEl = document.createElement('div');
    windowEl.className = 'aura-ui aura-window';
    windowEl.setAttribute('data-aura-protected', 'true');
    windowEl.innerHTML = `
      <div class="aura-window-drag-handle" id="aura-window-drag-handle">
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
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M18 6L6 18M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      </div>
      <div class="aura-chat-history" id="aura-chat-history"></div>
      <div class="aura-input-area">
        <div class="aura-input-container">
          <button class="aura-mic-btn" id="aura-mic-btn" title="Voice input">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
              <line x1="12" y1="19" x2="12" y2="23"></line>
              <line x1="8" y1="23" x2="16" y2="23"></line>
            </svg>
          </button>
          <textarea class="aura-textarea" id="aura-textarea" placeholder="Type or speak a task..." rows="1"></textarea>
          <button class="aura-send-btn" id="aura-send-btn" title="Execute task">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(sidebar);
    document.body.appendChild(windowEl);

    // Apply force visibility - INITIAL ONLY
    sidebar.style.setProperty('position', 'fixed', 'important');
    sidebar.style.setProperty('z-index', '999998', 'important');
    sidebar.style.setProperty('display', 'flex', 'important');
    sidebar.style.setProperty('visibility', 'visible', 'important');
    sidebar.style.setProperty('opacity', '1', 'important');

    // Window starts hidden or checks persistent state later
    windowEl.style.setProperty('position', 'fixed', 'important');
    windowEl.style.setProperty('z-index', '999997', 'important');
    // Don't force visibility on window initially, let the class handle it

    // Initial positions
    sidebar.style.setProperty('left', '20px', 'important');
    sidebar.style.setProperty('top', '50%', 'important');
    sidebar.style.setProperty('transform', 'translateY(-50%)', 'important');

    windowEl.style.setProperty('right', '30px', 'important');
    windowEl.style.setProperty('bottom', '30px', 'important');

    return {
      sidebar,
      window: windowEl,
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

  // Enhanced UI Class
  class AuraEnhancedUI {
    constructor() {
      this.ui = createAuraUI();
      this.isWindowVisible = false;
      this.isRunning = false;
      this.isListening = false;
      this.recognition = null;
      this.chatHistory = [];
      this.globalState = { isRunning: false, currentTask: '', startTime: null, tabId: null };

      this.initDraggable();
      this.initEventListeners();
      this.initSpeechRecognition();
      this.loadPersistentState();
      this.syncWithGlobalState();
      setupGlobalProtection();
    }

    initDraggable() {
      // WORKING draggable implementation - tested and proven
      const sidebar = this.ui.sidebar;
      const windowEl = this.ui.window;
      const dragHandle = this.ui.elements.dragHandle;

      if (!sidebar || !windowEl || !dragHandle) {
        console.error('❌ UI elements not found for dragging');
        return;
      }

      let isDraggingSidebar = false;
      let isDraggingWindow = false;
      let sidebarOffsetX = 0, sidebarOffsetY = 0;
      let windowOffsetX = 0, windowOffsetY = 0;

      console.log('✅ Initializing draggable functionality');

      // Make sidebar visually draggable
      sidebar.style.cursor = 'move';
      dragHandle.style.cursor = 'move';

      // SIDEBAR DRAGGING
      sidebar.addEventListener('mousedown', function (e) {
        // Don't drag if clicking on buttons
        if (e.target.closest('.aura-control-btn')) {
          console.log('🚫 Button clicked - not dragging');
          return;
        }

        console.log('🖱️ Sidebar mousedown detected');
        e.preventDefault();
        isDraggingSidebar = true;

        const rect = sidebar.getBoundingClientRect();
        sidebarOffsetX = e.clientX - rect.left;
        sidebarOffsetY = e.clientY - rect.top;

        sidebar.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';
      });

      // WINDOW DRAGGING
      dragHandle.addEventListener('mousedown', function (e) {
        if (e.target.closest('.aura-window-close')) return;

        console.log('🖱️ Window mousedown detected');
        e.preventDefault();
        isDraggingWindow = true;

        const rect = windowEl.getBoundingClientRect();
        windowOffsetX = e.clientX - rect.left;
        windowOffsetY = e.clientY - rect.top;

        dragHandle.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';
      });

      // GLOBAL MOUSE MOVE
      document.addEventListener('mousemove', function (e) {
        if (isDraggingSidebar) {
          const newLeft = e.clientX - sidebarOffsetX;
          const newTop = e.clientY - sidebarOffsetY;

          // Boundary checks
          const maxLeft = window.innerWidth - sidebar.offsetWidth;
          const maxTop = window.innerHeight - sidebar.offsetHeight;

          const boundedLeft = Math.max(0, Math.min(newLeft, maxLeft));
          const boundedTop = Math.max(0, Math.min(newTop, maxTop));

          sidebar.style.setProperty('left', boundedLeft + 'px', 'important');
          sidebar.style.setProperty('top', boundedTop + 'px', 'important');
          sidebar.style.setProperty('transform', 'none', 'important');
        }

        if (isDraggingWindow) {
          const newLeft = e.clientX - windowOffsetX;
          const newTop = e.clientY - windowOffsetY;

          // Boundary checks
          const maxLeft = window.innerWidth - windowEl.offsetWidth;
          const maxTop = window.innerHeight - windowEl.offsetHeight;

          windowEl.style.left = Math.max(0, Math.min(newLeft, maxLeft)) + 'px';
          windowEl.style.top = Math.max(0, Math.min(newTop, maxTop)) + 'px';
          windowEl.style.right = 'auto';
          windowEl.style.bottom = 'auto';
        }
      });

      // GLOBAL MOUSE UP
      document.addEventListener('mouseup', function () {
        if (isDraggingSidebar) {
          console.log('✅ Sidebar drag ended');
          isDraggingSidebar = false;
          sidebar.style.cursor = 'move';
          document.body.style.userSelect = '';

          // Save position
          try {
            const rect = sidebar.getBoundingClientRect();
            chrome.storage.local.set({
              auraSidebarPos: {
                left: rect.left + 'px',
                top: rect.top + 'px'
              }
            });
          } catch (e) { console.error('Failed to save sidebar position:', e); }
        }

        if (isDraggingWindow) {
          console.log('✅ Window drag ended');
          isDraggingWindow = false;
          dragHandle.style.cursor = 'move';
          document.body.style.userSelect = '';

          // Save position
          try {
            const rect = windowEl.getBoundingClientRect();
            chrome.storage.local.set({
              auraWindowPos: {
                left: rect.left + 'px',
                top: rect.top + 'px'
              }
            });
          } catch (e) { console.error('Failed to save window position:', e); }
        }
      });

      console.log('✅ Draggable functionality initialized successfully');
    }

    initEventListeners() {
      const { toggleWindow, closeWindow, textarea, sendBtn, micBtn } = this.ui.elements;
      const quickInput = document.querySelector('.aura-quick-input');
      const quickTextarea = document.getElementById('quick-input-textarea');
      const quickSendBtn = document.getElementById('quick-input-send');
      const quickCloseBtn = document.getElementById('quick-input-close');

      console.log('⚙️ Setting up event listeners');
      console.log('Quick input elements:', { quickInput, quickTextarea, quickSendBtn, quickCloseBtn });

      // SIDEBAR BUTTON - Show quick input popup
      // SIDEBAR BUTTON - Toggle Main Window
      toggleWindow.addEventListener('click', (e) => {
        e.stopPropagation();
        console.log('💬 Sidebar button clicked - toggling window');
        this.toggleWindow();
      });

      // QUICK INPUT CONTROLS
      if (quickSendBtn) {
        quickSendBtn.addEventListener('click', () => {
          console.log('➡️ Quick send clicked');
          this.handleQuickSend();
        });
      }

      if (quickCloseBtn) {
        quickCloseBtn.addEventListener('click', () => {
          console.log('❌ Quick close clicked');
          this.hideQuickInput();
        });
      }

      if (quickTextarea) {
        quickTextarea.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            console.log('⏎ Enter pressed in quick input');
            this.handleQuickSend();
          } else if (e.key === 'Escape') {
            this.hideQuickInput();
          }
        });

        quickTextarea.addEventListener('input', () => {
          quickTextarea.style.height = 'auto';
          quickTextarea.style.height = Math.min(quickTextarea.scrollHeight, 120) + 'px';
        });
      }

      // Main window controls
      closeWindow.addEventListener('click', () => this.hideWindow());
      sendBtn.addEventListener('click', () => this.handleSend());
      micBtn.addEventListener('click', () => this.toggleVoice());

      // Main textarea controls
      textarea.addEventListener('input', () => {
        textarea.style.height = 'auto';
        textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
        sendBtn.disabled = !textarea.value.trim();
      });

      textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.handleSend();
        }
      });

      // Click outside to close quick input
      document.addEventListener('click', (e) => {
        if (quickInput && quickInput.style.display !== 'none') {
          if (!quickInput.contains(e.target) && !this.ui.sidebar.contains(e.target)) {
            this.hideQuickInput();
          }
        }
      });

      // Background message handling
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        this.handleBackgroundMessage(message);
        sendResponse({ received: true });
        return true;
      });

      // Sync with global state on page load
      this.syncWithGlobalState();

      console.log('✅ Event listeners setup complete');
    }

    initSpeechRecognition() {
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.lang = 'en-US';

        this.recognition.onstart = () => {
          this.isListening = true;
          this.ui.elements.micBtn.classList.add('listening');
        };

        this.recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          this.ui.elements.textarea.value = transcript;
        };

        this.recognition.onend = () => {
          this.isListening = false;
          this.ui.elements.micBtn.classList.remove('listening');
        };
      }
    }

    loadPersistentState() {
      try {
        chrome.storage.local.get(['auraChatHistory', 'auraWindowVisible', 'auraSidebarPos', 'auraWindowPos'], (result) => {
          if (result.auraChatHistory?.length > 0) {
            this.chatHistory = result.auraChatHistory;
            this.restoreChatHistory(result.auraChatHistory);
          } else {
            this.addMessage('Welcome to Aura Co-Pilot. How can I help you today?', 'system');
          }

          if (result.auraWindowVisible) {
            this.isWindowVisible = true;
            this.ui.window.classList.add('visible');
          }

          // Restore UI positions
          if (result.auraSidebarPos) {
            this.ui.sidebar.style.left = result.auraSidebarPos.left;
            this.ui.sidebar.style.top = result.auraSidebarPos.top;
            this.ui.sidebar.style.transform = 'none';
          }

          if (result.auraWindowPos) {
            this.ui.window.style.left = result.auraWindowPos.left;
            this.ui.window.style.top = result.auraWindowPos.top;
            this.ui.window.style.right = 'auto';
            this.ui.window.style.bottom = 'auto';
          }
        });
      } catch (e) {
        this.addMessage('Welcome to Aura Co-Pilot. How can I help you today?', 'system');
      }
    }

    toggleWindow() {
      if (this.isWindowVisible) {
        this.hideWindow();
      } else {
        this.showWindow();
      }
    }

    showQuickInput() {
      const quickInput = document.querySelector('.aura-quick-input');
      const quickTextarea = document.getElementById('quick-input-textarea');

      if (!quickInput) {
        console.error('❌ Quick input not found');
        return;
      }

      console.log('💬 Showing quick input popup');

      // Position near sidebar
      const sidebarRect = this.ui.sidebar.getBoundingClientRect();
      let left = sidebarRect.right + 10;
      let top = sidebarRect.top;

      // Keep on screen
      if (left + 320 > window.innerWidth) {
        left = sidebarRect.left - 320 - 10;
      }
      if (left < 10) left = 10;
      if (top + 150 > window.innerHeight) {
        top = window.innerHeight - 150;
      }
      if (top < 10) top = 10;

      quickInput.style.left = left + 'px';
      quickInput.style.top = top + 'px';
      quickInput.style.display = 'block';

      // Focus textarea
      setTimeout(() => {
        if (quickTextarea) {
          quickTextarea.focus();
          console.log('✅ Quick input focused');
        }
      }, 100);
    }

    hideQuickInput() {
      const quickInput = document.querySelector('.aura-quick-input');
      if (quickInput) {
        console.log('😶 Hiding quick input popup');
        quickInput.style.display = 'none';
      }
    }

    handleQuickSend() {
      const quickTextarea = document.getElementById('quick-input-textarea');
      if (!quickTextarea) return;

      const task = quickTextarea.value.trim();
      if (!task) {
        console.log('⚠️ No task entered');
        return;
      }

      console.log('🚀 Executing quick task:', task);

      // Clear and hide
      quickTextarea.value = '';
      this.hideQuickInput();

      // Execute task
      this.addMessage(task, 'user');
      this.setStatus('working');
      this.setRunning(true);
      this.ui.elements.thinking.style.display = 'inline-flex';

      try {
        chrome.runtime.sendMessage({ type: 'EXECUTE_TASK', task: task });
        console.log('✅ Task sent to background');
      } catch (e) {
        console.error('❌ Failed to send task:', e);
        this.addMessage('Error: Could not connect to agent.', 'error');
        this.setStatus('error');
        this.setRunning(false);
      }
    }

    showWindow() {
      this.ui.window.classList.add('visible');
      this.ui.window.style.setProperty('display', 'block', 'important');
      this.ui.window.style.setProperty('visibility', 'visible', 'important');
      this.ui.window.style.setProperty('opacity', '1', 'important');
      this.isWindowVisible = true;
      this.savePersistentState();
      setTimeout(() => this.ui.elements.textarea.focus(), 300);
    }

    hideWindow() {
      this.ui.window.classList.remove('visible');
      // Force hide with inline styles to override any protection
      this.ui.window.style.setProperty('display', 'none', 'important');
      this.ui.window.style.setProperty('visibility', 'hidden', 'important');
      this.ui.window.style.setProperty('opacity', '0', 'important');
      this.isWindowVisible = false;
      this.savePersistentState();
      if (this.isListening) this.recognition?.stop();
    }

    toggleVoice() {
      if (!this.recognition) {
        this.addMessage('Speech recognition not supported.', 'error');
        return;
      }
      if (this.isListening) {
        this.recognition.stop();
      } else {
        this.recognition.start();
      }
    }

    handleSend() {
      if (this.isRunning) {
        this.terminateTask();
      } else {
        this.executeTask();
      }
    }

    executeTask() {
      const task = this.ui.elements.textarea.value.trim();
      if (!task) return;

      this.addMessage(task, 'user');
      this.ui.elements.textarea.value = '';
      this.setStatus('working');
      this.setRunning(true);
      this.ui.elements.thinking.style.display = 'inline-flex';

      try {
        chrome.runtime.sendMessage({ type: 'EXECUTE_TASK', task: task });
      } catch (e) {
        this.addMessage('Error: Could not connect to agent.', 'error');
        this.setStatus('error');
        this.setRunning(false);
      }
    }

    terminateTask() {
      this.setRunning(false);
      this.setStatus('terminated');
      this.ui.elements.thinking.style.display = 'none';
      this.addMessage('Task terminated', 'terminated');
      try {
        chrome.runtime.sendMessage({ type: 'TERMINATE_TASK' });
      } catch (e) { }
    }

    setRunning(isRunning) {
      this.isRunning = isRunning;
      const sendBtn = this.ui.elements.sendBtn;

      if (isRunning) {
        sendBtn.classList.add('terminate');
        sendBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"></rect></svg>';
      } else {
        sendBtn.classList.remove('terminate');
        sendBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>';
      }
    }

    setStatus(status) {
      const statusEl = this.ui.elements.status;
      statusEl.textContent = status.charAt(0).toUpperCase() + status.slice(1);
      statusEl.classList.remove('idle', 'working', 'terminated', 'executed');
      statusEl.classList.add(status);
    }

    addMessage(text, type = 'system') {
      const messageData = { text, type, timestamp: Date.now() };
      this.chatHistory.push(messageData);
      this.addMessageToDOM(text, type, messageData.timestamp);
      this.savePersistentState();
    }

    addMessageToDOM(text, type, timestamp) {
      const chatHistory = this.ui.elements.chatHistory;
      const messageEl = document.createElement('div');
      messageEl.className = 'aura-message';

      const icons = {
        user: '<line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>',
        assistant: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>',
        system: '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>',
        terminated: '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>'
      };

      const timeString = new Date(timestamp).toLocaleTimeString('en-US', { hour12: false });
      messageEl.innerHTML = `
        <div class="aura-message-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">${icons[type] || icons.system}</svg>
        </div>
        <div class="aura-message-content">
          <div class="aura-message-time">${timeString}</div>
          <div class="aura-message-text">${text}</div>
        </div>
      `;

      chatHistory.appendChild(messageEl);
      chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    restoreChatHistory(historyArray) {
      const chatHistory = this.ui.elements.chatHistory;
      chatHistory.innerHTML = '';
      historyArray.forEach(message => {
        this.addMessageToDOM(message.text, message.type, message.timestamp);
      });
    }

    handleBackgroundMessage(message) {
      switch (message.type) {
        case 'LOG_MESSAGE':
          this.addMessage(message.message, 'info');
          break;
        case 'STATUS_UPDATE':
          // Update global state from message
          if (message.globalState) {
            this.globalState = message.globalState;
          }

          const statusText = message.status?.text || '';

          if (statusText === 'Working...' || statusText.includes('Executing') || statusText.includes('Thinking')) {
            this.setStatus('working');
            this.setRunning(true);
            this.ui.elements.thinking.style.display = 'inline-flex';
          } else if (statusText.includes('Complete') || statusText.includes('Finished') || statusText.includes('Success')) {
            this.setStatus('executed');
            this.setRunning(false);
            this.ui.elements.thinking.style.display = 'none';
          } else if (statusText === 'Stopped' || statusText.includes('Terminated')) {
            this.setStatus('terminated');
            this.setRunning(false);
            this.ui.elements.thinking.style.display = 'none';
          } else if (statusText === 'Error' || statusText.includes('Failed')) {
            this.setStatus('error');
            this.setRunning(false);
            this.ui.elements.thinking.style.display = 'none';
          }
          break;
        case 'TASK_RESULT':
          if (message.result) {
            this.addMessage(message.result, 'assistant');
          }
          this.setStatus('executed');
          this.setRunning(false);
          this.ui.elements.thinking.style.display = 'none';
          break;
        case 'CLEANUP_UI':
          if (message.globalState) {
            this.globalState = message.globalState;
          }
          this.setRunning(false);
          this.setStatus('idle');
          this.ui.elements.thinking.style.display = 'none';
          break;
      }
    }

    syncWithGlobalState() {
      try {
        chrome.runtime.sendMessage({ type: 'GET_GLOBAL_STATE' }, (response) => {
          if (response?.globalState) {
            this.globalState = response.globalState;

            // Update UI based on global state
            if (this.globalState.isRunning) {
              this.setRunning(true);
              this.setStatus('working');
              this.ui.elements.thinking.style.display = 'inline-flex';

              // Show current task if available
              if (this.globalState.currentTask) {
                this.addMessage(`Continuing task: ${this.globalState.currentTask}`, 'system');
              }
            } else {
              this.setRunning(false);
              this.setStatus('idle');
              this.ui.elements.thinking.style.display = 'none';
            }
          }
        });
      } catch (e) {
        console.log('Could not sync with global state');
      }
    }

    savePersistentState() {
      try {
        chrome.storage.local.set({
          auraChatHistory: this.chatHistory,
          auraWindowVisible: this.isWindowVisible,
          auraSidebarPos: {
            left: this.ui.sidebar.style.left,
            top: this.ui.sidebar.style.top
          },
          auraWindowPos: {
            left: this.ui.window.style.left,
            top: this.ui.window.style.top
          }
        });
      } catch (e) { }
    }
  }

  // Initialize the enhanced UI
  try {
    window.auraUI = new AuraEnhancedUI();
    console.log('✅ Aura Co-Pilot Enhanced UI ready');
  } catch (error) {
    console.error('❌ Failed to initialize Aura UI:', error);
  }
})();
