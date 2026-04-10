# AI Pixel Studio

AI Pixel Studio is a browser-based design editor built with Next.js, Fabric.js,
Express microservices, MongoDB, and a Swagger/OpenAPI-documented API gateway.
The project includes real user journeys, API contracts,
external-integration boundaries, and Playwright tests that verify behavior
instead of only checking that pages load.

## What The Application Does

AI Pixel Studio lets authenticated users create, edit, save, and manage visual
design projects.

Core product features:

- Google sign-in through NextAuth.
- Authenticated dashboard with recent projects, project status, and quick
  project access.
- One-click design creation from predefined formats.
- Fabric.js editor with persistent canvas state.
- Text, shape, drawing, upload, AI, settings, export, and properties tools.
- Autosave for canvas changes and design title updates.
- Project modal for opening and deleting saved designs.
- Image upload flow through the upload service.
- AI image generation through the upload service and Stability AI.
- AI draft creation from a title or custom prompt, with the generated image
  opened on an editable canvas.
- Subscription upgrade flow with PayPal handoff.
- Swagger UI and raw OpenAPI contract served by the API gateway.

## One-Click Design Formats

The dashboard provides one-click project starters. Each starter creates a
canvas and opens the most relevant editor panel.

| Starter | Size | Opens |
| --- | ---: | --- |
| YouTube Thumbnail | 900 x 500 | Elements |
| Logo Design | 400 x 465 | Elements |
| Color Palette | 500 x 500 | Settings |
| Typography | 200 x 200 | Text |
| Social Media | 825 x 465 | Elements |
| Stickers | 250 x 250 | Elements |
| Printables | 600 x 600 | Settings |
| AI Background | 825 x 465 | AI |
| AI Image Gen | 825 x 465 | AI |
| Upload | 825 x 465 | Uploads |

## Architecture

The app uses a frontend plus API gateway plus domain-service layout.

```text
Browser / Next.js client
        |
        | Authorization: Bearer <Google ID token>
        v
API Gateway :5000
        |
        | /v1 -> /api proxy rewrite
        v
Design service :5001   Upload service :5002   Subscription service :5003
        |                       |                         |
        v                       v                         v
MongoDB                 MongoDB + Cloudinary       MongoDB + PayPal
                        + Stability AI
```

Important implementation areas:

- `client/src/components/home` contains the dashboard and project creation UX.
- `client/src/components/editor` contains the Fabric.js editor shell and tools.
- `client/src/services` contains authenticated client API calls.
- `server/api-gateway` validates Google ID tokens and proxies `/v1/*`.
- `server/design-service` owns design CRUD and persisted canvas data.
- `server/upload-service` owns uploads and AI-generated media.
- `server/subscription-service` owns premium status and PayPal order capture.
- `docs/openapi.yaml` is the Swagger/OpenAPI contract for the public gateway.

## Swagger And API Contract

The API gateway serves both human-readable Swagger UI and the raw OpenAPI file.

When the gateway is running:

```text
Swagger UI:       http://localhost:5000/docs
Raw OpenAPI YAML: http://localhost:5000/openapi.yaml
Health check:     http://localhost:5000/health
```

The OpenAPI contract documents:

- gateway health and Swagger metadata,
- design CRUD endpoints,
- media upload and AI generation endpoints,
- subscription and PayPal checkout endpoints,
- bearer-token security,
- expected `401`, `403`, `404`, and `500` response contracts.

The Playwright API suite fetches `/openapi.yaml`, validates it with
`@apidevtools/swagger-parser`, confirms Swagger UI is available, and checks that
protected endpoints match the documented missing-token `401` behavior.

## Testing Strategy

This project uses Playwright for both browser E2E testing and API contract
testing.

The tests are intentionally scenario-focused. They verify real outcomes:

- redirect behavior for unauthenticated users,
- dashboard project status, AI Draft navigation, and project modal behavior,
- one-click project creation with correct canvas size and editor panel,
- free-plan creation gating,
- editor header accessibility labels,
- text insertion and serialized Fabric.js autosave,
- design rename autosave,
- large-canvas scrollability,
- properties panel close behavior,
- background color persistence,
- upload-to-canvas autosave,
- AI draft generation from a title,
- AI custom prompt generation,
- rendered canvas pixels after AI image creation,
- PayPal upgrade handoff,
- Swagger/OpenAPI validity and protected-route auth contracts.

### Test Files

| File | Purpose |
| --- | --- |
| `client/e2e/auth.spec.js` | Unauthenticated routing and login page checks |
| `client/e2e/dashboard.spec.js` | Dashboard status, AI Draft navigation, project creation, quota, upload starter, delete flow |
| `client/e2e/editor.spec.js` | Editor accessibility, autosave, canvas scrollability, settings, mode switching |
| `client/e2e/uploads.spec.js` | Existing uploaded image added to canvas and persisted |
| `client/e2e/ai-features.spec.js` | AI title/custom prompt generation and canvas rendering verification |
| `client/e2e/subscription.spec.js` | PayPal upgrade handoff from premium modal |
| `client/e2e/api-contract.spec.js` | Swagger/OpenAPI validation and gateway auth contract checks |
| `client/e2e/fixtures.js` | Authenticated session setup and API route mocks for deterministic E2E tests |

## How To Run The Project Locally

Install dependencies in each package:

```bash
cd client && npm install
cd ../server/api-gateway && npm install
cd ../design-service && npm install
cd ../upload-service && npm install
cd ../subscription-service && npm install
```

Start backend services:

```bash
cd server/design-service
npm start
```

```bash
cd server/upload-service
npm start
```

```bash
cd server/subscription-service
npm start
```

Start the API gateway:

```bash
cd server/api-gateway
npm start
```

Start the frontend:

```bash
cd client
npm run dev
```

Open:

```text
http://localhost:3000
```

See [docs/LOCAL_SETUP.md](docs/LOCAL_SETUP.md) for environment variables and
service startup details.

## How To Run Tests

Run browser E2E tests:

```bash
cd client
npm run test:e2e
```

Run Swagger/OpenAPI contract tests:

```bash
cd client
npm run test:api
```

Run the combined API contract and browser E2E suite:

```bash
cd client
npm run test:sdet
```

If port `3000` is already running, use a different frontend test port:

```bash
cd client
PORT=3100 npm run test:e2e
```

Current automated coverage:

- `18` browser E2E tests.
- `12` Swagger/API contract tests.
- `30` total checks through `npm run test:sdet`.

## Testing Design

The test suite is designed around user-visible outcomes and API contracts:

- Playwright browser automation for complete business journeys.
- API contract validation against Swagger/OpenAPI.
- Deterministic test fixtures with mocked authenticated API responses.
- Meaningful assertions on network payloads and persisted state.
- Canvas-specific validation, including pixel-level checks for generated images.
- Regression tests for real UX defects: inaccessible buttons, hover color
  issues, scrollability, blocked properties panel, missing avatar asset, and
  confusing project creation flow.
- A multi-service local architecture with gateway, service, and frontend
  boundaries.
- Clear separation between browser tests and API contract tests.

## Documentation Map

- [docs/README.md](docs/README.md): full documentation index.
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): system topology and service boundaries.
- [docs/API_REFERENCE.md](docs/API_REFERENCE.md): public API reference.
- [docs/openapi.yaml](docs/openapi.yaml): Swagger/OpenAPI contract.
- [docs/TESTING_STRATEGY.md](docs/TESTING_STRATEGY.md): detailed testing plan.
- [docs/LOCAL_SETUP.md](docs/LOCAL_SETUP.md): local environment and startup guide.

## Known Improvement Areas

These are realistic next steps for a production-grade application:

- Add unit tests for pure client services, store behavior, and Fabric helpers.
- Refactor Express services to export `app` separately from `listen()` so
  Supertest integration tests can run without binding ports.
- Add provider-native rollback commands after the production backend host is
  finalized.
- Add visual regression snapshots for core editor layouts.
- Add a small accessibility scan with axe for login, dashboard, and editor.
