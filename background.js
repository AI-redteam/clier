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

    console.log('[clier] Credentials received for service:', message.service, 'from tab:', sender.tab?.id);
  }

  if (message.type === 'GET_CREDENTIALS') {
    chrome.storage.local.get(['awsCredentials', 'lastUpdated'], (result) => {
      sendResponse(result);
    });
    return true; // Keep message channel open for async response
  }

  if (message.type === 'CLEAR_CREDENTIALS') {
    // If a specific service is provided, only clear that service
    if (message.service) {
      chrome.storage.local.get(['awsCredentials'], (result) => {
        const allCredentials = result.awsCredentials || {};
        delete allCredentials[message.service];

        // If no credentials left, remove entirely
        if (Object.keys(allCredentials).length === 0) {
          chrome.storage.local.remove(['awsCredentials', 'lastUpdated'], () => {
            sendResponse({ success: true });
          });
        } else {
          chrome.storage.local.set({ awsCredentials: allCredentials }, () => {
            sendResponse({ success: true });
          });
        }
      });
    } else {
      // Clear all credentials
      chrome.storage.local.remove(['awsCredentials', 'lastUpdated'], () => {
        sendResponse({ success: true });
      });
    }
    return true;
  }
});

// Handle extension install/update
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[clier] Extension installed/updated:', details.reason);
});
