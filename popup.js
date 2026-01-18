/**
 * Popup Script
 * Displays captured AWS credentials from chrome.storage
 * Supports multiple services with per-service credential storage
 */

let allCredentials = {}; // { service: credentialData, ... }
let currentService = null;
let currentFormat = 'env';

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
  loadCredentials();
  setupEventListeners();
});

function setupEventListeners() {
  // Copy buttons for individual fields
  document.querySelectorAll('.copy-btn[data-target]').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const text = document.getElementById(targetId).textContent;
      copyToClipboard(text, btn);
    });
  });

  // Format tabs
  document.querySelectorAll('.format-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.format-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentFormat = tab.getAttribute('data-format');
      updateFormatOutput();
    });
  });

  // Copy format button
  document.getElementById('copy-format').addEventListener('click', (e) => {
    const text = document.getElementById('format-content').textContent;
    copyToClipboard(text, e.target);
  });

  // Refresh button
  document.getElementById('refresh-btn').addEventListener('click', () => {
    loadCredentials();
  });

  // Clear current service button
  document.getElementById('clear-current-btn').addEventListener('click', async () => {
    if (!currentService) return;
    if (confirm(`Clear credentials for ${currentService.toUpperCase()}?`)) {
      await chrome.runtime.sendMessage({
        type: 'CLEAR_CREDENTIALS',
        service: currentService
      });
      delete allCredentials[currentService];
      const services = Object.keys(allCredentials);
      if (services.length > 0) {
        currentService = services[0];
        renderServiceTabs();
        displayCredentials(allCredentials[currentService]);
      } else {
        currentService = null;
        showWaitingState();
      }
    }
  });

  // Clear all button
  document.getElementById('clear-all-btn').addEventListener('click', async () => {
    if (confirm('Clear all stored credentials?')) {
      await chrome.runtime.sendMessage({ type: 'CLEAR_CREDENTIALS' });
      allCredentials = {};
      currentService = null;
      showWaitingState();
    }
  });

  // Listen for credential updates
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.awsCredentials) {
      loadCredentials();
    }
  });
}

async function loadCredentials() {
  const statusEl = document.getElementById('status');
  const serviceTabsContainer = document.getElementById('service-tabs-container');
  const credentialsContainer = document.getElementById('credentials-container');
  const waitingContainer = document.getElementById('waiting-container');
  const errorContainer = document.getElementById('error-container');

  // Reset UI
  statusEl.className = 'status loading';
  statusEl.innerHTML = '<div class="spinner"></div><span>Checking for credentials...</span>';
  serviceTabsContainer.classList.add('hidden');
  credentialsContainer.classList.add('hidden');
  waitingContainer.classList.add('hidden');
  errorContainer.classList.add('hidden');

  try {
    // Check if we're on an AWS page
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const isAWSPage = tab?.url && (
      tab.url.includes('console.aws.amazon.com') ||
      tab.url.includes('.aws.amazon.com')
    );

    // Get stored credentials
    const result = await chrome.storage.local.get(['awsCredentials', 'lastUpdated']);
    allCredentials = result.awsCredentials || {};
    const services = Object.keys(allCredentials);

    if (services.length > 0) {
      // If no current service or current service no longer exists, select first
      if (!currentService || !allCredentials[currentService]) {
        currentService = services[0];
      }

      const credentials = allCredentials[currentService];

      // Check if any credentials might be expired
      const hasExpired = services.some(svc => {
        const creds = allCredentials[svc];
        return creds.expiration && new Date(creds.expiration) < new Date();
      });

      if (hasExpired) {
        statusEl.className = 'status warning';
        statusEl.innerHTML = `⚠️ Some credentials may be expired`;
      } else {
        statusEl.className = 'status success';
        statusEl.innerHTML = `✓ Credentials available (${services.length} service${services.length > 1 ? 's' : ''})`;
      }

      renderServiceTabs();
      serviceTabsContainer.classList.remove('hidden');
      displayCredentials(credentials);
      credentialsContainer.classList.remove('hidden');
    } else if (!isAWSPage) {
      statusEl.className = 'status error';
      statusEl.innerHTML = '✗ Not on AWS Console';
      errorContainer.classList.remove('hidden');
    } else {
      statusEl.className = 'status warning';
      statusEl.innerHTML = '⏳ Waiting for credentials...';
      waitingContainer.classList.remove('hidden');
    }
  } catch (error) {
    console.error('Error loading credentials:', error);
    statusEl.className = 'status error';
    statusEl.innerHTML = '✗ Error loading credentials';
  }
}

function renderServiceTabs() {
  const serviceTabsEl = document.getElementById('service-tabs');
  const serviceCountEl = document.getElementById('service-count');
  const services = Object.keys(allCredentials);

  serviceCountEl.textContent = `(${services.length})`;

  serviceTabsEl.innerHTML = services.map(service => {
    const isActive = service === currentService;
    return `<button class="service-tab${isActive ? ' active' : ''}" data-service="${service}">${service}</button>`;
  }).join('');

  // Add click handlers
  serviceTabsEl.querySelectorAll('.service-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const service = tab.getAttribute('data-service');
      if (service !== currentService) {
        currentService = service;
        renderServiceTabs();
        displayCredentials(allCredentials[service]);
      }
    });
  });
}

function showWaitingState() {
  const statusEl = document.getElementById('status');
  const serviceTabsContainer = document.getElementById('service-tabs-container');
  const credentialsContainer = document.getElementById('credentials-container');
  const waitingContainer = document.getElementById('waiting-container');
  const errorContainer = document.getElementById('error-container');

  statusEl.className = 'status warning';
  statusEl.innerHTML = '⏳ Waiting for credentials...';
  serviceTabsContainer.classList.add('hidden');
  credentialsContainer.classList.add('hidden');
  errorContainer.classList.add('hidden');
  waitingContainer.classList.remove('hidden');
}

function displayCredentials(creds) {
  if (!creds) return;

  document.getElementById('access-key').textContent = creds.accessKeyId || 'Not found';
  document.getElementById('secret-key').textContent = creds.secretAccessKey || 'Not found';
  document.getElementById('session-token').textContent = creds.sessionToken || 'Not found';
  document.getElementById('region').textContent = creds.region || 'us-east-1';

  // Show meta info
  const metaInfo = document.getElementById('meta-info');
  const capturedTime = creds.capturedAt ? new Date(creds.capturedAt).toLocaleString() : 'Unknown';
  metaInfo.innerHTML = `<span><strong>Captured:</strong> ${capturedTime}</span><span><strong>Service:</strong> ${currentService.toUpperCase()}</span>`;

  // Show expiry info
  const expiryInfo = document.getElementById('expiry-info');
  if (creds.expiration) {
    const expiryDate = new Date(creds.expiration);
    const now = new Date();
    const diffMs = expiryDate - now;
    const diffMins = Math.round(diffMs / 60000);

    if (diffMs < 0) {
      expiryInfo.innerHTML = `<div class="expiry-warning">⚠️ Expired ${Math.abs(diffMins)} minutes ago</div>`;
    } else if (diffMins < 15) {
      expiryInfo.innerHTML = `<div class="expiry-warning">⚠️ Expires in ${diffMins} minutes</div>`;
    } else {
      expiryInfo.innerHTML = `<div class="expiry-ok">✓ Expires in ${diffMins} minutes</div>`;
    }
  } else {
    expiryInfo.innerHTML = '';
  }

  updateFormatOutput();
}

function updateFormatOutput() {
  if (!currentService || !allCredentials[currentService]) return;

  const creds = allCredentials[currentService];
  const formatContent = document.getElementById('format-content');
  let output = '';

  switch (currentFormat) {
    case 'env':
      output = `export AWS_ACCESS_KEY_ID="${creds.accessKeyId}"
export AWS_SECRET_ACCESS_KEY="${creds.secretAccessKey}"
export AWS_SESSION_TOKEN="${creds.sessionToken}"
export AWS_DEFAULT_REGION="${creds.region || 'us-east-1'}"`;
      break;

    case 'powershell':
      output = `$env:AWS_ACCESS_KEY_ID="${creds.accessKeyId}"
$env:AWS_SECRET_ACCESS_KEY="${creds.secretAccessKey}"
$env:AWS_SESSION_TOKEN="${creds.sessionToken}"
$env:AWS_DEFAULT_REGION="${creds.region || 'us-east-1'}"`;
      break;

    case 'credentials':
      output = `[default]
aws_access_key_id = ${creds.accessKeyId}
aws_secret_access_key = ${creds.secretAccessKey}
aws_session_token = ${creds.sessionToken}
region = ${creds.region || 'us-east-1'}`;
      break;

    case 'json':
      output = JSON.stringify({
        accessKeyId: creds.accessKeyId,
        secretAccessKey: creds.secretAccessKey,
        sessionToken: creds.sessionToken,
        region: creds.region || 'us-east-1',
        expiration: creds.expiration
      }, null, 2);
      break;
  }

  formatContent.textContent = output;
}

async function copyToClipboard(text, button) {
  try {
    await navigator.clipboard.writeText(text);

    const originalText = button.textContent;
    button.textContent = 'Copied!';
    button.classList.add('copied');

    setTimeout(() => {
      button.textContent = originalText.includes('All') ? 'Copy All' : 'Copy';
      button.classList.remove('copied');
    }, 1500);
  } catch (err) {
    console.error('Failed to copy:', err);
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);

    button.textContent = 'Copied!';
    button.classList.add('copied');
    setTimeout(() => {
      button.textContent = button.textContent.includes('All') ? 'Copy All' : 'Copy';
      button.classList.remove('copied');
    }, 1500);
  }
}
