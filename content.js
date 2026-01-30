// content.js - Aura Co-Pilot 2 Content Script (Enhanced Page Interaction)

// --- Inject CSS for enhanced UI enhancements ---
const styles = `
    .aura-agent-highlight { 
        outline: 3px solid #A855F7 !important; 
        box-shadow: 0 0 20px 8px rgba(168, 85, 247, 0.6) !important; 
        transition: all 0.3s ease-in-out !important; 
        background: rgba(168, 85, 247, 0.1) !important;
    }
    
    #aura-thinking-indicator { 
        position: fixed; 
        bottom: 20px; 
        right: 20px; 
        background: linear-gradient(135deg, rgba(17, 24, 39, 0.95), rgba(31, 41, 55, 0.95)); 
        color: white; 
        padding: 12px 18px; 
        border-radius: 12px; 
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; 
        font-size: 14px; 
        font-weight: 500;
        z-index: 999999; 
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        display: flex;
        align-items: center;
        gap: 8px;
    }
    
    .aura-thinking-dots {
        display: flex;
        gap: 4px;
    }
    
    .aura-thinking-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #A855F7;
        animation: auraPulse 1.5s infinite;
    }
    
    .aura-thinking-dot:nth-child(2) {
        animation-delay: 0.2s;
    }
    
    .aura-thinking-dot:nth-child(3) {
        animation-delay: 0.4s;
    }
    
    @keyframes auraPulse {
        0%, 100% { opacity: 0.3; transform: scale(1); }
        50% { opacity: 1; transform: scale(1.2); }
    }
    
    .aura-element-hint {
        position: absolute;
        background: rgba(168, 85, 247, 0.9);
        color: white;
        padding: 4px 8px;
        border-radius: 6px;
        font-size: 12px;
        font-family: 'Inter', sans-serif;
        font-weight: 500;
        z-index: 999998;
        pointer-events: none;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }
`;

const styleSheet = document.createElement("style");
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);

// Global state
let isScanning = false;
let lastScanData = null;
let highlightedElements = [];

// Ensure single listener setup
if (typeof window.auraListenerAdded === 'undefined') {
    window.auraListenerAdded = true;

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log('📨 Content script received:', request.type);

        switch (request.type) {
            case 'SCAN_PAGE':
                hideThinkingIndicator();
                const pageData = scanPageEnhanced();
                chrome.runtime.sendMessage({ type: 'PAGE_DATA', data: pageData });
                sendResponse({ status: "scan_started" });
                break;

            case 'COPY_IMAGE_URL':
                const imageUrl = copyImageUrl(request.selector);
                chrome.runtime.sendMessage({ type: 'COPIED_DATA', data: imageUrl });
                sendResponse({ status: "copy_attempted" });
                break;

            case 'READ_TEXT':
                const text = readText(request.selector);
                chrome.runtime.sendMessage({ type: 'COPIED_DATA', data: text });
                sendResponse({ status: "read_attempted" });
                break;

            case 'HIGHLIGHT_ELEMENT':
                highlightElement(request.selector);
                sendResponse({ status: "highlight_attempted" });
                break;

            case 'CLEANUP_UI':
                cleanup();
                sendResponse({ status: "cleaned_up" });
                break;

            case 'TERMINATE':
                hideThinkingIndicator();
                cleanup();
                sendResponse({ status: "terminated" });
                break;

            default:
                sendResponse({ status: "unknown_message_type" });
        }

        return true;
    });

    console.log("🔗 Aura Co-Pilot content script listener added");
}

// Enhanced page scanning function
function scanPageEnhanced() {
    console.log('🔍 Enhanced page scanning initiated');
    isScanning = true;

    // Clear previous highlights
    clearHighlights();

    // Enhanced selector for more comprehensive element detection
    const interactiveSelector = `
        a, button, input, textarea, select, 
        [role="button"], [role="link"], [role="menuitem"], [role="tab"], [role="option"],
        [onclick], [onmousedown], [onmouseup], [onsubmit],
        .btn, .button, .link, .clickable, .interactive,
        img[onclick], img[onmousedown], div[onclick], span[onclick],
        [data-testid], [data-cy], [aria-label],
        form, label[for]
    `;

    const interactiveElements = [];
    const allElements = document.querySelectorAll(interactiveSelector);

    console.log(`🔍 Found ${allElements.length} potential interactive elements`);

    allElements.forEach((el, index) => {
        const rect = el.getBoundingClientRect();

        // Enhanced visibility check
        const isVisible = (
            rect.top >= -100 && // Allow slightly off-screen elements
            rect.left >= -100 &&
            rect.bottom <= window.innerHeight + 100 &&
            rect.right <= window.innerWidth + 100 &&
            rect.width > 0 &&
            rect.height > 0 &&
            getComputedStyle(el).display !== 'none' &&
            getComputedStyle(el).visibility !== 'hidden' &&
            getComputedStyle(el).opacity !== '0'
        );

        if (isVisible) {
            const elementData = {
                type: el.tagName.toLowerCase(),
                label: getElementLabel(el),
                selector: generateOptimizedSelector(el),
                position: {
                    x: Math.round(rect.left + rect.width / 2),
                    y: Math.round(rect.top + rect.height / 2)
                },
                attributes: getRelevantAttributes(el),
                index: index
            };

            // Only add if we have meaningful information
            if (elementData.label || elementData.attributes.id || elementData.attributes.class) {
                interactiveElements.push(elementData);
            }
        }
    });

    // Enhanced page context
    const pageContext = {
        url: window.location.href,
        title: document.title,
        domain: window.location.hostname,
        path: window.location.pathname,
        timestamp: new Date().toISOString(),
        viewport: {
            width: window.innerWidth,
            height: window.innerHeight,
            scrollX: window.scrollX,
            scrollY: window.scrollY
        },
        pageText: getMainPageText(),
        forms: getFormInfo(),
        interactiveElements: interactiveElements.slice(0, 50) // Limit for performance
    };

    lastScanData = pageContext;
    isScanning = false;

    console.log(`✅ Enhanced scan complete: ${interactiveElements.length} elements found`);
    return pageContext;
}

function getElementLabel(el) {
    // Enhanced label extraction
    const labelMethods = [
        () => el.getAttribute('aria-label'),
        () => el.getAttribute('title'),
        () => el.getAttribute('alt'),
        () => el.getAttribute('placeholder'),
        () => el.getAttribute('data-testid'),
        () => el.getAttribute('data-cy'),
        () => el.getAttribute('name'),
        () => {
            const labelEl = el.closest('label') || document.querySelector(`label[for="${el.id}"]`);
            return labelEl ? labelEl.textContent.trim() : null;
        },
        () => {
            const textContent = el.textContent || el.innerText;
            return textContent ? textContent.trim().substring(0, 150) : null;
        },
        () => el.getAttribute('value'),
        () => el.getAttribute('href'),
        () => el.getAttribute('src')
    ];

    for (const method of labelMethods) {
        try {
            const label = method();
            if (label && label.length > 0) {
                return label;
            }
        } catch (e) {
            continue;
        }
    }

    return `${el.tagName.toLowerCase()}_element`;
}

function getRelevantAttributes(el) {
    const relevantAttrs = ['id', 'class', 'type', 'role', 'data-testid', 'data-cy', 'name'];
    const attrs = {};

    relevantAttrs.forEach(attr => {
        const value = el.getAttribute(attr);
        if (value) {
            attrs[attr] = value;
        }
    });

    return attrs;
}

function getMainPageText() {
    // Extract main readable text from the page
    const mainContent = document.querySelector('main, article, .content, .main-content, #content, #main') || document.body;
    const text = mainContent.textContent || mainContent.innerText || '';
    return text.trim().substring(0, 1000); // Limit for performance
}

function getFormInfo() {
    const forms = [];
    document.querySelectorAll('form').forEach(form => {
        const inputs = Array.from(form.querySelectorAll('input, textarea, select')).map(input => ({
            type: input.type || input.tagName.toLowerCase(),
            name: input.name || input.id,
            placeholder: input.placeholder || '',
            required: input.required
        }));

        if (inputs.length > 0) {
            forms.push({
                action: form.action || '',
                method: form.method || 'get',
                inputs: inputs
            });
        }
    });

    return forms;
}

function generateOptimizedSelector(el) {
    if (!(el instanceof Element)) return;

    // Try ID first
    if (el.id) {
        return `#${el.id}`;
    }

    // Try data attributes
    const testId = el.getAttribute('data-testid');
    if (testId) {
        return `[data-testid="${testId}"]`;
    }

    const cyId = el.getAttribute('data-cy');
    if (cyId) {
        return `[data-cy="${cyId}"]`;
    }

    // Try unique class combinations
    if (el.className && typeof el.className === 'string') {
        const classes = el.className.split(' ').filter(c => c && !c.match(/^(active|hover|focus|selected)$/));
        if (classes.length > 0) {
            const classSelector = '.' + classes.join('.');
            if (document.querySelectorAll(classSelector).length === 1) {
                return classSelector;
            }
        }
    }

    // Fall back to path-based selector
    const path = [];
    let current = el;

    while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.documentElement) {
        let selector = current.nodeName.toLowerCase();

        if (current.id) {
            selector += '#' + current.id;
            path.unshift(selector);
            break;
        }

        if (current.className && typeof current.className === 'string') {
            const classes = current.className.split(' ').filter(c => c && !c.match(/^(active|hover|focus|selected)$/));
            if (classes.length > 0) {
                selector += '.' + classes.slice(0, 2).join('.'); // Use first 2 classes
            }
        }

        // Add nth-child if needed for uniqueness
        let sib = current;
        let nth = 1;
        while (sib = sib.previousElementSibling) {
            if (sib.nodeName.toLowerCase() === selector.split('.')[0]) nth++;
        }

        if (nth > 1) {
            selector += `:nth-of-type(${nth})`;
        }

        path.unshift(selector);
        current = current.parentNode;

        // Limit path length
        if (path.length >= 5) break;
    }

    return path.join(' > ');
}

function copyImageUrl(selector) {
    try {
        const imgElement = document.querySelector(selector);
        if (imgElement && imgElement.src) {
            console.log('📋 Copying image URL:', imgElement.src);
            highlightElement(selector, 2000);
            return imgElement.src;
        }
        console.warn('⚠️ Image element not found or has no src:', selector);
        return null;
    } catch (error) {
        console.error('❌ Error copying image URL:', error);
        return null;
    }
}

function readText(selector) {
    try {
        const element = document.querySelector(selector);
        if (element) {
            const text = element.innerText || element.textContent || '';
            console.log('📖 Reading text from element:', text.substring(0, 100) + '...');
            highlightElement(selector, 2000);
            return text.trim();
        }
        console.warn('⚠️ Element not found for text reading:', selector);
        return null;
    } catch (error) {
        console.error('❌ Error reading text:', error);
        return null;
    }
}

function highlightElement(selector, duration = 3000) {
    try {
        const element = document.querySelector(selector);
        if (element) {
            element.classList.add('aura-agent-highlight');
            highlightedElements.push(element);

            // Add hint tooltip
            const hint = document.createElement('div');
            hint.className = 'aura-element-hint';
            hint.textContent = getElementLabel(element).substring(0, 50);

            const rect = element.getBoundingClientRect();
            hint.style.left = (rect.left + window.scrollX) + 'px';
            hint.style.top = (rect.top + window.scrollY - 35) + 'px';

            document.body.appendChild(hint);

            setTimeout(() => {
                element.classList.remove('aura-agent-highlight');
                hint.remove();
                highlightedElements = highlightedElements.filter(el => el !== element);
            }, duration);

            console.log('✨ Element highlighted:', selector);
        }
    } catch (error) {
        console.error('❌ Error highlighting element:', error);
    }
}

function clearHighlights() {
    highlightedElements.forEach(element => {
        element.classList.remove('aura-agent-highlight');
    });
    highlightedElements = [];

    // Remove any hint tooltips
    document.querySelectorAll('.aura-element-hint').forEach(hint => hint.remove());
}

function showThinkingIndicator(message = 'Aura is thinking...') {
    hideThinkingIndicator();

    const indicator = document.createElement('div');
    indicator.id = 'aura-thinking-indicator';
    indicator.innerHTML = `
        <span>${message}</span>
        <div class="aura-thinking-dots">
            <div class="aura-thinking-dot"></div>
            <div class="aura-thinking-dot"></div>
            <div class="aura-thinking-dot"></div>
        </div>
    `;

    document.body.appendChild(indicator);
    console.log('🤔 Thinking indicator shown:', message);
}

function hideThinkingIndicator() {
    const indicator = document.getElementById('aura-thinking-indicator');
    if (indicator) {
        indicator.remove();
        console.log('🤔 Thinking indicator hidden');
    }
}

function cleanup() {
    hideThinkingIndicator();
    clearHighlights();
    isScanning = false;
    lastScanData = null;
    console.log('🧹 Content script cleaned up');
}

// Auto-cleanup on page unload
window.addEventListener('beforeunload', cleanup);

// Page navigation detection
let currentUrl = window.location.href;
setInterval(() => {
    if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        cleanup();
        console.log('🔄 Page navigation detected, cleaned up');
    }
}, 1000);

console.log('🔗 Aura Co-Pilot content script loaded and ready');