// content.js - Aura Co-Pilot Page Scanning
// Prevent multiple execution
if (typeof window.auraContentScriptLoaded === 'undefined') {
    window.auraContentScriptLoaded = true;

    // --- Inject CSS for UI enhancements ---
    if (!document.getElementById('aura-content-styles')) {
        const styles = `
            .agent-highlight { outline: 3px solid #ff00ff !important; box-shadow: 0 0 15px 5px rgba(255, 0, 255, 0.5) !important; transition: all 0.3s ease-in-out !important; }
            #agent-thinking-indicator { position: fixed; bottom: 20px; right: 20px; background-color: rgba(0, 0, 0, 0.8); color: white; padding: 10px 15px; border-radius: 8px; font-family: sans-serif; font-size: 14px; z-index: 999999; box-shadow: 0 4px 8px rgba(0,0,0,0.3); }
        `;
        const styleSheet = document.createElement("style");
        styleSheet.id = 'aura-content-styles';
        styleSheet.innerText = styles;
        document.head.appendChild(styleSheet);
    }

    if (typeof window.agentListenerAdded === 'undefined') {
        window.agentListenerAdded = true;
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.type === 'SCAN_PAGE') {
                hideThinkingIndicator();
                const pageData = scanPage();
                chrome.runtime.sendMessage({ type: 'PAGE_DATA', data: pageData });
                sendResponse({ status: "scan_started" });
                return true;
            } else if (request.type === 'COPY_IMAGE_URL') {
                const imageUrl = copyImageUrl(request.selector);
                chrome.runtime.sendMessage({ type: 'COPIED_DATA', data: imageUrl });
                sendResponse({ status: "copy_attempted" });
                return true;
            } else if (request.type === 'READ_TEXT') {
                const text = readText(request.selector);
                chrome.runtime.sendMessage({ type: 'COPIED_DATA', data: text }); // We can reuse the COPIED_DATA message
                sendResponse({ status: "read_attempted" });
                return true;
            } else if (request.type === 'TERMINATE') {
                hideThinkingIndicator();
                sendResponse({ status: "terminated" });
                return true;
            }
        });
        console.log("Aura Co-Pilot content script listener added.");
    }

    // --- Page Scanning ---
    function scanPage() {
        const interactiveSelector = 'a, button, input, textarea, select, [role="button"], [role="link"], [role="menuitem"], [onclick], img';
        const interactiveElements = [];
        document.querySelectorAll(interactiveSelector).forEach(el => {
            const rect = el.getBoundingClientRect();
            // Only include elements currently in the viewport
            if (rect.top >= 0 && rect.left >= 0 && rect.bottom <= window.innerHeight && rect.right <= window.innerWidth && rect.width > 0 && rect.height > 0) {
                interactiveElements.push({
                    type: el.tagName.toLowerCase(),
                    label: el.getAttribute('aria-label') || el.alt || el.innerText.trim().substring(0, 150) || el.placeholder || '',
                    selector: generateCssSelector(el)
                });
            }
        });

        return {
            url: window.location.href,
            title: document.title,
            interactiveElements: interactiveElements
        };
    }

    function copyImageUrl(selector) {
        const imgElement = document.querySelector(selector);
        if (imgElement && imgElement.src) {
            return imgElement.src;
        }
        return null;
    }

    function readText(selector) {
        const element = document.querySelector(selector);
        if (element) {
            return element.innerText.trim();
        }
        return null;
    }

    // --- CSS Selector Generation ---
    function generateCssSelector(el) {
        if (!(el instanceof Element)) return;
        const path = [];
        while (el.nodeType === Node.ELEMENT_NODE) {
            let selector = el.nodeName.toLowerCase();
            if (el.id) {
                selector += '#' + el.id;
                path.unshift(selector);
                break;
            }
            let sib = el, nth = 1;
            while (sib = sib.previousElementSibling) {
                if (sib.nodeName.toLowerCase() == selector) nth++;
            }
            if (nth != 1) selector += ":nth-of-type(" + nth + ")";
            path.unshift(selector);
            el = el.parentNode;
        }
        return path.join(" > ");
    }

    function showThinkingIndicator() {
        hideThinkingIndicator();
        const indicator = document.createElement('div');
        indicator.id = 'agent-thinking-indicator';
        indicator.textContent = 'Agent is thinking...';
        document.body.appendChild(indicator);
    }

    function hideThinkingIndicator() {
        const indicator = document.getElementById('agent-thinking-indicator');
        if (indicator) indicator.remove();
    }

} // End of auraContentScriptLoaded check