# Troubleshooting Runbooks

This document provides operational runbooks for common local and production
issues.

## Quick Status Checklist

Expected local ports:

```text
3000 client
5000 API gateway
5001 design service
5002 upload service
5003 subscription service, if enabled
```

Check listeners:

```bash
lsof -iTCP -sTCP:LISTEN -n -P | rg ':3000|:5000|:5001|:5002|:5003'
```

Check gateway auth enforcement:

```bash
curl -i http://localhost:5000/v1/designs
```

Expected result without a token:

```text
401 Unauthorized
```

## Runbook: Frontend Does Not Start

Symptoms:

- `next dev` fails.
- Browser cannot reach `http://localhost:3000`.
- Error mentions port binding or `EPERM`.

Checks:

```bash
cd client
npm install
npm run dev
```

Verify port:

```bash
lsof -iTCP:3000 -sTCP:LISTEN -n -P
```

Likely causes:

- Port 3000 is already used.
- Runtime sandbox does not allow binding.
- Dependencies are not installed.
- Node version is incompatible with dependencies.

Actions:

- Stop the process already using 3000 or use a different port.
- Reinstall dependencies in `client`.
- Prefer an active Node LTS version.

## Runbook: Login Fails

Symptoms:

- Google login redirects fail.
- NextAuth callback error.
- Gateway returns `Invalid Token!`.

Checks:

- Client env has:

```env
AUTH_GOOGLE_ID=<google-client-id>
AUTH_GOOGLE_SECRET=<google-client-secret>
AUTH_SECRET=<secret>
```

- API gateway env has:

```env
GOOGLE_CLIENT_ID=<same-google-client-id>
```

- Google Cloud OAuth client has redirect URI:

```text
http://localhost:3000/api/auth/callback/google
```

Likely causes:

- `AUTH_GOOGLE_ID` does not match gateway `GOOGLE_CLIENT_ID`.
- The frontend env uses `GOOGLE_CLIENT_ID` instead of `AUTH_GOOGLE_ID`.
- Redirect URI is missing in Google Cloud Console.
- The Bearer token sent to gateway is not a Google ID token.

Actions:

- Align client `AUTH_GOOGLE_ID` and gateway `GOOGLE_CLIENT_ID`.
- Restart client and gateway after env changes.
- Recreate Google OAuth Web Application credentials if needed.

## Runbook: API Gateway Returns 500

Symptoms:

- Client shows generic `Api request failed`.
- Gateway response:

```json
{
  "message": "Internal server error!",
  "error": "..."
}
```

Checks:

- Verify gateway upstream URLs:

```env
DESIGN=http://localhost:5001
UPLOAD=http://localhost:5002
SUBSCRIPTION=http://localhost:5003
```

- Verify services are listening:

```bash
lsof -iTCP -sTCP:LISTEN -n -P | rg ':5001|:5002|:5003'
```

Likely causes:

- Downstream service is not running.
- Gateway upstream env points to the wrong host/port.
- Subscription service is disabled while frontend still calls subscription APIs.

Actions:

- Start missing service.
- Fix gateway `.env`.
- If subscription is intentionally disabled, add a mock/default or make
  frontend subscription calls resilient.

## Runbook: MongoDB Connection Fails

Symptoms:

- Service logs `MongoDB Error`.
- Error includes `Invalid scheme`.
- Error includes `querySrv ECONNREFUSED`.
- Service starts but API operations fail.

Checks:

- URI starts with:

```text
mongodb://
```

or:

```text
mongodb+srv://
```

- Password special characters are URL encoded.
- Atlas Network Access allows your IP or deployment egress IP.
- DNS/network access is available.

Common encodings:

| Character | Encoded |
| --- | --- |
| `?` | `%3F` |
| `@` | `%40` |
| `#` | `%23` |
| `/` | `%2F` |
| `&` | `%26` |
| `:` | `%3A` |

Actions:

- Fix `MONGO_URI`.
- Restart the affected service.
- Confirm log shows `Connected to MongoDB`.

## Runbook: Designs Do Not Save

Symptoms:

- Save status stays `Saving...` or becomes `Error`.
- Reload loses canvas changes.
- Console logs `No design ID Available`.

Flow to check:

```text
Fabric event -> markAsModified -> debouncedSaveToServer -> POST /v1/designs
```

Likely causes:

- Editor route has no valid design slug.
- User is not authenticated.
- Gateway cannot reach design service.
- Design service cannot reach MongoDB.
- Design document is owned by another user.

Actions:

- Confirm editor URL is `/editor/<design-id>`.
- Confirm gateway `/v1/designs` returns 401 without token, not connection error.
- Confirm design service logs MongoDB connection.
- Confirm browser session is authenticated.

## Runbook: Uploads Fail

Symptoms:

- Upload panel logs `Upload Failed`.
- Upload service returns `Error creating asset`.
- No thumbnail appears after upload.

Checks:

- Upload service env has:

```env
cloud_name=<value>
api_key=<value>
api_secret=<value>
MONGO_URI=<value>
```

- Gateway route `/v1/media/upload` points to upload service.
- Upload service is listening on port 5002.

Likely causes:

- Cloudinary credentials invalid.
- Upload service cannot connect to MongoDB.
- File field is not named `file`.
- Gateway multipart body parsing changed.

Actions:

- Restart upload service after env changes.
- Test with a small image.
- Verify Cloudinary dashboard receives an asset.
- Verify upload service logs.

## Runbook: AI Image Generation Fails

Symptoms:

- AI panel remains without generated image.
- Upload service returns:

```json
{
  "success": false,
  "message": "Fetch from AI and upload to DB failed! Please try again"
}
```

Checks:

- Upload service env has:

```env
STABILITY_API_KEY=<value>
```

- Cloudinary credentials are valid.
- MongoDB is connected.

Likely causes:

- Stability API key missing or invalid.
- Stability account quota exhausted.
- Prompt rejected by external provider.
- Cloudinary upload failed after generation.

Actions:

- Check upload service logs for the external error message.
- Try a short safe prompt.
- Verify Stability account status.
- Verify Cloudinary credentials.

## Runbook: Export Does Not Close Modal

Symptoms:

- Export downloads file but modal remains open.

Likely cause:

- `exportAsJson` and `exportAsPng` trigger downloads but do not explicitly
  return `true`.
- The modal closes only when the selected export function returns a truthy
  value.

Actions:

- For code fix, make JSON and PNG export functions return `true` after
  successful download.

## Runbook: Subscription Fails

Symptoms:

- Premium modal cannot create order.
- Success page cannot capture payment.
- Service fails on startup with Mongo URI error.

Checks:

```env
MONGO_URI=mongodb+srv://...
PAYPAL_CLIENT_ID=<value>
PAYPAL_CLIENT_SECRET=<value>
FRONTEND_URL=http://localhost:3000
```

Likely causes:

- Subscription service not running.
- Mongo URI malformed.
- PayPal sandbox credentials invalid.
- `FRONTEND_URL` does not match current frontend.
- Subscription service is intentionally disabled but frontend still calls it.

Actions:

- Fix `MONGO_URI` and restart service.
- Use PayPal sandbox credentials for local development.
- If disabling subscription, make frontend subscription calls resilient.

## Runbook: Newer Node Version Dependency Crash

Symptoms:

- Service crashes inside a transitive dependency during startup.
- Error appears only on a newer Node version.

Likely cause:

- The repository does not declare a Node `engines` policy, and some
  dependencies may behave differently on very new Node versions.

Actions:

- Prefer an active Node LTS version.
- Reinstall dependencies under the LTS version.
- Upgrade affected transitive dependencies where possible.
- Add an `engines.node` policy once the team chooses the supported runtime.

## Escalation Notes

When a runbook does not resolve the issue, capture:

- service name,
- command used to start it,
- environment variable names present, not secret values,
- first error stack,
- relevant request path,
- whether gateway or downstream service returned the error,
- whether MongoDB/Cloudinary/Stability/PayPal was involved.
