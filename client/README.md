# AI Pixel Studio Client

This is the Next.js frontend for the AI Pixel Studio application. It is not a
standalone Create Next App demo; it depends on the API gateway and backend
services documented in `../docs`.

## What This Client Does

- Provides Google login through NextAuth.
- Protects the dashboard and editor routes with middleware.
- Shows the design dashboard at `/`.
- Loads the editor at `/editor/[slug]`.
- Renders and edits designs with Fabric.js.
- Persists design changes through the design service.
- Uploads media through the upload service.
- Generates AI images through the upload service and Stability AI.
- Exports canvas content as PNG, SVG, PDF, or JSON in the browser.
- Integrates with subscription UI and PayPal-backed premium endpoints when the
  subscription service is enabled.

## Required Backend

The frontend expects the API gateway to be available at:

```text
http://localhost:5000
```

The gateway then proxies to:

```text
design-service       http://localhost:5001
upload-service       http://localhost:5002
subscription-service http://localhost:5003
```

See [../docs/LOCAL_SETUP.md](../docs/LOCAL_SETUP.md) for full startup order.

## Environment

Use `client/.env` for local development.

Required:

```env
AUTH_SECRET=<random-nextauth-secret>
AUTH_GOOGLE_ID=<google-oauth-client-id>
AUTH_GOOGLE_SECRET=<google-oauth-client-secret>
NEXT_PUBLIC_API_URL=http://localhost:5000
```

Important: Auth.js expects `AUTH_GOOGLE_ID` for the Google provider when the
provider is configured as `Google` without explicit credentials. If the file
contains `GOOGLE_CLIENT_ID`, rename or duplicate it as `AUTH_GOOGLE_ID`.

Browser-side client modules read `NEXT_PUBLIC_API_URL`, then `API_URL`, then
fall back to `http://localhost:5000`. Prefer `NEXT_PUBLIC_API_URL` for local and
production browser builds.

## Commands

Install:

```bash
npm install
```

Run locally:

```bash
npm run dev
```

Build:

```bash
npm run build
```

Start production build:

```bash
npm start
```

Lint:

```bash
npm run lint
```

Current caveat: `npm run lint` is not a reliable automated check until ESLint
is configured for this project.

## Main Routes

| Route | Purpose |
| --- | --- |
| `/login` | Google sign-in page |
| `/` | Authenticated design dashboard |
| `/editor/[slug]` | Fabric.js design editor |
| `/subscription/success` | PayPal return/capture page |
| `/subscription/cancel` | PayPal cancel page |
| `/api/auth/[...nextauth]` | NextAuth API route |

## More Documentation

- [Architecture](../docs/ARCHITECTURE.md)
- [Feature Inventory](../docs/FEATURE_INVENTORY.md)
- [Data Flows](../docs/DATA_FLOWS.md)
- [API Reference](../docs/API_REFERENCE.md)
- [Troubleshooting Runbooks](../docs/TROUBLESHOOTING_RUNBOOKS.md)
