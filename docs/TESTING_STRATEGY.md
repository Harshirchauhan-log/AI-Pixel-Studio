# Testing Strategy

This document defines a practical testing plan for the current codebase. It
also documents the present test coverage state.

## Current Test State

The client includes Playwright coverage for both browser journeys and
Swagger/OpenAPI-backed API contract checks.
Each backend service also includes a Node test for its auth middleware.

Primary SDET-oriented commands:

```bash
cd client
npm run test:e2e
npm run test:api
npm run test:sdet
```

`test:e2e` runs browser regression tests for auth routing, dashboard design
journeys, editor autosave, upload-to-canvas behavior, AI draft creation, and
subscription handoff.

`test:api` runs Playwright API tests against the API gateway. These tests fetch
`/openapi.yaml`, validate it as an OpenAPI document, verify Swagger UI is
served at `/docs/`, and assert protected `/v1/*` operations return the
documented missing-token `401` contract.

The Playwright UI config starts the Next.js app. The API contract config starts
or reuses the API gateway. If the gateway is already running on port `5000`, the
test runner reuses it.

## Testing Goals

The application has several risk-heavy areas:

- Google authentication and token forwarding.
- API gateway route rewriting.
- User-scoped design authorization.
- Fabric.js serialization/deserialization.
- Autosave behavior.
- Multipart media upload.
- External integrations: Cloudinary, Stability AI, PayPal.
- Premium gating behavior.
- Client-side export behavior.

Testing should cover those areas before production use.

## Recommended Test Pyramid

```text
Manual exploratory smoke tests
          ^
End-to-end browser tests
          ^
API integration tests
          ^
Unit tests for pure utilities and controllers
```

## Unit Test Candidates

### Client

Recommended framework: Vitest or Jest with React Testing Library.

High-value targets:

- `client/src/services/design-service.js`
  - serializes `canvas.toJSON(["id", "filters"])`,
  - sends width/height/name,
  - passes optional `designId`.
- `client/src/services/export-service.js`
  - calls expected Fabric APIs for JSON, PNG, SVG, PDF.
- `client/src/store/index.js`
  - state transitions for `setCanvas`, `setDesignId`, `resetStore`,
  - autosave status transitions,
  - behavior when `markAsModified()` has no `designId`.
- `client/src/fabric/fabric-utils.js`
  - shape/text/image helper behavior where Fabric can be mocked.

### Backend

Recommended framework: Jest or Vitest plus Supertest.

High-value targets:

- API gateway auth middleware:
  - missing token returns 401,
  - invalid token returns 401,
  - valid token forwards user headers.
- Design controller:
  - list scopes by `userId`,
  - get denies wrong user,
  - create persists expected fields,
  - update requires ownership,
  - delete requires ownership.
- Upload controller:
  - missing file returns 400,
  - Cloudinary failure returns 500,
  - successful upload persists `Media`.
- Subscription controller:
  - default non-premium response,
  - capture creates or updates subscription.

## API Integration Tests

Recommended tool: Supertest against Express apps after refactoring servers to
export `app` separately from `listen()`.

Current blocker:

- Each `src/server.js` constructs and starts the app directly.
- Tests would be easier if each service had:

```js
// app.js
module.exports = app;

// server.js
const app = require("./app");
app.listen(PORT);
```

Integration test matrix:

| Area | Test |
| --- | --- |
| Gateway routing | `/v1/designs` rewrites to `/api/designs` |
| Gateway upload | `/v1/media/upload` preserves multipart body |
| Design auth | missing `x-user-id` returns 401 downstream |
| Design ownership | cannot read/update/delete another user's design |
| Upload listing | returns only current user's media |
| Subscription | returns default state for new user |

## End-To-End Tests

Recommended tool: Playwright.

Recommended browser/BDD tooling:

- Playwright for the primary E2E smoke and regression suite.
- Cucumber for behavior-driven scenarios when flows need business-readable
  acceptance criteria.

Critical E2E flows:

1. Login redirects unauthenticated user to `/login`.
2. Authenticated user lands on dashboard.
3. User creates a design from the banner.
4. Editor loads created design.
5. User adds text and autosave runs.
6. Reload editor and design content is restored.
7. User uploads image and sees it in Uploads panel.
8. User adds uploaded image to canvas.
9. User exports PNG/SVG/JSON/PDF.
10. User deletes a design from Projects.

External integration strategy:

- Mock Google auth for E2E tests or use a test-only auth bypass.
- Mock Cloudinary/Stability/PayPal in automated test runs.
- Keep one manual sandbox test for each external integration.

## Manual Smoke Test Checklist

Use this after starting the local stack.

### Auth

- Visit `http://localhost:3000`.
- Confirm unauthenticated redirect to `/login`.
- Sign in with Google.
- Confirm redirect to dashboard.

### Dashboard

- Confirm recent designs load.
- Create design from banner.
- Create design from design type grid.
- Open Projects modal.
- Delete a non-critical test design.

### Editor

- Add shape.
- Add text.
- Change background color.
- Use drawing mode.
- Select object and change properties.
- Rename design.
- Wait for save status to return to saved.
- Refresh page and confirm design reloads.

### Upload

- Open Uploads panel.
- Upload an image.
- Confirm thumbnail appears.
- Add image to canvas.

### AI

- Open AI panel.
- Submit a small prompt.
- Confirm generated image preview appears.
- Add generated image to canvas.

### Export

- Export PNG.
- Export SVG.
- Export PDF.
- Export JSON.

### Subscription, If Enabled

- Open premium modal.
- Create PayPal sandbox order.
- Cancel and verify cancel page.
- Complete sandbox payment and verify premium state.

## API Smoke Checks

Unauthenticated gateway check:

```bash
curl -i http://localhost:5000/v1/designs
```

Expected:

```text
401
```

Downstream missing-header check:

```bash
curl -i http://localhost:5001/api/designs
```

Expected:

```text
401
```

Authenticated API checks require a Google ID token:

```bash
TOKEN=<google-id-token>
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/v1/designs
```

Expected:

```json
{
  "success": true,
  "data": []
}
```

## Test Data Management

Use a dedicated test database per service:

```text
pixel_studio_designs_test
pixel_studio_uploads_test
pixel_studio_subscriptions_test
```

Recommended cleanup:

- Delete test user documents after test run.
- Use a deterministic test Google subject or auth mock.
- Avoid writing test uploads to production Cloudinary folders.

## Local Verification Commands

Recommended commands before sharing or deploying changes:

```bash
cd server/api-gateway && npm test
cd server/design-service && npm test
cd server/upload-service && npm test
cd server/subscription-service && npm test
cd client && npm run test:api
cd client && npm run build
cd client && npm run test:e2e
```

## Known Quality Gaps To Test First

- Deployed frontend should be smoke-tested with `NEXT_PUBLIC_API_URL` set to the
  deployed gateway URL.
- Sidebar Create bypasses premium gate.
- JSON/PNG export functions do not explicitly return `true`.
- Multer file size limit is not configured as an object.
- Mongo services start listening even when DB connection fails.
- PayPal capture lacks order-user correlation and webhook verification.
