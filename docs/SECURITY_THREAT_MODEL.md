# Security Threat Model

This document summarizes trust boundaries, primary threats, current controls,
and recommended mitigations for the AI Pixel Studio codebase.

## Scope

In scope:

- Browser client and NextAuth session handling.
- API gateway Google ID token verification.
- Gateway-to-service identity forwarding.
- Design, media, and subscription data access.
- File upload and AI image generation.
- PayPal order creation/capture.
- Secrets and runtime configuration.

Out of scope:

- Google, MongoDB Atlas, Cloudinary, Stability AI, and PayPal platform internals.

## Assets

| Asset | Why It Matters |
| --- | --- |
| Google ID token | Grants API access when accepted by gateway |
| MongoDB data | Stores designs, media metadata, subscription entitlement |
| Cloudinary assets | Stores user-uploaded and AI-generated images |
| PayPal credentials | Allows payment order creation/capture |
| Stability API key | Allows paid AI image generation |
| Fabric canvas data | User-generated design IP/content |
| Subscription state | Controls premium gating |

## Trust Boundaries

```text
Browser
  |
  | Bearer Google ID token
  v
Public API Gateway
  |
  | x-user-id / x-user-email / x-user-name
  v
Private backend services
  |
  | service credentials
  v
MongoDB / Cloudinary / Stability AI / PayPal
```

Critical boundary: downstream services trust `x-user-id`. They must be private
or protected by additional service-to-service authentication.

## Threats And Mitigations

### T1: Direct Service Access With Spoofed User Header

Threat:

- An attacker calls `design-service`, `upload-service`, or
  `subscription-service` directly and sets `x-user-id`.

Current controls:

- Downstream middleware requires `x-user-id`.
- Gateway verifies Google ID tokens before forwarding headers.

Gap:

- Services do not verify that headers came from the gateway.

Mitigations:

- Do not expose service ports publicly.
- Place services on a private network.
- Add service-to-service authentication, such as mTLS or a signed internal
  gateway header.
- Consider token verification in each service if services may be called
  directly.

### T2: Invalid Or Misconfigured Google Token

Threat:

- Wrong OAuth audience or invalid token accepted.

Current controls:

- Gateway uses `OAuth2Client.verifyIdToken`.
- Audience is `GOOGLE_CLIENT_ID`.

Mitigations:

- Ensure client `AUTH_GOOGLE_ID` and gateway `GOOGLE_CLIENT_ID` match.
- Current worktree risk: the client env file may use `GOOGLE_CLIENT_ID`, but
  Auth.js expects `AUTH_GOOGLE_ID` for the Google provider when credentials are
  not passed explicitly.
- Monitor token verification failures.
- Keep Google OAuth redirect URIs tightly scoped.

### T3: Unauthorized Design Access

Threat:

- User reads, updates, or deletes another user's design.

Current controls:

- Design queries include `userId` for reads/updates/deletes.

Mitigations:

- Add automated ownership tests.
- Add Mongo index `{ userId: 1, _id: 1 }`.
- Avoid admin/debug routes that bypass `userId`.

### T4: Malicious File Upload

Threat:

- User uploads unsafe, oversized, or disguised files.

Current controls:

- Frontend file input accepts `image/*`.
- Multer parses a single `file` field in memory.
- Cloudinary receives the uploaded bytes.

Gaps:

- Server-side MIME validation is absent.
- Multer limits are configured as a number, not `{ fileSize: ... }`.
- No content scanning.
- Direct authenticated API callers can submit non-image payloads unless
  server-side validation is added.

Mitigations:

- Fix Multer limits.
- Validate MIME type and magic bytes server-side.
- Restrict Cloudinary resource types if only images are allowed.
- Add upload rate limits.
- Consider malware/media scanning before exposing files.

### T5: Prompt Abuse Or Sensitive Prompt Logging

Threat:

- AI prompts may contain sensitive data or abusive content.
- Logs currently include prompt and user ID.

Current controls:

- Stability AI handles external generation.

Gaps:

- No prompt validation.
- No rate limiting.
- Prompt/user ID logged.

Mitigations:

- Validate prompt length and basic content.
- Remove prompt logging in production.
- Add per-user rate limits.
- Handle provider safety/quota errors explicitly.

### T6: Payment Tampering Or Incorrect Entitlement

Threat:

- A user submits an arbitrary PayPal `orderId` and gets premium.
- Repeated capture attempts create inconsistent state.

Current controls:

- Service calls PayPal capture endpoint.
- Premium state is set after capture response.

Gaps:

- No pending order record tied to user.
- No webhook verification.
- No idempotency.
- No capture status, amount, currency, or order ownership verification is
  implemented before the service marks the user premium.

Mitigations:

- Store created orders with `userId`, amount, currency, and status.
- Verify capture amount/currency/status before setting premium.
- Add PayPal webhooks.
- Add idempotency for capture.
- Add unique subscription index by `userId`.

### T7: Secret Leakage

Threat:

- API keys and MongoDB URIs leak through files, logs, or commits.

Current controls:

- Secrets are expected in `.env` files.

Mitigations:

- Keep `.env` files out of version control.
- Use secret manager/platform secrets in production.
- Rotate exposed keys.
- Never print secret values in logs.

### T8: Client-Side API URL Misconfiguration

Threat:

- Browser builds can call localhost in production if `NEXT_PUBLIC_API_URL` is
  missing or set incorrectly.

Current controls:

- The client service layer reads `NEXT_PUBLIC_API_URL` before falling back to
  `API_URL` and then `http://localhost:5000`.

Mitigations:

- Set `NEXT_PUBLIC_API_URL` in every deployed client environment.
- Validate production builds against deployed API URL.
- Add E2E smoke tests in deployed environment.

## Security Test Plan

Minimum tests:

- Missing Bearer token returns 401 at gateway.
- Invalid Bearer token returns 401 at gateway.
- Direct downstream call without `x-user-id` returns 401.
- User A cannot read/update/delete User B design.
- Upload rejects missing file.
- Oversized upload is rejected after Multer limit is fixed.
- PayPal capture cannot mark premium without a user-owned pending order after
  payment hardening is implemented.

## Security Readiness Checklist

- [ ] Treat existing credential-bearing `.env` files as sensitive local files;
      remove them from source control/worktree handoff, rotate exposed
      credentials, and keep only `.env.example` templates.
- [ ] Add root/server `.gitignore` rules for `.env*`.
- [ ] Downstream services private.
- [ ] Service-to-service auth added or direct access impossible.
- [ ] MongoDB users scoped per service database.
- [ ] Secrets stored in secret manager.
- [ ] Upload validation hardened.
- [ ] AI prompt logging removed or sanitized.
- [ ] Payment order ownership and webhook verification implemented.
- [ ] Rate limits applied to auth, upload, AI, and payment endpoints.
- [ ] Security tests added to the regular verification checklist.
