// popup.js - Aura Co-Pilot Settings
document.addEventListener('DOMContentLoaded', function () {
  console.log('🔧 Popup loaded, starting diagnostics...');

  // Test chrome.storage availability
  if (typeof chrome.storage === 'undefined') {
    console.error('❌ chrome.storage is not available!');
    return;
  }

  console.log('✅ chrome.storage is available');

  // Elements
  const modelFilter = document.getElementById('model-filter');
  const modelDropdown = document.getElementById('model-dropdown');
  const selectedModelInput = document.getElementById('selected-model');
  const apiEndpoint = document.getElementById('api-endpoint');
  const apiKey = document.getElementById('api-key');
  const saveBtn = document.getElementById('save-btn');
  const resetBtn = document.getElementById('reset-btn');
  const advancedBtn = document.getElementById('advanced-settings-btn');
  const backBtn = document.getElementById('back-btn');
  const taskDuration = document.getElementById('task-duration');
  const durationDisplay = document.getElementById('duration-display');
  const togglePassword = document.getElementById('toggle-password');
  const contentWrapper = document.querySelector('.popup-content-wrapper');
  const notificationContainer = document.querySelector('.notification-container');

  let currentPanel = 'main';

  // Initialize everything
  init();

  async function init() {
    try {
      // Test storage operations first
      await testStorageOperations();

      // Load existing settings
      await loadSettings();

      // Setup all components
      setupCustomDropdown();
      setupSliders();
      setupEventListeners();

      console.log('✅ Popup initialization complete');
    } catch (error) {
      console.error('❌ Popup initialization failed:', error);
      showNotification('Initialization failed', 'error');
    }
  }

  async function testStorageOperations() {
    console.log('🧪 Testing storage operations...');

    try {
      // Test write
      await new Promise((resolve, reject) => {
        chrome.storage.local.set({ test: 'diagnostic' }, () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            console.log('✅ Storage write test passed');
            resolve();
          }
        });
      });

      // Test read
      await new Promise((resolve, reject) => {
        chrome.storage.local.get('test', (result) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else if (result.test === 'diagnostic') {
            console.log('✅ Storage read test passed');
            resolve();
          } else {
            reject(new Error('Storage read test failed - value mismatch'));
          }
        });
      });

      // Clean up
      chrome.storage.local.remove('test');
      console.log('✅ Storage operations working correctly');

    } catch (error) {
      console.error('❌ Storage operations failed:', error);
      throw error;
    }
  }

  async function loadSettings() {
    console.log('📖 Loading settings...');

    return new Promise((resolve) => {
      chrome.storage.local.get(null, (settings) => {
        if (chrome.runtime.lastError) {
          console.error('❌ Failed to load settings:', chrome.runtime.lastError);
          resolve();
          return;
        }

        console.log('📦 Raw settings from storage:', {
          ...settings,
          apiKey: settings.apiKey ? '***hidden***' : '(empty)'
        });

        // Check what we actually have
        const hasModel = settings.model && settings.model.trim();
        const hasEndpoint = settings.endpoint && settings.endpoint.trim();
        const hasApiKey = settings.apiKey && settings.apiKey.trim();

        console.log('🔍 Settings analysis:', {
          hasModel: !!hasModel,
          hasEndpoint: !!hasEndpoint,
          hasApiKey: !!hasApiKey,
          configured: settings.configured
        });

        // Populate form with loaded settings (NO automatic endpoint override)
        if (settings.model) {
          selectedModelInput.value = settings.model;
          updateModelFilterDisplay(settings.model);
        } else {
          // Set default model only
          selectedModelInput.value = 'gpt-4o';
          updateModelFilterDisplay('gpt-4o');
        }

        // ALWAYS respect user's custom endpoint - never override it
        if (settings.endpoint) {
          apiEndpoint.value = settings.endpoint;
        } else {
          // Only set default if no saved endpoint exists
          apiEndpoint.value = 'https://aiproxy.9qw.ru/v1';
        }

        if (settings.apiKey) {
          apiKey.value = settings.apiKey;
        }

        // Load checkboxes
        const autoAssist = document.getElementById('auto-assist');
        const localProcessing = document.getElementById('local-processing');

        if (autoAssist) autoAssist.checked = settings.autoAssist !== false;
        if (localProcessing) localProcessing.checked = settings.localProcessing !== false;

        // Load task duration
        if (taskDuration) {
          taskDuration.value = settings.taskDuration || 2;
          updateDurationDisplay();
        }

        resolve();
      });
    });
  }

  function setupCustomDropdown() {
    if (!modelFilter || !modelDropdown) return;

    const options = modelDropdown.querySelectorAll('.select-option');

    // Set default selection
    const defaultOption = modelDropdown.querySelector('.select-option[data-value="gpt-4o"]');
    if (defaultOption && !selectedModelInput.value) {
      selectOption(defaultOption, false); // false = don't change endpoint
    }

    // Handle input filtering
    modelFilter.addEventListener('input', () => {
      const filter = modelFilter.value.toLowerCase();
      let hasVisibleOptions = false;

      options.forEach(option => {
        const name = option.querySelector('.model-name').textContent.toLowerCase();
        const isVisible = name.includes(filter);
        option.style.display = isVisible ? 'flex' : 'none';
        if (isVisible) hasVisibleOptions = true;
      });

      if (hasVisibleOptions) {
        modelDropdown.classList.add('active');
      }
    });

    // Handle focus and click
    modelFilter.addEventListener('focus', () => {
      modelDropdown.classList.add('active');
    });

    modelFilter.addEventListener('click', () => {
      modelDropdown.classList.add('active');
    });

    // Handle option selection
    modelDropdown.addEventListener('click', (e) => {
      const option = e.target.closest('.select-option');
      if (option) {
        selectOption(option, false); // false = don't change endpoint
        modelDropdown.classList.remove('active');
      }
    });

    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.custom-select-container')) {
        modelDropdown.classList.remove('active');
      }
    });

    // Handle keyboard navigation
    modelFilter.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const visibleOption = modelDropdown.querySelector('.select-option:not([style*="none"])');
        if (visibleOption) {
          selectOption(visibleOption, false); // false = don't change endpoint
          modelDropdown.classList.remove('active');
        }
      } else if (e.key === 'Escape') {
        modelDropdown.classList.remove('active');
      }
    });

    // Modified selectOption function - user controls endpoint
    function selectOption(option, changeEndpoint = false) {
      // Remove previous selection
      options.forEach(opt => opt.classList.remove('selected'));

      // Select new option
      option.classList.add('selected');
      const modelName = option.querySelector('.model-name').textContent;
      const modelValue = option.dataset.value;
      const suggestedEndpoint = option.dataset.endpoint;

      modelFilter.value = modelName;
      selectedModelInput.value = modelValue;

      // Only change endpoint if explicitly requested (like on reset or first load)
      if (changeEndpoint && suggestedEndpoint && apiEndpoint) {
        apiEndpoint.value = suggestedEndpoint;
        console.log('🔄 Endpoint updated to suggested value:', suggestedEndpoint);
      }

      console.log('🔄 Model selected:', {
        modelName,
        modelValue,
        endpointChanged: changeEndpoint,
        currentEndpoint: apiEndpoint?.value
      });

      // Show endpoint recommendation without changing it
      if (!changeEndpoint && suggestedEndpoint) {
        showEndpointRecommendation(modelName, suggestedEndpoint);
      }
    }

    // Show non-intrusive endpoint recommendation
    function showEndpointRecommendation(modelName, suggestedEndpoint) {
      const currentEndpoint = apiEndpoint?.value.trim();

      // Only show if current endpoint is different from suggestion
      if (currentEndpoint && currentEndpoint !== suggestedEndpoint) {
        console.log(`💡 Endpoint recommendation for ${modelName}: ${suggestedEndpoint}`);

        // You can add a small info tooltip here if desired
        // For now, just log the recommendation
        setTimeout(() => {
          showNotification(
            `💡 Recommended endpoint for ${modelName}: ${suggestedEndpoint}`,
            'info',
            5000
          );
        }, 500);
      }
    }
  }

  function updateModelFilterDisplay(modelValue) {
    if (!modelDropdown) return;

    const option = modelDropdown.querySelector(`[data-value="${modelValue}"]`);
    if (option) {
      const modelName = option.querySelector('.model-name').textContent;
      modelFilter.value = modelName;

      // Update selected state
      modelDropdown.querySelectorAll('.select-option').forEach(opt =>
        opt.classList.remove('selected')
      );
      option.classList.add('selected');
    }
  }

  function setupSliders() {
    if (!taskDuration || !durationDisplay) return;

    // Initialize duration display
    updateDurationDisplay();

    // Handle slider changes
    taskDuration.addEventListener('input', () => {
      updateDurationDisplay();

      // Auto-save duration change
      const currentValue = parseInt(taskDuration.value);
      chrome.storage.local.set({ taskDuration: currentValue }, () => {
        if (!chrome.runtime.lastError) {
          console.log('🔄 Task duration updated:', currentValue, 'minutes');
        }
      });
    });
  }

  function updateDurationDisplay() {
    if (!taskDuration || !durationDisplay) return;

    const minutes = parseInt(taskDuration.value);
    let displayText;

    if (minutes < 60) {
      displayText = `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      if (remainingMinutes === 0) {
        displayText = `${hours} hour${hours !== 1 ? 's' : ''}`;
      } else {
        displayText = `${hours}h ${remainingMinutes}m`;
      }
    }

    durationDisplay.textContent = displayText;
  }

  function setupEventListeners() {
    // Save button
    if (saveBtn) {
      saveBtn.addEventListener('click', saveSettings);
    }

    // Reset button
    if (resetBtn) {
      resetBtn.addEventListener('click', resetSettings);
    }

    // Advanced settings button
    if (advancedBtn && contentWrapper) {
      advancedBtn.addEventListener('click', () => {
        console.log('🔧 Opening advanced settings');
        contentWrapper.style.transform = 'translateX(-50%)';
        currentPanel = 'advanced';
      });
    }

    // Back button
    if (backBtn && contentWrapper) {
      backBtn.addEventListener('click', () => {
        console.log('🔧 Returning to main settings');
        contentWrapper.style.transform = 'translateX(0%)';
        currentPanel = 'main';
      });
    }

    // Password toggle
    if (togglePassword && apiKey) {
      togglePassword.addEventListener('click', () => {
        const type = apiKey.type === 'password' ? 'text' : 'password';
        apiKey.type = type;
        console.log(type === 'text' ? '🔍 API key visible' : '🙈 API key hidden');
      });
    }

    // Add endpoint validation helper
    if (apiEndpoint) {
      apiEndpoint.addEventListener('blur', validateEndpointFormat);
      apiEndpoint.addEventListener('input', debounce(validateEndpointFormat, 500));
    }
  }

  function validateEndpointFormat() {
    if (!apiEndpoint) return;

    const endpoint = apiEndpoint.value.trim();
    if (!endpoint) return;

    try {
      new URL(endpoint);
      apiEndpoint.style.borderColor = ''; // Reset to default
      console.log('✅ Valid endpoint format:', endpoint);
    } catch (e) {
      apiEndpoint.style.borderColor = '#ef4444'; // Red border for invalid URL
      console.log('⚠️ Invalid endpoint format:', endpoint);
    }
  }

  // Utility function for debouncing
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  function saveSettings() {
    console.log('💾 Saving settings...');

    const model = selectedModelInput.value.trim();
    const endpoint = apiEndpoint.value.trim();
    const apiKeyValue = apiKey.value.trim();

    console.log('📝 Values to save:', {
      model: model || '(empty)',
      endpoint: endpoint || '(empty)',
      apiKey: apiKeyValue ? '***hidden***' : '(empty)'
    });

    // Validate required fields
    if (!model || !endpoint || !apiKeyValue) {
      const missing = [];
      if (!model) missing.push('Model');
      if (!endpoint) missing.push('Endpoint');
      if (!apiKeyValue) missing.push('API Key');

      console.error('❌ Validation failed. Missing:', missing.join(', '));
      showNotification(`Missing: ${missing.join(', ')}`, 'error');
      return;
    }

    // Validate endpoint URL
    try {
      new URL(endpoint);
    } catch (e) {
      console.error('❌ Invalid endpoint URL:', endpoint);
      showNotification('Please enter a valid API endpoint URL', 'error');
      return;
    }

    const settings = {
      model: model,
      endpoint: endpoint, // User-controlled endpoint
      apiKey: apiKeyValue,
      autoAssist: document.getElementById('auto-assist')?.checked || false,
      localProcessing: document.getElementById('local-processing')?.checked || false,
      taskDuration: parseInt(taskDuration?.value || 2),
      configured: true,
      lastUpdated: new Date().toISOString(),
      // J3 backend compatibility mappings
      baseUrl: endpoint,
      modelName: model
    };

    console.log('💾 Saving settings object:', {
      ...settings,
      apiKey: '***hidden***'
    });

    chrome.storage.local.set(settings, () => {
      if (chrome.runtime.lastError) {
        console.error('❌ Save failed:', chrome.runtime.lastError);
        showNotification('Save failed: ' + chrome.runtime.lastError.message, 'error');
      } else {
        console.log('✅ Settings saved successfully');
        showNotification('Settings saved successfully! 🚀', 'success');

        // Verify the save
        setTimeout(() => verifySavedSettings(settings), 100);

        // Notify extension components
        notifyExtensionComponents(settings);
      }
    });
  }

  function resetSettings() {
    console.log('🔄 Resetting settings...');

    if (!confirm('Are you sure you want to reset all settings to default values?')) {
      return;
    }

    chrome.storage.local.clear(() => {
      if (chrome.runtime.lastError) {
        console.error('❌ Reset failed:', chrome.runtime.lastError);
        showNotification('Reset failed: ' + chrome.runtime.lastError.message, 'error');
      } else {
        console.log('✅ Settings reset successfully');

        // Reset form values with your preferred defaults
        selectedModelInput.value = 'gpt-4o';
        updateModelFilterDisplay('gpt-4o');
        apiEndpoint.value = 'https://aiproxy.9qw.ru/v1'; // Your preferred default
        apiKey.value = '';

        const autoAssist = document.getElementById('auto-assist');
        const localProcessing = document.getElementById('local-processing');
        if (autoAssist) autoAssist.checked = true;
        if (localProcessing) localProcessing.checked = true;

        if (taskDuration) {
          taskDuration.value = 2;
          updateDurationDisplay();
        }

        showNotification('Settings reset to defaults', 'success');
      }
    });
  }

  // Rest of the functions remain the same...
  function verifySavedSettings(expectedSettings) {
    console.log('🔍 Verifying saved settings...');

    chrome.storage.local.get(null, (actualSettings) => {
      if (chrome.runtime.lastError) {
        console.error('❌ Verification failed:', chrome.runtime.lastError);
        return;
      }

      console.log('✅ Verification - settings in storage:', {
        ...actualSettings,
        apiKey: actualSettings.apiKey ? '***hidden***' : '(empty)'
      });

      const matches = {
        model: actualSettings.model === expectedSettings.model,
        endpoint: actualSettings.endpoint === expectedSettings.endpoint,
        apiKey: actualSettings.apiKey === expectedSettings.apiKey,
        configured: actualSettings.configured === true
      };

      console.log('🔍 Verification results:', matches);

      const allMatch = Object.values(matches).every(match => match);
      if (!allMatch) {
        console.error('❌ Settings verification failed!');
        showNotification('Settings may not have saved correctly', 'error');
      } else {
        console.log('✅ Settings verification passed');
      }
    });
  }

  function notifyExtensionComponents(settings) {
    console.log('📢 Notifying extension components...');

    // Notify background script with J3 format
    try {
      chrome.runtime.sendMessage({
        type: 'UPDATE_SETTINGS',
        settings: {
          apiKey: settings.apiKey,
          baseUrl: settings.endpoint,
          modelName: settings.model
        }
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.log('📭 Background script not responding:', chrome.runtime.lastError.message);
        } else {
          console.log('📬 Background script notified:', response);
        }
      });
    } catch (error) {
      console.error('❌ Failed to notify background script:', error);
    }

    // Notify all content scripts
    chrome.tabs.query({}, (tabs) => {
      if (chrome.runtime.lastError) {
        console.error('❌ Failed to query tabs:', chrome.runtime.lastError);
        return;
      }

      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          action: 'settingsUpdated',
          settings: {
            ...settings,
            apiKey: '***hidden***'
          }
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.log(`📭 Tab ${tab.id} - no content script`);
          } else {
            console.log(`📬 Tab ${tab.id} acknowledged settings update`);
          }
        });
      });
    });
  }

  function showNotification(message, type = 'info', duration = 3000) {
    console.log(`📢 Notification: ${message} (${type})`);

    if (!notificationContainer) {
      console.error('❌ Notification container not found');
      return;
    }

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;

    // Add icon based on type
    const iconSvg = type === 'success'
      ? '<svg class="notification-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"></path></svg>'
      : type === 'info'
        ? '<svg class="notification-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'
        : '<svg class="notification-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 18L18 6M6 6l12 12"></path></svg>';

    notification.innerHTML = `
      ${iconSvg}
      <span class="notification-text">${message}</span>
    `;

    notificationContainer.appendChild(notification);

    // Auto-remove after specified duration
    setTimeout(() => {
      if (notification.parentNode) {
        notification.classList.add('hiding');
        setTimeout(() => notification.remove(), 300);
      }
    }, duration);
  }
});