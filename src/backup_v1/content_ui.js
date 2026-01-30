// content_ui.js - Advanced User Interface for Clarifications
(function() {
    'use strict';
    
    if (window.agentUIManager) return;
    
    class AgentUIManager {
        constructor() {
            this.activeOverlay = null;
            this.choiceButtons = [];
            this.initialize();
        }
        
        createDraggableCopilotInput() {
            const copilotInput = document.getElementById('copilot-input');
            if (!copilotInput) return;

            let isDragging = false;
            let offsetX, offsetY;

            copilotInput.addEventListener('mousedown', (e) => {
                isDragging = true;
                offsetX = e.clientX - copilotInput.getBoundingClientRect().left;
                offsetY = e.clientY - copilotInput.getBoundingClientRect().top;
                copilotInput.style.cursor = 'grabbing';
            });

            document.addEventListener('mousemove', (e) => {
                if (!isDragging) return;

                const newLeft = e.clientX - offsetX;
                const newTop = e.clientY - offsetY;

                // Boundary checks to prevent dragging off-screen
                const maxLeft = window.innerWidth - copilotInput.offsetWidth;
                const maxTop = window.innerHeight - copilotInput.offsetHeight;

                copilotInput.style.left = `${Math.max(0, Math.min(newLeft, maxLeft))}px`;
                copilotInput.style.top = `${Math.max(0, Math.min(newTop, maxTop))}px`;
            });

            document.addEventListener('mouseup', () => {
                if (isDragging) {
                    isDragging = false;
                    copilotInput.style.cursor = 'move';

                    // Save the new position to Chrome storage
                    const copilotPosition = {
                        left: copilotInput.getBoundingClientRect().left,
                        top: copilotInput.getBoundingClientRect().top
                    };
                    chrome.storage.local.set({ copilotPosition: copilotPosition });
                }
            });

            // Load the position from Chrome storage on creation
            chrome.storage.local.get(['copilotPosition'], function(result) {
                if (result.copilotPosition) {
                    const { left, top } = result.copilotPosition;
                    copilotInput.style.left = `${left}px`;
                    copilotInput.style.top = `${top}px`;
                }
            });
        }

        initialize() {
            this.createDraggableCopilotInput();
            this.injectStyles();
            this.setupMessageListener();
            window.agentUIManager = this;
            console.log('🎨 Agent UI Manager initialized');
        }
        
        injectStyles() {
            if (document.getElementById('agent-ui-styles')) return;
            
            const styles = `
                .agent-overlay {
                    position: fixed !important;
                    top: 0 !important;
                    left: 0 !important;
                    width: 100vw !important;
                    height: 100vh !important;
                    background: rgba(0, 0, 0, 0.4) !important;
                    backdrop-filter: blur(5px) !important;
                    z-index: 999996 !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    animation: fadeIn 0.3s ease !important;
                }
                
                .agent-question-card {
                    background: white !important;
                    border-radius: 16px !important;
                    padding: 30px !important;
                    max-width: 500px !important;
                    width: 90% !important;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3) !important;
                    text-align: center !important;
                    position: relative !important;
                    animation: slideInUp 0.4s ease !important;
                }
                
                .agent-question-title {
                    font-size: 24px !important;
                    font-weight: 700 !important;
                    color: #333 !important;
                    margin-bottom: 10px !important;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
                }
                
                .agent-question-text {
                    font-size: 16px !important;
                    color: #666 !important;
                    margin-bottom: 30px !important;
                    line-height: 1.5 !important;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
                }
                
                .agent-options-grid {
                    display: grid !important;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)) !important;
                    gap: 15px !important;
                    margin-bottom: 20px !important;
                }
                
                .agent-option-card {
                    background: #f8f9fa !important;
                    border: 2px solid 'e9ecef' !important;
                    border-radius: 12px !important;
                    padding: 20px !important;
                    cursor: pointer !important;
                    transition: all 0.2s ease !important;
                    text-align: left !important;
                }
                
                .agent-option-card:hover {
                    border-color: #667eea !important;
                    background: #f0f8ff !important;
                    transform: translateY(-2px) !important;
                    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.15) !important;
                }
                
                .agent-option-number {
                    display: inline-block !important;
                    width: 24px !important;
                    height: 24px !important;
                    background: #667eea !important;
                    color: white !important;
                    border-radius: 50% !important;
                    text-align: center !important;
                    line-height: 24px !important;
                    font-size: 12px !important;
                    font-weight: bold !important;
                    margin-bottom: 10px !important;
                }
                
                .agent-option-label {
                    font-size: 14px !important;
                    font-weight: 600 !important;
                    color: #333 !important;
                    margin-bottom: 5px !important;
                }
                
                .agent-option-description {
                    font-size: 12px !important;
                    color: #666 !important;
                    line-height: 1.4 !important;
                }
                
                .agent-timeout-bar {
                    position: absolute !important;
                    bottom: 0 !important;
                    left: 0 !important;
                    height: 4px !important;
                    background: #667eea !important;
                    border-radius: 0 0 16px 16px !important;
                    animation: shrinkBar 15s linear !important;
                }
                
                .agent-choice-indicator {
                    position: absolute !important;
                    background: #00ff88 !important;
                    color: #333 !important;
                    border: 3px solid white !important;
                    border-radius: 50% !important;
                    width: 40px !important;
                    height: 40px !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    font-weight: bold !important;
                    font-size: 18px !important;
                    box-shadow: 0 4px 20px rgba(0, 255, 136, 0.4) !important;
                    z-index: 999999 !important;
                    animation: bounceIn 0.5s ease !important;
                    pointer-events: all !important;
                    cursor: pointer !important;
                    transition: all 0.2s ease !important;
                }
                
                .agent-choice-indicator:hover {
                    transform: scale(1.1) !important;
                    box-shadow: 0 6px 25px rgba(0, 255, 136, 0.6) !important;
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                @keyframes slideInUp {
                    from { transform: translateY(50px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                
                @keyframes bounceIn {
                    from { transform: scale(0); }
                    to { transform: scale(1); }
                }
                
                @keyframes shrinkBar {
                    from { width: 100%; }
                    to { width: 0%; }
                }
                
                .agent-element-highlight {
                    outline: 3px solid #00ff88 !important;
                    outline-offset: 3px !important;
                    background: rgba(0, 255, 136, 0.1) !important;
                    position: relative !important;
                    z-index: 999995 !important;
                }
                
                .agent-element-highlight::before {
                    content: '' !important;
                    position: absolute !important;
                    top: -6px !important;
                    left: -6px !important;
                    right: -6px !important;
                    bottom: -6px !important;
                    background: rgba(0, 255, 136, 0.2) !important;
                    border-radius: 8px !important;
                    z-index: -1 !important;
                    animation: pulse 2s infinite !important;
                }
            `;
            
            const styleSheet = document.createElement('style');
            styleSheet.id = 'agent-ui-styles';
            styleSheet.textContent = styles;
            document.head.appendChild(styleSheet);
        }
        
        setupMessageListener() {
            chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
                switch (request.type) {
                    case 'PRESENT_CHOICES':
                        this.presentClarification(request.question, request.options);
                        sendResponse({ success: true });
                        break;
                    case 'CLEANUP_UI':
                        this.cleanup();
                        sendResponse({ success: true });
                        break;
                }
                return true;
            });
        }
        
        presentClarification(question, options) {
            this.cleanup();
            
            // Create the main overlay
            const overlay = document.createElement('div');
            overlay.className = 'agent-overlay';
            overlay.id = 'agent-clarification-overlay';
            
            // Create the question card
            const card = document.createElement('div');
            card.className = 'agent-question-card';
            
            card.innerHTML = `
                <div class="agent-question-title">🤔 I need your help</div>
                <div class="agent-question-text">${this.escapeHtml(question)}</div>
                <div class="agent-options-grid" id="agent-options-grid"></div>
                <div class 'agent-timeout-bar'></div>
            `;
            
            overlay.appendChild(card);
            document.body.appendChild(overlay);
            this.activeOverlay = overlay;
            
            // Create option cards
            const optionsGrid = card.querySelector('#agent-options-grid');
            options.forEach((option, index) => {
                const optionCard = document.createElement('div');
                optionCard.className = 'agent-option-card';
                optionCard.innerHTML = `
                    <div class="agent-option-number">${index + 1}</div>
                    <div class="agent-option-label">${this.escapeHtml(option.label || option.text || 'Option')}</div>
                    <div class="agent-option-description">${this.escapeHtml(option.description || '')}</div>
                `;
                
                optionCard.addEventListener('click', () => {
                    this.selectOption(option);
                });
                
                optionsGrid.appendChild(optionCard);
                
                // Also highlight the actual element on the page
                this.highlightElement(option.selector, index + 1);
            });
            
            // Auto-select first option after timeout
            setTimeout(() => {
                if (this.activeOverlay) {
                    this.selectOption(options[0]);
                }
            }, 15000);
        }
        
        highlightElement(selector, number) {
            try {
                const element = document.querySelector(selector);
                if (!element) return;
                
                element.classList.add('agent-element-highlight');
                
                const rect = element.getBoundingClientRect();
                const indicator = document.createElement('div');
                indicator.className = 'agent-choice-indicator';
                indicator.textContent = number.toString();
                indicator.style.left = `${rect.left + window.scrollX - 20}px`;
                indicator.style.top = `${rect.top + window.scrollY - 20}px`;
                
                indicator.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // Find the corresponding option
                    const options = Array.from(document.querySelectorAll('.agent-option-card'));
                    const optionIndex = number - 1;
                    if (options[optionIndex]) {
                        options[optionIndex].click();
                    }
                });
                
                document.body.appendChild(indicator);
                this.choiceButtons.push({ element, indicator });
                
            } catch (error) {
                console.warn('Could not highlight element:', selector, error);
            }
        }
        
        selectOption(option) {
            // Send the choice back to the background script
            chrome.runtime.sendMessage({
                type: 'USER_CHOICE',
                choice: option
            });
            
            // Show selection feedback
            this.showSelectionFeedback(option.label || 'Selected option');
            
            // Clean up after a brief delay
            setTimeout(() => {
                this.cleanup();
            }, 1000);
        }
        
        showSelectionFeedback(optionLabel) {
            if (!this.activeOverlay) return;
            
            const card = this.activeOverlay.querySelector('.agent-question-card');
            if (card) {
                card.innerHTML = `
                    <div class="agent-question-title">✅ Perfect!</div>
                    <div class="agent-question-text">Selected: ${this.escapeHtml(optionLabel)}</div>
                    <div style="margin-top: 20px; color: #667eea; font-weight: 500;">Continuing with your task...</div>
                `;
                card.style.borderColor = '#00ff88';
                card.style.background = 'linear-gradient(135deg, #f0fff4 0%, #f0f8ff 100%)';
            }
        }
        
        cleanup() {
            // Remove overlay
            if (this.activeOverlay) {
                this.activeOverlay.remove();
                this.activeOverlay = null;
            }
            
            // Remove choice indicators and highlights
            this.choiceButtons.forEach(({ element, indicator }) => {
                element.classList.remove('agent-element-highlight');
                indicator.remove();
            });
            this.choiceButtons = [];
            
            // Remove any stray elements
            document.querySelectorAll('.agent-overlay, .agent-choice-indicator').forEach(el => {
                el.remove();
            });
            
            document.querySelectorAll('.agent-element-highlight').forEach(el => {
                el.classList.remove('agent-element-highlight');
            });
        }
        
        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text || '';
            return div.innerHTML;
        }
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            new AgentUIManager();
        });
    } else {
        new AgentUIManager();
    }
})();
