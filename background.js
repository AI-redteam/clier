/**
 * Background Service Worker
 * Handles credential storage and communication between content scripts and popup
 */

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CREDENTIALS_CAPTURED') {
    // Update badge to indicate credentials are available
    chrome.action.setBadgeText({ text: '✓' });
    chrome.action.setBadgeBackgroundColor({ color: '#4ade80' });
    
    // Clear badge after 3 seconds
    setTimeout(() => {
      chrome.action.setBadgeText({ text: '' });
    }, 3000);

    console.log('[clier] Credentials received from tab:', sender.tab?.id);
  }

  if (message.type === 'GET_CREDENTIALS') {
    chrome.storage.local.get(['awsCredentials', 'lastUpdated'], (result) => {
      sendResponse(result);
    });
    return true; // Keep message channel open for async response
  }

  if (message.type === 'CLEAR_CREDENTIALS') {
    chrome.storage.local.remove(['awsCredentials', 'lastUpdated'], () => {
      sendResponse({ success: true });
    });
    return true;
  }
});

// Handle extension install/update
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[clier] Extension installed/updated:', details.reason);
});
