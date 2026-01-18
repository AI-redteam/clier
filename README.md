

```
 ▗▄▄▖▗▖   ▗▄▄▄▖▗▄▄▄▖▗▄▄▖ 
▐▌   ▐▌     █  ▐▌   ▐▌ ▐▌
▐▌   ▐▌     █  ▐▛▀▀▘▐▛▀▚▖
▝▚▄▄▖▐▙▄▄▖▗▄█▄▖▐▙▄▄▖▐▌ ▐▌                      
```
                                               
                         

> Console → CLI credentials. The reverse of [consoler](https://github.com/NetSPI/aws_consoler).

A browser extension that intercepts and displays AWS STS temporary credentials from your AWS Console session, making them easy to copy for use in CLI tools, scripts, or local development. Supports **multiple AWS services** - each service (S3, EC2, Lambda, etc.) has its own scoped credentials that can be captured and exported independently.

## How It Works

AWS Console credentials are stored in the **JavaScript heap (RAM)** only—not in localStorage, sessionStorage, or cookies. This is by design for security (XSS mitigation, auto-expiry on tab close).

<img width="455" height="604" alt="Screenshot 2026-01-17 at 9 05 37 PM" src="https://github.com/user-attachments/assets/fba8a7e6-40c5-416c-9d85-5db1831e8346" />


This extension uses **network interception** (monkey-patching `window.fetch` and `XMLHttpRequest`) to capture credentials when the AWS Console fetches them from service-specific `/{service}/tb/creds` endpoints.

### Technical Flow

1. When you load/refresh any AWS Console service, it makes a request to `https://{region}.console.aws.amazon.com/{service}/tb/creds`
   - Examples: `/console/tb/creds`, `/s3/tb/creds`, `/ec2/tb/creds`, `/lambda/tb/creds`
2. The injected script clones the response before AWS consumes it
3. Credentials are extracted from the JSON response along with the service name:
   ```json
   {
     "accessKeyId": "ASIA...",
     "secretAccessKey": "...",
     "sessionToken": "...",
     "expiration": "2026-01-15T00:51:45.000Z"
   }
   ```
4. Credentials are emitted via `window.dispatchEvent()` with service identifier
5. The isolated content script catches this and stores to `chrome.storage.local` keyed by service
6. The popup displays service tabs to switch between captured credentials


---
<img width="179" height="33" alt="Screenshot 2026-01-17 at 9 05 51 PM" src="https://github.com/user-attachments/assets/c114b3fc-dd98-4e17-84b8-cfb134ab584f" />

---
<img width="435" height="348" alt="Screenshot 2026-01-17 at 9 06 04 PM" src="https://github.com/user-attachments/assets/323c93c3-2d54-4035-aea0-6ebdf74d881b" />

---
## Features

- 🔐 **Automatic credential capture** - Intercepts credentials from any AWS service endpoint
- 🗂️ **Multi-service support** - Capture and manage credentials for S3, EC2, Lambda, and any other AWS service separately
- 📋 **One-click copy** - Copy individual fields or formatted output
- 📄 **Multiple export formats**:
  - Bash environment variables (`export AWS_...`)
  - PowerShell environment variables (`$env:AWS_...`)
  - AWS credentials file format (`~/.aws/credentials`)
  - JSON format
- ⏰ **Expiry tracking** - Shows when credentials will expire
- 🧹 **Flexible clearing** - Clear credentials for a single service or all at once
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
4. **Navigate to different services** - Visit S3, EC2, Lambda, etc. to capture service-specific credentials
5. **Click the extension icon** - View captured credentials with service tabs
6. **Switch between services** - Click service tabs to view credentials for each service
7. **Copy and use** - Select an export format and copy to your terminal

### If Credentials Don't Appear

- **Refresh the AWS Console page** (F5) - This triggers a fresh credential fetch
- **Navigate to a different AWS service** - Each service has its own credential endpoint
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

- These are **temporary STS credentials** that expire (typically 15 mins depending on your IdP configuration)
- Each service has **separately scoped credentials** with permissions limited to that service
- **Never share or commit** these credentials
- The extension only reads credentials from **your local browser session**
- **No data is transmitted** anywhere external—everything stays local
- Credentials are stored in `chrome.storage.local` and cleared when you click "Clear Current", "Clear All", or uninstall the extension

## Troubleshooting

### "Waiting for credentials..."
- **Refresh the AWS Console page** (most common fix)
- Ensure you're logged in and on an actual AWS Console page
- Try navigating to a different AWS service - each service triggers its own credential fetch

### Missing a specific service
- Navigate directly to that service in the AWS Console (e.g., S3, EC2, Lambda)
- Refresh the page while on that service
- The service tab will appear once credentials are captured

### Credentials show but are expired
- The extension shows the last captured credentials per service
- Refresh the AWS Console page for that service to get fresh credentials

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
