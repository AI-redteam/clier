/**
 * Content Script - Runs in ISOLATED world
 * Injects the fetch interceptor and relays captured credentials to extension storage
 */

(function() {
  'use strict';

  // Inject the main world script
  function injectScript() {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('injected.js');
    script.onload = function() {
      this.remove();
    };
    
    // Inject as early as possible
    (document.head || document.documentElement).appendChild(script);
  }

  // Listen for intercepted credentials from the page context
  window.addEventListener('__AWS_CREDS_INTERCEPTED__', async (event) => {
    const { credentials, service, source, timestamp } = event.detail;

    if (credentials && credentials.accessKeyId && service) {
      // Extract region from current URL if not in credentials
      let region = credentials.region;
      if (!region) {
        const regionMatch = window.location.href.match(/region=([a-z]{2}-[a-z]+-\d)/);
        const hostnameMatch = window.location.hostname.match(/([a-z]{2}-[a-z]+-\d)\.console/);
        region = regionMatch?.[1] || hostnameMatch?.[1] || 'us-east-1';
      }

      const credentialData = {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        sessionToken: credentials.sessionToken,
        expiration: credentials.expiration,
        region: region,
        capturedAt: timestamp,
        source: source,
        pageUrl: window.location.href
      };

      // Store in chrome.storage, keyed by service
      try {
        // Get existing credentials to preserve other services
        const existing = await chrome.storage.local.get(['awsCredentials']);
        const allCredentials = existing.awsCredentials || {};

        // Update credentials for this service
        allCredentials[service] = credentialData;

        await chrome.storage.local.set({
          awsCredentials: allCredentials,
          lastUpdated: Date.now()
        });

        // Notify background script
        chrome.runtime.sendMessage({
          type: 'CREDENTIALS_CAPTURED',
          service: service,
          credentials: credentialData
        });

        console.log('[clier] Credentials stored for service:', service);
      } catch (e) {
        console.error('[clier] Failed to store credentials:', e);
      }
    }
  });

  // Listen for requests from popup to trigger a refresh
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'REQUEST_CREDENTIALS_REFRESH') {
      // We can't force AWS to re-fetch credentials, but we can signal readiness
      sendResponse({ status: 'ready', hasInterceptor: true });
    }
    return true;
  });

  // Inject immediately
  injectScript();

  console.log('[clier] Content script loaded');
})();
