// background.js - Aura Co-Pilot 2

// --- Globals ---
let settings = { apiKey: '', baseUrl: '', modelName: '', taskDuration: 2, executionSpeed: 3, retryStrategy: 'balanced', smartRecovery: true, advancedMode: false };
let agentState = 'idle'; // 'idle', 'running', 'clarifying', 'paused'
let taskHistory = [];
let currentTask = '';
let clarificationTimeout = null;
let clipboardData = null;
let taskStartTime = null;
let retryCount = 0;
let maxRetries = 5;
let activeTabId = null;
let globalTaskState = {
  isRunning: false,
  currentTask: '',
  startTime: null,
  tabId: null
};

// --- Chrome Listeners ---
chrome.runtime.onInstalled.addListener(() => {
  console.log('🚀 Aura Co-Pilot background script installed');
  chrome.storage.local.set({ apiKey: '', baseUrl: '', modelName: '', configured: false });
  agentState = 'idle';
  globalTaskState = {
    isRunning: false,
    currentTask: '',
    startTime: null,
    tabId: null
  };
  updateStatus('idle', 'Extension installed and ready');
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Background received message:', request.type);

  if (request.type === 'EXECUTE_TASK') {
    handleExecuteTask(request.task);
  } else if (request.type === 'UPDATE_SETTINGS') {
    handleUpdateSettings(request.settings);
  } else if (request.type === 'PAGE_DATA') {
    handlePageData(request.data);
  } else if (request.type === 'TERMINATE_TASK') {
    terminateTaskByUser();
  } else if (request.type === 'USER_CHOICE') {
    handleUserChoice(request.choice);
  } else if (request.type === 'COPIED_DATA') {
    clipboardData = request.data;
    logToPopup(`📋 Captured data: ${clipboardData}`);
    if (agentState === 'running') {
      const tabId = sender.tab.id;
      taskHistory.push({ action: { action: "copy_image_url" }, status: 'success' });
      setTimeout(() => scanCurrentPage(tabId), 500);
    }
  } else if (request.type === 'PING') {
    sendResponse({ status: 'alive', agentState: agentState, globalState: globalTaskState });
  } else if (request.type === 'GET_GLOBAL_STATE') {
    // Send current global state to requesting tab
    sendResponse({ globalState: globalTaskState, agentState: agentState });
  }

  // Return true to indicate we wish to send a response asynchronously (even if we don't always use it)
  return true;
});

// --- Enhanced Settings Handler ---
function handleUpdateSettings(newSettings) {
  console.log('⚙️ Updating settings:', { ...newSettings, apiKey: newSettings.apiKey ? '***hidden***' : '(empty)' });

  // Merge settings
  settings = { ...settings, ...newSettings };

  // Update retry limits based on strategy
  updateRetryLimits();

  // Save to storage
  chrome.storage.local.set(settings, () => {
    if (chrome.runtime.lastError) {
      console.error('❌ Failed to save settings:', chrome.runtime.lastError);
    } else {
      console.log('✅ Settings updated successfully');
      logToPopup('⚙️ Settings updated');
    }
  });
}

function updateRetryLimits() {
  switch (settings.retryStrategy) {
    case 'conservative':
      maxRetries = 3;
      break;
    case 'balanced':
      maxRetries = 5;
      break;
    case 'aggressive':
      maxRetries = 10;
      break;
    case 'relentless':
      maxRetries = 999;
      break;
    default:
      maxRetries = 5;
  }
  console.log(`🔄 Retry limit set to: ${maxRetries}`);
}

// --- Enhanced UI & State Management ---
function updateStatus(state, message) {
  const statusMap = {
    idle: { text: 'Idle', color: '#4CAF50' },
    running: { text: 'Working...', color: '#FFC107' },
    clarifying: { text: 'Waiting for Input...', color: '#2196F3' },
    finished: { text: 'Complete!', color: '#4CAF50' },
    terminated: { text: 'Stopped', color: '#F44336' },
    error: { text: 'Error', color: '#F44336' },
    paused: { text: 'Paused', color: '#FF9800' }
  };

  agentState = state;
  globalTaskState.isRunning = (state === 'running');

  // Broadcast status to ALL tabs
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      try {
        chrome.tabs.sendMessage(tab.id, {
          type: 'STATUS_UPDATE',
          status: statusMap[state],
          globalState: globalTaskState
        });
      } catch (e) {
        // Tab may not have content script
      }
    });
  });

  // Also send to popup if available
  try {
    chrome.runtime.sendMessage({
      type: 'STATUS_UPDATE',
      status: statusMap[state],
      globalState: globalTaskState
    });
  } catch (e) {
    // Popup may not be open
  }

  if (message) logToPopup(message);
}

function terminateTaskByUser() {
  if (agentState === 'idle') return;

  console.log('🛑 Task terminated by user');
  agentState = 'idle';
  updateStatus('terminated', '🛑 Task terminated by user');
  cleanupAfterTask();
}

function cleanupAfterTask() {
  if (clarificationTimeout) clearTimeout(clarificationTimeout);
  taskHistory = [];
  currentTask = '';
  clipboardData = null;
  taskStartTime = null;
  retryCount = 0;
  activeTabId = null;

  // Reset global state
  globalTaskState = {
    isRunning: false,
    currentTask: '',
    startTime: null,
    tabId: null
  };

  // Cleanup all tabs
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      try {
        chrome.debugger.detach({ tabId: tab.id }).catch(e => { });
        chrome.tabs.sendMessage(tab.id, {
          type: 'CLEANUP_UI',
          globalState: globalTaskState
        });
      } catch (e) {
        // Tab may not have content script
      }
    });
  });
}

// --- Enhanced Core Agent Logic ---
async function handleExecuteTask(task) {
  if (agentState !== 'idle') {
    logToPopup("🤖 Agent is already busy with another task");
    return;
  }

  console.log("🧠 Checking API settings...");
  const storedSettings = await chrome.storage.local.get(['apiKey', 'baseUrl', 'modelName', 'taskDuration', 'executionSpeed', 'retryStrategy', 'smartRecovery', 'advancedMode']);
  console.log("📦 Stored settings:", { ...storedSettings, apiKey: storedSettings.apiKey ? '***hidden***' : '(empty)' });

  // Check if API settings are properly configured
  if (!storedSettings.apiKey || !storedSettings.baseUrl || !storedSettings.modelName) {
    updateStatus('error', "❌ ERROR: API settings are not fully configured. Please configure them in the popup.");
    return;
  }

  // Update settings
  settings = { ...settings, ...storedSettings };
  updateRetryLimits();

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) {
    updateStatus('error', "❌ Error: No active tab found");
    return;
  }

  // Initialize task with global state tracking
  agentState = 'running';
  currentTask = task;
  taskHistory = [];
  clipboardData = null;
  taskStartTime = Date.now();
  retryCount = 0;
  activeTabId = tab.id;

  // Update global state
  globalTaskState = {
    isRunning: true,
    currentTask: task,
    startTime: taskStartTime,
    tabId: tab.id
  };

  updateStatus('running', `🚀 Starting task: "${task}"`);
  logToPopup(`🎯 Task initiated: ${task}`);
  logToPopup(`⏱️ Max duration: ${settings.taskDuration} minutes`);
  logToPopup(`⚡ Speed setting: ${settings.executionSpeed}/5`);
  logToPopup(`🔄 Retry strategy: ${settings.retryStrategy}`);

  // Handle starting from a new tab page
  if (tab.url.startsWith('chrome://')) {
    logToPopup("🔄 On a system page. Navigating to Google to begin task...");

    chrome.tabs.update(tab.id, { url: "https://www.google.com" }, (updatedTab) => {
      const listener = (tabId, info) => {
        if (tabId === updatedTab.id && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          setTimeout(() => scanCurrentPage(tabId), 500);
        }
      };
      chrome.tabs.onUpdated.addListener(listener);
    });
    return;
  }

  scanCurrentPage(tab.id);
}

function scanCurrentPage(tabId) {
  if (agentState !== 'running') return;

  // Check task timeout
  if (taskStartTime && settings.taskDuration) {
    const elapsed = (Date.now() - taskStartTime) / 1000 / 60; // minutes
    if (elapsed > settings.taskDuration) {
      logToPopup(`⏰ Task timeout reached (${settings.taskDuration} minutes)`);
      agentState = 'idle';
      updateStatus('finished', `⏰ Task completed (timeout reached after ${settings.taskDuration} minutes)`);
      cleanupAfterTask();
      return;
    }
  }

  logToPopup("🔍 Scanning page for interactive elements...");
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    files: ['content.js'],
  }, () => {
    if (chrome.runtime.lastError) {
      updateStatus('error', `❌ Content script injection failed: ${chrome.runtime.lastError.message}`);
      handleTaskError('Content script injection failed');
    } else {
      chrome.tabs.sendMessage(tabId, { type: 'SCAN_PAGE' });
    }
  });
}

async function handlePageData(pageData) {
  if (agentState !== 'running') return;

  logToPopup("🤖 AI is analyzing page and planning next step...");

  const userPrompt = buildEnhancedPrompt(pageData);

  try {
    const result = await callApiWithBackoff(userPrompt);
    if (!result) {
      handleTaskError('API call failed');
      return;
    }

    const action = JSON.parse(result.choices[0].message.content);

    if (!action.action) {
      throw new Error("AI response was malformed - missing action");
    }

    logToPopup(`🧠 AI Decision: ${action.action} - ${action.message || action.reason || ''}`);

    if (action.action === 'finish') {
      agentState = 'idle';
      updateStatus('finished', `✅ Task completed: ${action.message}`);
      logToPopup(`🎉 Task finished: ${action.message}`);
      cleanupAfterTask();
    } else if (action.action === 'clarify') {
      agentState = 'clarifying';
      updateStatus('clarifying', action.question);
      presentChoicesToUser(action.options, action.question);
    } else {
      await executeAction(action);
    }
  } catch (error) {
    console.error('🚨 Error processing AI response:', error);
    handleTaskError(`AI processing error: ${error.message}`);
  }
}

function buildEnhancedPrompt(pageData) {
  const taskInfo = {
    task: currentTask,
    duration: `${Math.floor((Date.now() - taskStartTime) / 1000 / 60)} minutes elapsed (max: ${settings.taskDuration} minutes)`,
    retryCount: retryCount,
    maxRetries: maxRetries,
    speed: settings.executionSpeed,
    smartRecovery: settings.smartRecovery,
    advancedMode: settings.advancedMode
  };

  return `URGENT TASK: "${currentTask}"

**CRITICAL CONTEXT:**
- Current URL: ${pageData.url}
- Page Title: ${pageData.title}
- Elapsed Time: ${taskInfo.duration}
- Retry Count: ${retryCount}/${maxRetries}
- Speed Mode: ${settings.executionSpeed}/5 (EXECUTE FAST!)

**TASK EXECUTION RULES:**
1. DIRECT NAVIGATION: If user wants a specific site, go DIRECTLY there
2. COMPLETE ACTIONS: Don't just find products - ADD TO CART
3. FULL DOCUMENT TASKS: Create, write, format, AND rename
4. SEND MESSAGES: Actually type and send, don't just navigate
5. BE EFFICIENT: Skip unnecessary steps, go straight to goal

**PREVIOUS ACTIONS:** ${JSON.stringify(taskHistory)}
**CURRENT PAGE ELEMENTS:** ${JSON.stringify(pageData.interactiveElements?.slice(0, 20))}
**CLIPBOARD DATA:** ${clipboardData ? `"${clipboardData}"` : "empty"}

What is the IMMEDIATE next action to complete this task?`;
}

async function callApiWithBackoff(userPrompt) {
  const systemPrompt = `You are "Aura Co-Pilot" - the world's most intelligent browser automation agent. You are lightning-fast, strategic, and flawlessly execute complex tasks. Your response MUST be a single, valid JSON object.

**PROTOCOL: Think → Plan → Execute → Verify**

**DIRECT NAVIGATION INTELLIGENCE:**
For site requests, go DIRECTLY to the correct URL:
- "open yt" or "youtube" → https://www.youtube.com
- "open google" → https://www.google.com
- "open docs" or "google docs" → https://docs.google.com
- "open gmail" → https://mail.google.com
- "open chatgpt" → https://chat.openai.com
- "open amazon" → https://www.amazon.com
- "open facebook" → https://www.facebook.com
- "open twitter" or "open x" → https://www.twitter.com
- "open instagram" → https://www.instagram.com
- "open linkedin" → https://www.linkedin.com
- "open github" → https://www.github.com
- "open reddit" → https://www.reddit.com
- "open netflix" → https://www.netflix.com
- "open spotify" → https://www.spotify.com
NEVER go to google.com first unless specifically asked to search!

**TASK COMPLETION INTELLIGENCE:**
- E-commerce: Find products AND add to cart (complete the purchase flow)
- Document creation: Create AND write content AND format AND rename files
- Messaging: Navigate to platform AND send the actual message
- Search tasks: Find specific items, not generic results
- Always complete the FULL task, not just the first step

**SPEED OPTIMIZATION:**
- Execute actions immediately without unnecessary delays
- Skip confirmation pages and popups when possible
- Use the most direct path to complete tasks
- Avoid redundant navigation or verification steps
- Focus on task completion, not exploration

**Available Actions:**
- \`navigate\`: Go directly to URLs (use exact URLs, not search)
- \`type\`: Enter text into inputs (complete text, not fragments)
- \`click\`: Click elements (be precise with selectors)
- \`scroll\`: Scroll page (only when needed to find elements)
- \`read_text\`: Read element text (for verification only)
- \`copy_image_url\`: Copy image URLs
- \`paste\`: Paste clipboard content
- \`finish\`: Complete task (only when 100% verified complete)
- \`wait\`: Brief pause (only if page needs loading time)

**INTELLIGENCE RULES:**
1. **Be Direct**: Use exact URLs, precise selectors, complete actions
2. **Be Fast**: No unnecessary steps or delays
3. **Be Complete**: Finish the entire task, not just part of it
4. **Be Smart**: Learn from context, adapt to page changes
5. **Be Efficient**: Shortest path to goal

**Response Format:**
{
  "action": "action_name",
  "selector": "css_selector_if_needed",
  "text": "complete_text_to_type",
  "url": "exact_url_to_navigate",
  "direction": "scroll_direction_if_needed",
  "message": "brief_action_description",
  "reasoning": "why_this_completes_the_task"
}`;

  const delay = Math.max(200, 1500 - (settings.executionSpeed * 250)); // Much faster execution
  await new Promise(resolve => setTimeout(resolve, delay));

  try {
    const response = await fetch(`${settings.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`
      },
      body: JSON.stringify({
        "model": settings.modelName,
        "messages": [
          { "role": "system", "content": systemPrompt },
          { "role": "user", "content": userPrompt }
        ],
        "response_format": { "type": "json_object" },
        "temperature": settings.advancedMode ? 0.7 : 0.3 // Higher creativity in advanced mode
      }),
    });

    if (!response || !response.ok) {
      const errorBody = response ? await response.text() : "Network error";
      throw new Error(`API error ${response ? response.status : ''}: ${errorBody}`);
    }

    return await response.json();
  } catch (error) {
    console.error('🚨 API call failed:', error);
    throw error;
  }
}

async function presentChoicesToUser(options, question) {
  logToPopup(`❓ Clarification needed: ${question}`);

  try {
    chrome.runtime.sendMessage({
      type: 'PRESENT_CHOICES',
      question: question,
      options: options
    });
  } catch (e) {
    console.log('📭 No UI to present choices to');
  }

  // Set a timeout to handle user not responding
  clarificationTimeout = setTimeout(() => {
    if (agentState === 'clarifying') {
      logToPopup("⏰ No response received. Continuing with best guess...");
      agentState = 'running';
      // Continue with first option as default
      handleUserChoice(options[0]);
    }
  }, 30000); // 30 second timeout
}

function handleUserChoice(choice) {
  if (agentState !== 'clarifying') {
    logToPopup("🤔 Received choice but agent is not waiting for clarification");
    return;
  }

  if (clarificationTimeout) {
    clearTimeout(clarificationTimeout);
    clarificationTimeout = null;
  }

  agentState = 'running';
  updateStatus('running', `👤 User chose: ${choice}`);

  // Add the user's choice to task history and continue
  taskHistory.push({
    action: { action: "clarify", choice: choice },
    status: 'success'
  });

  // Get current tab and continue scanning
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      setTimeout(() => scanCurrentPage(tabs[0].id), 500);
    }
  });
}

async function executeAction(action) {
  if (agentState !== 'running') return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) {
    handleTaskError("No active tab found");
    return;
  }

  const tabId = tab.id;

  try {
    logToPopup(`⚡ Executing: ${action.action} - ${action.message || action.reasoning || ''}`);

    if (['click', 'type', 'paste', 'scroll'].includes(action.action)) {
      await chrome.debugger.attach({ tabId: tabId }, "1.3");
    }

    switch (action.action) {
      case 'navigate':
        await chrome.tabs.update(tabId, { url: action.url });
        break;

      case 'copy_image_url':
      case 'read_text':
        chrome.tabs.sendMessage(tabId, {
          type: action.action.toUpperCase(),
          selector: action.selector
        });
        return; // Exit early, will continue when data is received

      case 'paste':
        if (!clipboardData) throw new Error("Clipboard is empty");
        await chrome.debugger.sendCommand({ tabId: tabId }, "Input.insertText", { text: clipboardData });
        break;

      case 'scroll':
        const scrollAmount = action.direction === 'down' ? 'window.innerHeight' : '-window.innerHeight';
        await chrome.debugger.sendCommand({ tabId: tabId }, 'Runtime.evaluate', {
          expression: `window.scrollBy(0, ${scrollAmount})`
        });
        break;

      case 'click':
      case 'type':
        const coords = await getElementCoordinates(tabId, action.selector);
        if (!coords) throw new Error("Element not found or not visible");

        await new Promise(resolve => setTimeout(resolve, 100)); // Minimal wait for animations

        // Click the element
        await chrome.debugger.sendCommand({ tabId: tabId }, "Input.dispatchMouseEvent", {
          type: "mousePressed", button: "left", x: coords.x, y: coords.y, clickCount: 1
        });
        await chrome.debugger.sendCommand({ tabId: tabId }, "Input.dispatchMouseEvent", {
          type: "mouseReleased", button: "left", x: coords.x, y: coords.y, clickCount: 1
        });

        // If typing, enter the text
        if (action.action === 'type' && action.text) {
          for (const char of action.text) {
            await chrome.debugger.sendCommand({ tabId: tabId }, "Input.dispatchKeyEvent", {
              type: 'keyDown', text: char
            });
            await chrome.debugger.sendCommand({ tabId: tabId }, "Input.dispatchKeyEvent", {
              type: 'keyUp', text: char
            });
          }
        }
        break;

      default:
        throw new Error(`Unknown action type: ${action.action}`);
    }

    taskHistory.push({ action, status: 'success' });
    retryCount = 0; // Reset retry count on success

    logToPopup(`✅ Action completed: ${action.action}`);

  } catch (error) {
    console.error(`🚨 Action failed:`, error);
    logToPopup(`❌ ${action.action} failed: ${error.message}`);
    taskHistory.push({ action, status: 'failed', reason: error.message });

    // Handle intelligent retry logic
    if (settings.smartRecovery && retryCount < maxRetries) {
      retryCount++;
      logToPopup(`🔄 Smart recovery attempt ${retryCount}/${maxRetries}`);
      setTimeout(() => scanCurrentPage(tabId), 2000);
      return;
    } else if (retryCount >= maxRetries) {
      handleTaskError(`Max retries (${maxRetries}) exceeded for action: ${action.action}`);
      return;
    }

  } finally {
    if (['click', 'type', 'paste', 'scroll'].includes(action.action)) {
      await chrome.debugger.detach({ tabId: tabId }).catch(() => { });
    }
  }

  // Continue to next step with faster timing
  const continuationDelay = Math.max(500, 1500 - (settings.executionSpeed * 200)); // Much faster
  setTimeout(() => {
    if (agentState === 'running') scanCurrentPage(tabId);
  }, continuationDelay);
}

async function getElementCoordinates(tabId, selector) {
  const getCoords = (selector) => {
    const element = document.querySelector(selector);
    if (!element) return null;
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const rect = element.getBoundingClientRect();
    return {
      x: Math.round(rect.left + rect.width / 2),
      y: Math.round(rect.top + rect.height / 2)
    };
  };

  const results = await chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: getCoords,
    args: [selector]
  });

  return (results && results[0] && results[0].result) ? results[0].result : null;
}

function handleTaskError(errorMessage) {
  console.error('🚨 Task error:', errorMessage);
  updateStatus('error', `❌ Error: ${errorMessage}`);

  if (settings.smartRecovery && retryCount < maxRetries) {
    retryCount++;
    logToPopup(`🔄 Smart recovery attempt ${retryCount}/${maxRetries}: ${errorMessage}`);

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && agentState === 'running') {
        setTimeout(() => scanCurrentPage(tabs[0].id), 3000);
      }
    });
  } else {
    agentState = 'idle';
    updateStatus('error', `❌ Task failed: ${errorMessage}`);
    cleanupAfterTask();
  }
}

function logToPopup(message) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] ${message}`);

  try {
    chrome.runtime.sendMessage({
      type: 'LOG_MESSAGE',
      message: message,
      timestamp: timestamp
    }, () => {
      // Suppress "Receiving end does not exist" error
      void chrome.runtime.lastError;
    });
  } catch (e) {
    // Ignore synchronous errors
  }
}
