# Operations And Security Notes

This document records current operational behavior and production-readiness
gaps found in the codebase.

## Current Security Model

### Browser To Gateway

The browser obtains a Google ID token through NextAuth and sends it to the API
gateway as a Bearer token.

The gateway verifies:

- token validity,
- Google audience,
- and user payload.

### Gateway To Services

The gateway forwards:

```http
x-user-id: <google subject>
x-user-email: <email>
x-user-name: <name>
```

Downstream services trust `x-user-id`.

Production requirement: do not expose downstream service ports publicly unless
those services also verify tokens or require a trusted internal service
credential. The current downstream middleware can be bypassed if an attacker can
call the service directly and set `x-user-id`.

## Secrets Management

Secrets currently live in `.env` files:

- Google OAuth credentials
- MongoDB URIs
- Cloudinary credentials
- Stability AI API key
- PayPal credentials

Production deployments should store these in a secret manager or platform
secret store, not in source control.

Current repository risk: credential-bearing `.env` files exist under the
client and server service directories. Treat those values as exposed if this
workspace is shared or committed. Remove real `.env` files from source control
or handoff artifacts, rotate any exposed credentials, add root/server ignore
rules for `.env*`, and keep only sanitized `.env.example` templates.

## Database Operations

Each service owns a MongoDB connection and model. Recommended production layout:

```text
One Atlas cluster
  pixel_studio_designs
  pixel_studio_uploads
  pixel_studio_subscriptions
```

Recommended hardening:

- Create separate MongoDB users per service.
- Grant each user access only to its database.
- Add schema validation or stronger Mongoose constraints.
- Add indexes for common lookups:
  - `Design`: `{ userId: 1, updatedAt: -1 }`
  - `Media`: `{ userId: 1, createdAt: -1 }`
  - `Subscription`: `{ userId: 1 }` unique

## Service Health And Readiness

Current services start listening before MongoDB readiness is guaranteed. A
production-grade service should:

- fail startup if required env vars are missing,
- connect to MongoDB before accepting traffic,
- expose `/healthz` for process liveness,
- expose `/readyz` for dependency readiness,
- return failed readiness when MongoDB, Cloudinary, PayPal, or Stability are
  required but unavailable.

## Upload And Media Safety

Current upload path:

- uses Multer memory storage,
- accepts `image/*` on the frontend,
- uploads to Cloudinary with `resource_type: "auto"`,
- stores Cloudinary metadata in MongoDB.

Recommended hardening:

- Configure Multer limits as an object: `limits: { fileSize: 10 * 1024 * 1024 }`.
- Add server-side MIME validation. It is currently absent.
- Validate file magic bytes, not only file extension or browser-provided MIME.
- Consider antivirus or media scanning for untrusted uploads.
- Avoid logging sensitive upload/user metadata in production.

## AI Image Generation

Current AI path:

- accepts a prompt from the authenticated user,
- sends it to Stability AI,
- uploads the generated image to Cloudinary,
- stores the result as user media.

Recommended hardening:

- Validate prompt length and content.
- Rate limit requests by user.
- Handle Stability API quota and safety errors explicitly.
- Add request timeouts.
- Avoid logging prompts if prompts may contain sensitive user data.
- Consider background processing for slow AI generation.

## Payment And Subscription Safety

Current payment path:

- creates a PayPal order,
- redirects the user to PayPal approval,
- captures the order on return,
- marks the current user premium after capture.

Recommended hardening:

- Verify order status and amount before setting premium.
- The current implementation does not verify capture status, amount, currency,
  or local order ownership before marking a user premium.
- Store pending order records tied to `userId`.
- Ensure the captured order belongs to the same user/session that created it.
- Add idempotency for repeated capture calls.
- Add PayPal webhooks for authoritative payment events.
- Revisit the current amount `value: "500"` if the intended price is not USD
  500.
- Remove the unused, unmounted `verifyPayment` stub or add a route and
  implementation for it.

## Reliability

Current backend calls are direct synchronous HTTP calls. This is reasonable for
the current user-facing flows, but long-running work would benefit from async
processing later.

Good candidates for a queue or event system in the future:

- AI image generation
- thumbnail generation
- export rendering on the server
- email receipts
- audit logs
- media scanning

Kafka is not required for the current implementation. If event-driven flows
become important, start with a simpler queue unless ordering, replay, and high
throughput event streams are explicit requirements.

## Observability

Current services primarily use `console.log` and `console.error`.

Recommended additions:

- structured JSON logs,
- request correlation IDs,
- gateway access logs,
- latency metrics per route,
- dependency error metrics,
- alerting for MongoDB connection failures,
- Cloudinary/Stability/PayPal failure rates.

## Frontend Operational Notes

- Next.js middleware redirects unauthenticated users to `/login`.
- The home page assumes subscription fetch succeeds; if the service is disabled,
  add graceful fallback logic.
- Export is client-side only and may be affected by cross-origin image behavior.
  Images are loaded with `crossOrigin = "Anonymous"` when added to Fabric.
- Autosave is debounced by 500 ms and requires a valid `designId`.

## Known Implementation Caveats

- `Design` model uses `default: Date.now()` instead of `default: Date.now`.
  This may evaluate timestamps earlier than intended.
- JSON and PNG export functions do not explicitly return `true`, while the
  export modal checks a success flag.
- Several dependencies appear unused, including `jsonwebtoken` in services.
- Some JSX uses `asChild="true"` or `aschild="true"` strings rather than boolean
  props; this may cause UI library behavior differences.
- The subscription service can be considered optional operationally only after
  the frontend is made resilient to missing subscription APIs.
