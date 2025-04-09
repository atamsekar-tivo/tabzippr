// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'highlightTab' && message.isDuplicate) {
    // Add custom styles to highlight duplicate tabs
    const style = document.createElement('style');
    style.textContent = `
      @keyframes tabHighlight {
        0% { background: rgba(251, 146, 60, 0.2); }
        50% { background: rgba(251, 146, 60, 0.3); }
        100% { background: rgba(251, 146, 60, 0.2); }
      }
      html {
        border: 2px solid #f97316 !important;
        animation: tabHighlight 2s ease-in-out infinite;
      }
    `;
    document.head.appendChild(style);
    sendResponse({ success: true });
  } else if (message.action === 'unhighlightTab') {
    // Remove highlight styles
    const styles = document.querySelectorAll('style');
    styles.forEach(style => {
      if (style.textContent.includes('tabHighlight')) {
        style.remove();
      }
    });
    sendResponse({ success: true });
  }
  return true; // Required for async response
});