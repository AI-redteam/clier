/**
 * Injected Script - Runs in MAIN world (page context)
 * Monkey-patches fetch() to intercept AWS console credential responses
 */

(function() {
  'use strict';

  // Pattern to match credential endpoints for any AWS service
  // Examples:
  //   https://us-east-1.console.aws.amazon.com/console/tb/creds
  //   https://us-east-1.console.aws.amazon.com/s3/tb/creds
  //   https://us-east-1.console.aws.amazon.com/ec2/tb/creds
  const CRED_PATTERN = /\/([^\/]+)\/tb\/creds/i;

  // Store original fetch
  const originalFetch = window.fetch;

  // Monkey-patch fetch
  window.fetch = async function(...args) {
    const [resource, config] = args;
    const url = typeof resource === 'string' ? resource : resource?.url || '';

    // Call original fetch
    const response = await originalFetch.apply(this, args);

    // Check if this is a credentials endpoint and extract service name
    const credMatch = url.match(CRED_PATTERN);

    if (credMatch) {
      const service = credMatch[1]; // e.g., "console", "s3", "ec2"

      try {
        // Clone the response so we can read it without consuming it
        const clonedResponse = response.clone();
        const data = await clonedResponse.json();

        // Look for credential patterns in the response
        const credentials = extractCredentials(data, url);

        if (credentials && credentials.accessKeyId) {
          // Emit event with credentials including service name
          window.dispatchEvent(new CustomEvent('__AWS_CREDS_INTERCEPTED__', {
            detail: {
              credentials: credentials,
              service: service,
              source: url,
              timestamp: Date.now()
            }
          }));

          console.log('[clier] Credentials intercepted from:', service, url);
        }
      } catch (e) {
        // Response might not be JSON, ignore
      }
    }

    return response;
  };

  // Also patch XMLHttpRequest for older AWS console code paths
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    this._awsCredUrl = url;
    return originalXHROpen.apply(this, [method, url, ...rest]);
  };

  XMLHttpRequest.prototype.send = function(...args) {
    const url = this._awsCredUrl || '';
    const credMatch = url.match(CRED_PATTERN);

    if (credMatch) {
      const service = credMatch[1];

      this.addEventListener('load', function() {
        try {
          const data = JSON.parse(this.responseText);
          const credentials = extractCredentials(data, url);

          if (credentials && credentials.accessKeyId) {
            window.dispatchEvent(new CustomEvent('__AWS_CREDS_INTERCEPTED__', {
              detail: {
                credentials: credentials,
                service: service,
                source: url,
                timestamp: Date.now()
              }
            }));

            console.log('[clier] Credentials intercepted (XHR) from:', service, url);
          }
        } catch (e) {
          // Response might not be JSON, ignore
        }
      });
    }

    return originalXHRSend.apply(this, args);
  };

  /**
   * Extract credentials from /{service}/tb/creds response
   * Expected format:
   * {
   *   "accessKeyId": "ASIA...",
   *   "secretAccessKey": "...",
   *   "sessionToken": "...",
   *   "expiration": "2026-01-15T00:51:45.000Z"
   * }
   */
  function extractCredentials(data, url) {
    if (!data || typeof data !== 'object') return null;

    // Direct format from /console/tb/creds
    if (data.accessKeyId && data.secretAccessKey && data.sessionToken) {
      const creds = {
        accessKeyId: data.accessKeyId,
        secretAccessKey: data.secretAccessKey,
        sessionToken: data.sessionToken,
        expiration: data.expiration || null,
        region: null
      };

      // Extract region from URL (e.g., us-east-1.console.aws.amazon.com)
      const regionMatch = url.match(/([a-z]{2}-[a-z]+-\d)\.console\.aws/);
      if (regionMatch) {
        creds.region = regionMatch[1];
      }

      return creds;
    }

    return null;
  }

  // Signal that injection is complete
  window.dispatchEvent(new CustomEvent('__AWS_CREDS_INTERCEPTED_READY__'));
  console.log('[clier] Interceptor installed - watching for /{service}/tb/creds endpoints');

})();
