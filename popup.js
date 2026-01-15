/**
 * Popup Script
 * Displays captured AWS credentials from chrome.storage
 */

let currentCredentials = null;
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

  // Clear button
  document.getElementById('clear-btn').addEventListener('click', async () => {
    if (confirm('Clear stored credentials?')) {
      await chrome.storage.local.remove(['awsCredentials', 'lastUpdated']);
      currentCredentials = null;
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
  const credentialsContainer = document.getElementById('credentials-container');
  const waitingContainer = document.getElementById('waiting-container');
  const errorContainer = document.getElementById('error-container');

  // Reset UI
  statusEl.className = 'status loading';
  statusEl.innerHTML = '<div class="spinner"></div><span>Checking for credentials...</span>';
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
    const credentials = result.awsCredentials;

    if (credentials && credentials.accessKeyId) {
      currentCredentials = credentials;
      displayCredentials(credentials, result.lastUpdated);
      
      // Check if credentials might be expired
      const isExpired = credentials.expiration && new Date(credentials.expiration) < new Date();
      
      if (isExpired) {
        statusEl.className = 'status warning';
        statusEl.innerHTML = '⚠️ Credentials may be expired - refresh AWS Console';
      } else {
        statusEl.className = 'status success';
        statusEl.innerHTML = '✓ Credentials available';
      }
      
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

function showWaitingState() {
  const statusEl = document.getElementById('status');
  const credentialsContainer = document.getElementById('credentials-container');
  const waitingContainer = document.getElementById('waiting-container');
  const errorContainer = document.getElementById('error-container');

  statusEl.className = 'status warning';
  statusEl.innerHTML = '⏳ Waiting for credentials...';
  credentialsContainer.classList.add('hidden');
  errorContainer.classList.add('hidden');
  waitingContainer.classList.remove('hidden');
}

function displayCredentials(creds, lastUpdated) {
  document.getElementById('access-key').textContent = creds.accessKeyId || 'Not found';
  document.getElementById('secret-key').textContent = creds.secretAccessKey || 'Not found';
  document.getElementById('session-token').textContent = creds.sessionToken || 'Not found';
  document.getElementById('region').textContent = creds.region || 'us-east-1';

  // Show meta info
  const metaInfo = document.getElementById('meta-info');
  const capturedTime = creds.capturedAt ? new Date(creds.capturedAt).toLocaleString() : 'Unknown';
  metaInfo.innerHTML = `<span><strong>Captured:</strong> ${capturedTime}</span>`;

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
  if (!currentCredentials) return;
  
  const formatContent = document.getElementById('format-content');
  let output = '';
  
  switch (currentFormat) {
    case 'env':
      output = `export AWS_ACCESS_KEY_ID="${currentCredentials.accessKeyId}"
export AWS_SECRET_ACCESS_KEY="${currentCredentials.secretAccessKey}"
export AWS_SESSION_TOKEN="${currentCredentials.sessionToken}"
export AWS_DEFAULT_REGION="${currentCredentials.region || 'us-east-1'}"`;
      break;

    case 'powershell':
      output = `$env:AWS_ACCESS_KEY_ID="${currentCredentials.accessKeyId}"
$env:AWS_SECRET_ACCESS_KEY="${currentCredentials.secretAccessKey}"
$env:AWS_SESSION_TOKEN="${currentCredentials.sessionToken}"
$env:AWS_DEFAULT_REGION="${currentCredentials.region || 'us-east-1'}"`;
      break;
      
    case 'credentials':
      output = `[default]
aws_access_key_id = ${currentCredentials.accessKeyId}
aws_secret_access_key = ${currentCredentials.secretAccessKey}
aws_session_token = ${currentCredentials.sessionToken}
region = ${currentCredentials.region || 'us-east-1'}`;
      break;
      
    case 'json':
      output = JSON.stringify({
        accessKeyId: currentCredentials.accessKeyId,
        secretAccessKey: currentCredentials.secretAccessKey,
        sessionToken: currentCredentials.sessionToken,
        region: currentCredentials.region || 'us-east-1',
        expiration: currentCredentials.expiration
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
