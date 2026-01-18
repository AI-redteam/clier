

```
 ▗▄▄▖▗▖   ▗▄▄▄▖▗▄▄▄▖▗▄▄▖
▐▌   ▐▌     █  ▐▌   ▐▌ ▐▌
▐▌   ▐▌     █  ▐▛▀▀▘▐▛▀▚▖
▝▚▄▄▖▐▙▄▄▖▗▄█▄▖▐▙▄▄▖▐▌ ▐▌
```

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Chrome](https://img.shields.io/badge/Chrome-Supported-4285F4?logo=googlechrome&logoColor=white)](https://www.google.com/chrome/)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![JavaScript](https://img.shields.io/badge/JavaScript-Vanilla-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

> Console → CLI credentials. The reverse of [consoler](https://github.com/NetSPI/aws_consoler).
>
> Pronounced: see-el-eye-er

**The only tool that can extract AWS Console credentials.** AWS intentionally stores these credentials in the JavaScript heap only—not in cookies, localStorage, or anywhere extractable. They're designed to be inaccessible and auto-expire when you close the tab. clier intercepts them at the network layer before they disappear into memory, making the impossible possible.

Perfect for:
- **Pentesters** - Extract credentials from compromised sessions for offline analysis
- **Developers in locked-down environments** - Get CLI access when you only have console access
- **Airgapped VDI users** - Scan the QR code with your phone to bypass clipboard restrictions and get credentials out
- **Anyone stuck with SSO/federated console access** - Finally use the AWS CLI without begging for access keys

Supports **multiple AWS services** - each service (S3, EC2, Lambda, etc.) has its own scoped credentials that can be captured and exported independently.

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

---

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
- 📱 **QR code export** - Each service displays a scannable QR code for instant credential transfer to your phone—perfect for airgapped environments where clipboard is blocked
 <img width="435" height="348" alt="Screenshot 2026-01-17 at 9 06 04 PM" src="https://github.com/user-attachments/assets/323c93c3-2d54-4035-aea0-6ebdf74d881b" />

    
- ⏰ **Expiry tracking** - Shows when credentials will expire
  <img width="179" height="33" alt="Screenshot 2026-01-17 at 9 05 51 PM" src="https://github.com/user-attachments/assets/c114b3fc-dd98-4e17-84b8-cfb134ab584f" />

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

### QR Code Format

The QR code contains a compact JSON with short keys to maximize capacity:

<img width="779" height="648" alt="Screenshot 2026-01-17 at 10 04 17 PM" src="https://github.com/user-attachments/assets/6435d9a8-dfe6-40af-98ce-581c5cf99c6b" />


```json
{
  "a": "ASIAXXXXXXXXXXX",
  "s": "xxxxxxxxxxxxxxxxxxxxxxx",
  "t": "xxxxxxxxxxxxxxxxxxxxxxx...",
  "r": "us-east-1",
  "e": "2024-01-15T12:00:00Z"
}
```

| Key | Field |
|-----|-------|
| `a` | accessKeyId |
| `s` | secretAccessKey |
| `t` | sessionToken |
| `r` | region |
| `e` | expiration |

**To use scanned credentials:**
```bash
# After scanning, parse the JSON and export:
export AWS_ACCESS_KEY_ID="<a value>"
export AWS_SECRET_ACCESS_KEY="<s value>"
export AWS_SESSION_TOKEN="<t value>"
export AWS_DEFAULT_REGION="<r value>"
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
├── qrcode.min.js         # QR code generator library
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

## Pentester Workflow

This section describes how clier can be used during authorized AWS security assessments.

### Scenario: Post-Access Credential Extraction

After gaining access to a target's workstation or browser session (via phishing simulation, physical access during an engagement, or compromised RDP/VDI session):

1. **Install clier** on the target browser (or use a portable/pre-configured browser)
2. **Navigate to AWS Console** - If the user has an active SSO session, you'll land authenticated
3. **Enumerate services** - Visit each AWS service the target might have access to:
   ```
   S3 → EC2 → Lambda → IAM → RDS → Secrets Manager → etc.
   ```
4. **Capture scoped credentials** - Each service visit captures that service's scoped STS credentials
5. **Export and exfiltrate** - Copy credentials in your preferred format for offline analysis

### Scenario: Privilege & Access Scope Analysis

When assessing what a compromised identity can actually do:

1. **Capture credentials from multiple services** - Navigate through the console capturing each service's credentials
2. **Compare credential scopes** - Each service may have different IAM permissions:
   ```bash
   # Test S3 credentials
   export AWS_ACCESS_KEY_ID="<s3-creds>"
   aws s3 ls

   # Test EC2 credentials
   export AWS_ACCESS_KEY_ID="<ec2-creds>"
   aws ec2 describe-instances
   ```
3. **Identify permission boundaries** - Some services may have broader access than others
4. **Test for privilege escalation** - Use tools like [Pacu](https://github.com/RhinoSecurityLabs/pacu) or [enumerate-iam](https://github.com/andresriancho/enumerate-iam) with captured credentials

### Scenario: Lateral Movement via CLI

Console access and CLI access may have different effective permissions:

1. **Capture service credentials** via clier
2. **Use CLI to access resources** that may have different access controls:
   ```bash
   # Access S3 buckets that might not be visible in console
   aws s3 ls s3://internal-bucket --recursive

   # Pull secrets that require CLI
   aws secretsmanager get-secret-value --secret-id prod/db/creds
   ```
3. **Pivot to other accounts** - If the role has `sts:AssumeRole` permissions:
   ```bash
   aws sts assume-role --role-arn arn:aws:iam::TARGET:role/CrossAccountRole --role-session-name pivot
   ```

### Scenario: Airgapped VDI / Restricted Environment Breakout

Many organizations restrict AWS access to locked-down VDI environments with no CLI, no local tools, and no way to install software. Console-only access is meant to be a security control. clier breaks that assumption:

1. **Install clier in the VDI browser** - Most VDIs allow browser extensions, or use a portable browser
2. **Authenticate to AWS Console** via your normal SSO/federated flow
3. **Navigate to the services you need** - Capture credentials for S3, Lambda, Secrets Manager, etc.
4. **Exfiltrate credentials** - Options depending on your restrictions:
   - **QR code scan** - Point your phone at the QR code displayed in the popup (fastest method)
   - **Copy/paste** - If clipboard works between VDI and local machine
   - **Type them out** - Manual but works when clipboard is blocked
   - **Photo the QR** - Screenshot/photo the QR code for later scanning
   - **Email to yourself** - If webmail is accessible
5. **Use credentials on your local machine**:
   ```bash
   # Paste the captured bash export format
   export AWS_ACCESS_KEY_ID="ASIA..."
   export AWS_SECRET_ACCESS_KEY="..."
   export AWS_SESSION_TOKEN="..."

   # Now you have CLI access outside the VDI
   aws s3 cp s3://restricted-bucket/data.csv ./
   ```

**Why this matters:** Organizations assume console-only VDI access prevents data exfiltration via CLI. clier proves that assumption wrong—if a user can see it in the console, they can now script it externally.

### Tips for Engagements

- **Capture early, use later** - Credentials expire in ~15 mins, but capturing multiple services gives you a map of access
- **Screenshot the popup** - Document captured services for your report
- **Check credential expiry** - The extension shows time remaining; refresh the console page to get fresh credentials
- **Clear traces** - Use "Clear All" before returning the system; credentials are only stored in `chrome.storage.local`

## Disclaimer

This tool is for **authorized security testing and legitimate development purposes only**. Always obtain proper authorization before testing. Follow your organization's security policies and rules of engagement. This is not an official AWS tool.
