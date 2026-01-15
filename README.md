

```
 ▗▄▄▖▗▖   ▗▄▄▄▖▗▄▄▄▖▗▄▄▖ 
▐▌   ▐▌     █  ▐▌   ▐▌ ▐▌
▐▌   ▐▌     █  ▐▛▀▀▘▐▛▀▚▖
▝▚▄▄▖▐▙▄▄▖▗▄█▄▖▐▙▄▄▖▐▌ ▐▌                      
```
                                               
                         

> Console → CLI credentials. The reverse of [consoler](https://github.com/aws-samples/consoler).

A browser extension that intercepts and displays AWS STS temporary credentials from your AWS Console session, making them easy to copy for use in CLI tools, scripts, or local development.

## How It Works

AWS Console credentials are stored in the **JavaScript heap (RAM)** only—not in localStorage, sessionStorage, or cookies. This is by design for security (XSS mitigation, auto-expiry on tab close).
<img width="1468" height="778" alt="image" src="https://github.com/user-attachments/assets/6e594bd7-9dbb-4519-ac72-a83ee4a6ec81" />

This extension uses **network interception** (monkey-patching `window.fetch` and `XMLHttpRequest`) to capture credentials when the AWS Console fetches them from the `/console/tb/creds` endpoint.

### Technical Flow

1. When you load/refresh the AWS Console, it makes a request to `https://{region}.console.aws.amazon.com/console/tb/creds`
2. The injected script clones the response before AWS consumes it
3. Credentials are extracted from the JSON response:
   ```json
   {
     "accessKeyId": "ASIA...",
     "secretAccessKey": "...",
     "sessionToken": "...",
     "expiration": "2026-01-15T00:51:45.000Z"
   }
   ```
4. Credentials are emitted via `window.dispatchEvent()`
5. The isolated content script catches this and stores to `chrome.storage.local`
6. The popup displays whatever credentials have been captured

<img width="940" height="701" alt="image" src="https://github.com/user-attachments/assets/9203fb01-4ff2-4ba3-8f5e-e409cc40aebb" />

<img width="449" height="422" alt="image" src="https://github.com/user-attachments/assets/f806559b-e25b-460e-86eb-443912c86698" />

## Features

- 🔐 **Automatic credential capture** - Intercepts browserCreds API responses
- 📋 **One-click copy** - Copy individual fields or formatted output
- 📄 **Multiple export formats**:
  - Bash environment variables (`export AWS_...`)
  - PowerShell environment variables (`$env:AWS_...`)
  - AWS credentials file format (`~/.aws/credentials`)
  - JSON format
- ⏰ **Expiry tracking** - Shows when credentials will expire
- 🎨 **Dark theme UI** - Clean interface matching AWS Console aesthetics

## Installation

### Chrome / Chromium-based Browsers (Edge, Brave, Arc, etc.)

1. Clone the repo 
2. Open your browser's extension page:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
   - Brave: `brave://extensions`
3. Enable **Developer mode** (toggle in the top right)
4. Click **Load unpacked**
5. Select the `clier` folder
6. The extension icon (orange lock) should appear in your toolbar

### Firefox (sucks for this just don't bother)

Firefox requires modifications for Manifest V3. For Firefox:

1. Change `manifest.json`:
   - Use `"manifest_version": 2`
   - Replace `"service_worker": "background.js"` with `"scripts": ["background.js"]`
   - Update `web_accessible_resources` format
2. Go to `about:debugging#/runtime/this-firefox`
3. Click **Load Temporary Add-on**
4. Select `manifest.json`

## Usage

1. **Install the extension** (see above)
2. **Log into AWS Console** - Navigate to [console.aws.amazon.com](https://console.aws.amazon.com)
3. **Credentials are captured automatically** - When AWS Console loads or refreshes, it fetches credentials
4. **Click the extension icon** - View captured credentials
5. **Copy and use** - Select an export format and copy to your terminal

### If Credentials Don't Appear

- **Refresh the AWS Console page** (F5) - This triggers a fresh credential fetch
- **Navigate to a different AWS service** - Some pages trigger credential refreshes
- **Check that you're using federated/SSO login** - Works best with IAM Identity Center

## Export Formats

### Bash Environment Variables
```bash
export AWS_ACCESS_KEY_ID="ASIAXXXXXXXXXXX"
export AWS_SECRET_ACCESS_KEY="xxxxxxxxxxxxxxxxxxxxxxx"
export AWS_SESSION_TOKEN="xxxxxxxxxxxxxxxxxxxxxxx..."
export AWS_DEFAULT_REGION="us-east-1"
```

### PowerShell Environment Variables
```powershell
$env:AWS_ACCESS_KEY_ID="ASIAXXXXXXXXXXX"
$env:AWS_SECRET_ACCESS_KEY="xxxxxxxxxxxxxxxxxxxxxxx"
$env:AWS_SESSION_TOKEN="xxxxxxxxxxxxxxxxxxxxxxx..."
$env:AWS_DEFAULT_REGION="us-east-1"
```

### AWS Credentials File
```ini
[default]
aws_access_key_id = ASIAXXXXXXXXXXX
aws_secret_access_key = xxxxxxxxxxxxxxxxxxxxxxx
aws_session_token = xxxxxxxxxxxxxxxxxxxxxxx...
region = us-east-1
```

### JSON
```json
{
  "accessKeyId": "ASIAXXXXXXXXXXX",
  "secretAccessKey": "xxxxxxxxxxxxxxxxxxxxxxx",
  "sessionToken": "xxxxxxxxxxxxxxxxxxxxxxx...",
  "region": "us-east-1",
  "expiration": "2024-01-15T12:00:00Z"
}
```

## Security Considerations

⚠️ **Important Security Notes:**

- These are **temporary STS credentials** that expire (typically 1-12 hours depending on your IdP configuration)
- **Never share or commit** these credentials
- The extension only reads credentials from **your local browser session**
- **No data is transmitted** anywhere external—everything stays local
- Credentials are stored in `chrome.storage.local` and cleared when you click "Clear Stored" or uninstall the extension

## Troubleshooting

### "Waiting for credentials..."
- **Refresh the AWS Console page** (most common fix)
- Ensure you're logged in and on an actual AWS Console page
- Try navigating to a different AWS service

### Credentials show but are expired
- The extension shows the last captured credentials
- Refresh the AWS Console to get fresh credentials

### Extension doesn't work
- Check that you're on `*.console.aws.amazon.com`
- Ensure Developer mode is enabled and the extension is loaded
- Check the browser console for errors (Right-click icon → Inspect popup)

## Files Structure

```
clier/
├── manifest.json          # Extension manifest
├── background.js          # Service worker for message handling
├── content-isolated.js    # Content script (isolated world)
├── injected.js           # Fetch interceptor (main world)
├── popup.html            # Popup UI
├── popup.js              # Popup logic
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

## Permissions Explained

- **`storage`**: Store captured credentials locally
- **`host_permissions`** for `*.console.aws.amazon.com`: Inject content scripts on AWS Console pages
- **`web_accessible_resources`**: Allow the injected script to be loaded into the page context


## License

MIT License - Feel free to modify and distribute.

## Disclaimer

This tool is for **legitimate development and administrative purposes only**. Always follow your organization's security policies regarding credential handling. This is not an official AWS tool.
