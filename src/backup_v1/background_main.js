// background.js - Aura Co-Pilot Backend
'use strict';

console.log('🚀 Aura Co-Pilot Backend Starting...');

// --- Core State ---
let settings = { apiKey: '', baseUrl: '', modelName: '' };
let agentState = 'idle'; // 'idle', 'running', 'clarifying'
let taskHistory = [];
let currentTask = '';
let clarificationTimeout = null;
let clipboardData = null;

// --- Message Types for Aura UI Compatibility ---
const MESSAGE_TYPES = {
  PING: 'PING',
  EXECUTE_TASK: 'EXECUTE_TASK',
  UPDATE_SETTINGS: 'UPDATE_SETTINGS',
  PAGE_DATA: 'PAGE_DATA',
  TERMINATE_TASK: 'TERMINATE_TASK',
  COPIED_DATA: 'COPIED_DATA',
  USER_CHOICE: 'USER_CHOICE',
  SCAN_PAGE: 'SCAN_PAGE',
  CLEANUP_UI: 'CLEANUP_UI',
  STATUS_UPDATE: 'STATUS_UPDATE',
  LOG_MESSAGE: 'LOG_MESSAGE',
  TASK_RESULT: 'TASK_RESULT',
  PRESENT_CHOICES: 'PRESENT_CHOICES',
};

console.log('✅ Backend initialized');

// --- Service Worker Lifecycle ---
chrome.runtime.onInstalled.addListener(() => {
  try {
    console.log('🚀 Extension installed');
    chrome.storage.local.set({
      apiKey: '',
      baseUrl: '',
      modelName: '',
      configured: false
    });
    agentState = 'idle';
    console.log('✅ Installation completed');
  } catch (error) {
    console.error('❌ Installation error:', error);
  }
});

chrome.runtime.onStartup.addListener(() => {
  try {
    console.log('🔄 Service worker started');
    agentState = 'idle';
    console.log('✅ Startup completed');
  } catch (error) {
    console.error('❌ Startup error:', error);
  }
});

// --- Chrome Message Listeners ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Message received:', request.type);

  try {
    switch (request.type) {
      case MESSAGE_TYPES.PING:
        handlePing(sendResponse);
        break;
      case MESSAGE_TYPES.EXECUTE_TASK:
        handleExecuteTask(request.task);
        sendResponse({ success: true, message: 'Task started' });
        break;
      case MESSAGE_TYPES.UPDATE_SETTINGS:
        settings = request.settings;
        chrome.storage.local.set(settings);
        sendResponse({ success: true, message: 'Settings updated' });
        break;
      case MESSAGE_TYPES.PAGE_DATA:
        handlePageData(request.data, sender.tab?.id);
        sendResponse({ success: true, message: 'Page data processed' });
        break;
      case MESSAGE_TYPES.TERMINATE_TASK:
        terminateTaskByUser();
        sendResponse({ success: true, message: 'Task terminated' });
        break;
      case MESSAGE_TYPES.COPIED_DATA:
        handleCopiedData(request.data, sender.tab);
        sendResponse({ success: true, message: 'Data processed' });
        break;
      case MESSAGE_TYPES.USER_CHOICE:
        handleUserChoice(request.choice);
        sendResponse({ success: true, message: 'Choice processed' });
        break;
      default:
        console.log('❓ Unknown message type:', request.type);
        sendResponse({ success: true, message: 'Message acknowledged' });
    }
  } catch (error) {
    console.error('❌ Message handler error:', error);
    sendResponse({ success: false, error: error.message });
  }

  return true; // Keep the message channel open for asynchronous responses
});

function handlePing(sendResponse) {
  console.log('🏓 Ping received');
  sendResponse({
    success: true,
    message: 'Backend active',
    state: agentState
  });
}

function handleCopiedData(data, tab) {
  console.log('📎 Copied data received');
  clipboardData = data;
  logToUI(`Copied data: ${clipboardData}`);
  if (agentState === 'running' && tab) {
    taskHistory.push({
      action: { action: "copy_image_url" },
      status: 'success',
      timestamp: Date.now()
    });
    setTimeout(() => scanCurrentPage(tab.id), 500);
  }
}


// --- Core Agent Logic ---
async function handleExecuteTask(task) {
  if (agentState !== 'idle') {
    logToUI("Agent is already busy.");
    return;
  }

  console.log("Checking API settings...");
  const storedSettings = await chrome.storage.local.get(['apiKey', 'baseUrl', 'modelName']);
  console.log("Stored settings:", {
    hasApiKey: !!storedSettings.apiKey,
    hasBaseUrl: !!storedSettings.baseUrl,
    hasModelName: !!storedSettings.modelName
  });

  // Check if API settings are properly configured
  if (!storedSettings.apiKey || !storedSettings.baseUrl || !storedSettings.modelName) {
    updateStatus('error', "ERROR: API settings are not fully configured. Please set API key, base URL, and model in popup.");
    broadcastMessage(MESSAGE_TYPES.TASK_RESULT, {
      result: 'Please configure API settings in popup first.'
    });
    return;
  }
  settings = storedSettings;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) {
    updateStatus('error', "Error: No active tab found.");
    return;
  }

  // Handle starting from a new tab page
  if (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:')) {
    logToUI("On a system page. Navigating to Google to begin task...");
    agentState = 'running';
    currentTask = task;
    taskHistory = [];
    clipboardData = null;
    updateStatus('running', `Starting task: "${task}"`);

    chrome.tabs.update(tab.id, { url: "https://www.google.com" }, (updatedTab) => {
      const listener = (tabId, info) => {
        if (tabId === updatedTab.id && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          // Give the page a moment to settle before scanning
          setTimeout(() => scanCurrentPage(tabId), 500);
        }
      };
      chrome.tabs.onUpdated.addListener(listener);
    });
    return;
  }

  agentState = 'running';
  currentTask = task;
  taskHistory = [];
  clipboardData = null;
  updateStatus('running', `Starting task: "${task}"`);
  scanCurrentPage(tab.id);
}

function scanCurrentPage(tabId) {
  if (agentState !== 'running') return;
  logToUI("Scanning page...");
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    files: ['content.js'],
  }, () => {
    if (chrome.runtime.lastError) {
      updateStatus('error', `Injection failed: ${chrome.runtime.lastError.message}.`);
      agentState = 'idle';
    } else {
      chrome.tabs.sendMessage(tabId, { type: 'SCAN_PAGE' });
    }
  });
}

// --- AI Processing ---
// --- AI Processing ---
async function handlePageData(pageData, tabId) {
  if (agentState !== 'running') return;
  logToUI("Page data received. AI is planning next step...");

  const userPrompt = `User Task: "${currentTask}"\nTask History: ${JSON.stringify(taskHistory)}\nCurrent Page State: ${JSON.stringify(pageData)}\nClipboard: ${clipboardData ? `"${clipboardData}"` : "empty"}\nBased on all this, what is the single next action?`;

  try {
    const result = await callApiWithBackoff(userPrompt);
    if (!result) {
      agentState = 'idle';
      updateStatus('error', 'API call failed.');
      return;
    }
    const action = JSON.parse(result.choices[0].message.content);

    if (!action.action) {
      throw new Error("AI response was malformed.");
    }

    logToUI(`AI Decision: ${JSON.stringify(action)}`);

    if (action.action === 'finish') {
      agentState = 'idle';
      updateStatus('finished', `Task finished by agent: ${action.message}`);
      broadcastMessage(MESSAGE_TYPES.TASK_RESULT, { result: `Task completed: ${action.message}` });
      cleanupAfterTask();
    } else if (action.action === 'clarify') {
      agentState = 'clarifying';
      updateStatus('clarifying', action.question);
      presentChoicesToUser(action.options, action.question);
    } else {
      executeAction(action, tabId);
    }
  } catch (error) {
    updateStatus('error', `Error processing AI response: ${error.message}`);
    taskHistory.push({ action: { action: "error" }, status: 'failed', reason: error.message });
    // Get current tab to scan again after error
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && agentState === 'running') {
        setTimeout(() => scanCurrentPage(tabs[0].id), 1500);
      }
    });
  }
}

// --- System Prompt ---
async function callApiWithBackoff(userPrompt) {
  const systemPrompt = `You are a browser agent. You are intelligent, accurate, and fast. Your response MUST be a single, valid JSON object.

    **Primary Directive: Think, Plan, Execute, Verify.**

    **Core Logic:**
    1.  **Deconstruct the Goal**: Understand the user's true intent. "Find a good image of Obama and send it to my num" is a multi-stage plan, not a single action.
    2.  **Create a Plan**: Formulate a logical, step-by-step plan to achieve the goal.
    3.  **Execute One Step**: Decide the single next action from your plan.
    4.  **Verify**: After execution, on the next cycle, you will get a new 'Page State'. You MUST check it to verify your last action succeeded before proceeding.
    5.  **Avoid clickbait**: If the action leads to misleading or irrelevant content, you must return to previous page and close that unrelated or unwanted tab.
    6.  **ZERO MISTAKES**: If an action fails or verification shows it didn't work, you are FORBIDDEN from repeating it. Re-evaluate the page state and create a new plan.
    7.  **Use Your Superpowers**:
        - \`navigate\`: To go to a URL.
        - \`type\`: For all text input.
        - \`click\`: For buttons and links.
        - \`scroll\`: To see more of the page. Use this if you can't find an element. \`{"action": "scroll", "direction": "down"}\`
        - \`read_text\`: To read the text from an element if the label is insufficient. \`{"action": "read_text", "selector": "..."}\`
        - \`copy_image_url\`: To get an image's URL.
        - \`paste\`: To paste from the clipboard.
        - \`finish\`: Only when the final goal is 100% complete and verified.`;

  const response = await fetch(`${settings.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${settings.apiKey}` },
    body: JSON.stringify({
      "model": settings.modelName,
      "messages": [{ "role": "system", "content": systemPrompt }, { "role": "user", "content": userPrompt }],
      "response_format": { "type": "json_object" }
    }),
  }).catch(e => { updateStatus('error', `API fetch error: ${e.message}`); return null; });

  if (!response || !response.ok) {
    const errorBody = response ? await response.text() : "Network error";
    updateStatus('error', `API error ${response ? response.status : ''}: ${errorBody}`);
    return null;
  }
  return await response.json();
}

// --- Action Execution ---
// --- Action Execution ---
async function executeAction(action, tabId) {
  if (agentState !== 'running') return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) {
    updateStatus('error', "No active tab found.");
    agentState = 'idle';
    return;
  }
  tabId = tab.id;

  try {
    // Attach debugger for precise actions
    if (['click', 'type', 'paste', 'scroll'].includes(action.action)) {
      await chrome.debugger.attach({ tabId: tabId }, "1.3");
    }

    switch (action.action) {
      case 'navigate':
        await chrome.tabs.update(tabId, { url: action.url });
        break;

      case 'copy_image_url':
      case 'read_text': // These are handled by the content script
        chrome.tabs.sendMessage(tabId, { type: action.action.toUpperCase(), selector: action.selector });
        return; // Exit early

      case 'paste':
        if (!clipboardData) throw new Error("Clipboard is empty.");
        await chrome.debugger.sendCommand({ tabId: tabId }, "Input.insertText", { text: clipboardData });
        break;

      case 'scroll':
        const scrollAmount = action.direction === 'down' ? 'window.innerHeight' : '-window.innerHeight';
        await chrome.debugger.sendCommand({ tabId: tabId }, 'Runtime.evaluate', { expression: `window.scrollBy(0, ${scrollAmount})` });
        break;

      case 'click':
      case 'type':
        // Precise coordinate-based clicking
        const getCoords = (selector) => {
          const element = document.querySelector(selector);
          if (!element) return null;
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          const rect = element.getBoundingClientRect();
          return { x: Math.round(rect.left + rect.width / 2), y: Math.round(rect.top + rect.height / 2) };
        };
        const results = await chrome.scripting.executeScript({
          target: { tabId: tabId },
          func: getCoords,
          args: [action.selector]
        });

        if (!results || !results[0] || !results[0].result) throw new Error("Element not found or not visible.");
        const coords = results[0].result;

        await new Promise(resolve => setTimeout(resolve, 300)); // Short delay for scroll to finish

        // Precise mouse events
        await chrome.debugger.sendCommand({ tabId: tabId }, "Input.dispatchMouseEvent", { type: "mousePressed", button: "left", x: coords.x, y: coords.y, clickCount: 1 });
        await chrome.debugger.sendCommand({ tabId: tabId }, "Input.dispatchMouseEvent", { type: "mouseReleased", button: "left", x: coords.x, y: coords.y, clickCount: 1 });

        if (action.action === 'type') {
          // Character-by-character typing for reliability
          for (const char of action.text) {
            await chrome.debugger.sendCommand({ tabId: tabId }, "Input.dispatchKeyEvent", { type: 'keyDown', text: char });
            await chrome.debugger.sendCommand({ tabId: tabId }, "Input.dispatchKeyEvent", { type: 'keyUp', text: char });
          }
        }
        break;

      default:
        throw new Error(`Unknown action type: ${action.action}`);
    }

    taskHistory.push({ action, status: 'success' });
    logToUI(`✅ ${action.action.charAt(0).toUpperCase() + action.action.slice(1)} completed`);

  } catch (e) {
    logToUI(`❌ ${action.action.charAt(0).toUpperCase() + action.action.slice(1)} failed: ${e.message}`);
    taskHistory.push({ action, status: 'failed', reason: e.message });
  } finally {
    // Always clean up debugger
    if (['click', 'type', 'paste', 'scroll'].includes(action.action)) {
      await chrome.debugger.detach({ tabId: tabId }).catch(() => { });
    }
  }

  // Continue scanning after action
  setTimeout(() => { if (agentState === 'running') scanCurrentPage(tabId); }, 2000);
}

// --- Individual Action Implementations ---
async function executeNavigate(tabId, url) {
  try {
    console.log('🌐 Navigating to:', url);
    await chrome.tabs.update(tabId, { url });
    return await new Promise((resolve) => {
      const listener = (updatedTabId, info) => {
        if (updatedTabId === tabId && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          resolve(true);
        }
      };
      chrome.tabs.onUpdated.addListener(listener);
      setTimeout(() => {
        chrome.tabs.onUpdated.removeListener(listener);
        console.warn('Navigation timeout, assuming success');
        resolve(true); // Consider successful even if timeout
      }, 10000);
    });
  } catch (error) {
    console.error('❌ Navigation failed:', error);
    return false;
  }
}

async function executeClick(tabId, selector) {
  return await executeScriptOnPage(tabId, (sel) => {
    const element = document.querySelector(sel);
    if (!element) throw new Error('Element not found');
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    element.click();
  }, [selector], `Clicked: ${selector}`);
}

async function executeType(tabId, selector, text) {
  return await executeScriptOnPage(tabId, (sel, txt) => {
    const element = document.querySelector(sel);
    if (!element) throw new Error('Element not found');
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    element.focus();
    element.value = txt;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    if (element.type === 'search' || element.name === 'q') {
      element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    }
  }, [selector, text], `Typed: ${text}`);
}

async function executeScroll(tabId, direction) {
  return await executeScriptOnPage(tabId, (dir) => {
    const scrollAmount = dir === 'down' ? window.innerHeight : -window.innerHeight;
    window.scrollBy({ top: scrollAmount, behavior: 'smooth' });
  }, [direction], `Scrolled ${direction}`);
}

// --- Clarification & User Choice Handling ---
async function presentChoicesToUser(options, question) {
  logToUI(`Clarification needed: ${question}`);
  broadcastMessage(MESSAGE_TYPES.PRESENT_CHOICES, {
    question: question,
    options: options
  });

  // Set a timeout to handle user not responding
  clarificationTimeout = setTimeout(() => {
    if (agentState === 'clarifying') {
      logToUI("No response received. Terminating task.");
      terminateTaskByUser();
    }
  }, 30000); // 30 second timeout
}

function handleUserChoice(choice) {
  if (agentState !== 'clarifying') {
    logToUI("Received choice but agent is not in clarifying state.");
    return;
  }

  if (clarificationTimeout) {
    clearTimeout(clarificationTimeout);
    clarificationTimeout = null;
  }

  agentState = 'running';
  updateStatus('running', `User chose: ${choice}`);

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

// --- Task Management & Cleanup ---
function terminateTaskByUser() {
  if (agentState === 'idle') return;
  agentState = 'idle';
  updateStatus('terminated', 'Task terminated by user.');
  broadcastMessage(MESSAGE_TYPES.TASK_RESULT, { result: 'Task terminated by user' });
  cleanupAfterTask();
}

function cleanupAfterTask() {
  if (clarificationTimeout) clearTimeout(clarificationTimeout);
  taskHistory = [];
  currentTask = '';
  clipboardData = null;
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.debugger.detach({ tabId: tabs[0].id }).catch(e => { });
      chrome.tabs.sendMessage(tabs[0].id, { type: MESSAGE_TYPES.CLEANUP_UI }).catch(e => { });
    }
  });
}

// --- UI & State Management ---
function updateStatus(state, message) {
  try {
    const statusMap = {
      idle: { text: 'Idle', color: '#4CAF50' },
      running: { text: 'Running...', color: '#FFC107' },
      clarifying: { text: 'Waiting for Input...', color: '#2196F3' },
      finished: { text: 'Finished', color: '#4CAF50' },
      terminated: { text: 'Terminated', color: '#F44336' },
      error: { text: 'Error', color: '#F44336' }
    };

    console.log('🔄 Status update:', state, message);
    broadcastMessage(MESSAGE_TYPES.STATUS_UPDATE, {
      status: statusMap[state]
    });

    if (message) logToUI(message);
  } catch (error) {
    console.error('❌ Status update error:', error);
  }
}

function logToUI(message) {
  try {
    console.log('📝 Log:', message);
    broadcastMessage(MESSAGE_TYPES.LOG_MESSAGE, { message, level: 'info' });
  } catch (error) {
    console.error('❌ Log function error:', error);
  }
}

function broadcastMessage(type, data) {
  try {
    chrome.runtime.sendMessage({ type, ...data }).catch(() => {
      // Ignore errors when no receivers
    });
  } catch (error) {
    console.log('📤 Broadcast error (ignored):', error.message);
  }
}

// --- Keep Service Worker Alive (Same as before) ---
setInterval(() => {
  console.log('💓 Service worker heartbeat:', new Date().toLocaleTimeString());
}, 25000);

console.log('✅ Aura Co-Pilot Backend Ready');
