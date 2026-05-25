# Deployment Guide

This document describes how to deploy the application with the frontend on
Vercel and the backend services on Render. The repository includes
provider-specific manifests for this hosting topology.

## Deployable Units

| Unit | Path | Runtime | Start Command |
| --- | --- | --- | --- |
| Client | `client` | Next.js | `npm run build`, then `npm start` |
| API Gateway | `server/api-gateway` | Node.js | `npm start` |
| Design Service | `server/design-service` | Node.js | `npm start` |
| Upload Service | `server/upload-service` | Node.js | `npm start` |
| Subscription Service | `server/subscription-service` | Node.js | `npm start` |

## Hosting Topology

Recommended provider split:

| Unit | Provider | Config |
| --- | --- | --- |
| Client | Vercel | `client/vercel.json`, Vercel project root `client` |
| API Gateway | Render web service | `render.yaml` |
| Design Service | Render private service | `render.yaml` |
| Upload Service | Render private service | `render.yaml` |
| Subscription Service | Render private service | `render.yaml` |

The Render Blueprint keeps only the API gateway public. The three domain
services are private services and receive traffic through Render's private
network. They still require the shared `INTERNAL_SERVICE_TOKEN` for defense in
depth.

## Build And Start Commands

### Client

Development:

```bash
cd client
npm run dev
```

Production:

```bash
cd client
npm run build
npm start
```

The client `start` script runs `next start`.

### Backend Services

Each backend service has:

```bash
npm start
```

which runs:

```bash
node src/server.js
```

Each backend service also has:

```bash
npm run dev
```

which runs:

```bash
nodemon src/server.js
```

## Runtime Configuration

### Client

Required for authentication:

```env
AUTH_SECRET=<secret>
AUTH_GOOGLE_ID=<google-client-id>
AUTH_GOOGLE_SECRET=<google-client-secret>
```

Current API base behavior:

- Client services read `process.env.NEXT_PUBLIC_API_URL`, then
  `process.env.API_URL`, then fall back to `http://localhost:5000`.
- In browser-side Next.js code, public env variables are the reliable runtime
  configuration path.
- For production, set `NEXT_PUBLIC_API_URL` to the deployed API gateway URL.

Recommended production variable:

```env
NEXT_PUBLIC_API_URL=https://api.example.com
```

Vercel production variables:

```env
AUTH_SECRET=<generated-nextauth-secret>
AUTH_GOOGLE_ID=<google-client-id>
AUTH_GOOGLE_SECRET=<google-client-secret>
NEXTAUTH_URL=https://<your-vercel-domain>
NEXT_PUBLIC_API_URL=https://<your-render-api-gateway>.onrender.com
```

### API Gateway

```env
PORT=5000
DESIGN=https://design-service.example.internal
UPLOAD=https://upload-service.example.internal
SUBSCRIPTION=https://subscription-service.example.internal
GOOGLE_CLIENT_ID=<google-client-id>
CORS_ORIGINS=https://<your-vercel-domain>
```

When deployed through `render.yaml`, the gateway receives the domain service
host and port values from Render service references:

```env
DESIGN_HOST=<render-managed>
DESIGN_PORT=<render-managed>
UPLOAD_HOST=<render-managed>
UPLOAD_PORT=<render-managed>
SUBSCRIPTION_HOST=<render-managed>
SUBSCRIPTION_PORT=<render-managed>
```

### Design Service

```env
PORT=5001
MONGO_URI=<design-service-mongodb-uri>
CORS_ORIGINS=https://<your-vercel-domain>
```

### Upload Service

```env
PORT=5002
MONGO_URI=<upload-service-mongodb-uri>
CORS_ORIGINS=https://<your-vercel-domain>
cloud_name=<cloudinary-cloud-name>
api_key=<cloudinary-api-key>
api_secret=<cloudinary-api-secret>
STABILITY_API_KEY=<stability-api-key>
```

### Subscription Service

```env
PORT=5003
MONGO_URI=<subscription-service-mongodb-uri>
CORS_ORIGINS=https://<your-vercel-domain>
PAYPAL_CLIENT_ID=<paypal-client-id>
PAYPAL_CLIENT_SECRET=<paypal-client-secret>
FRONTEND_URL=https://app.example.com
```

## Vercel Setup

1. Import the repository in Vercel.
2. Set the project root directory to `client`.
3. Keep the framework preset as Next.js.
4. Add the production environment variables listed above.
5. Deploy from the Vercel dashboard or Vercel CLI.

## Render Setup

1. In Render, create a new Blueprint from this repository.
2. Render reads `render.yaml` from the repository root and creates:
   - `canva-clone-api-gateway`
   - `canva-clone-design-service`
   - `canva-clone-upload-service`
   - `canva-clone-subscription-service`
3. Fill each `sync: false` environment variable when Render prompts for it.
4. Deploy each service manually from the Render dashboard when you are ready.

`render.yaml` sets `autoDeployTrigger: off`, so Render does not automatically
deploy every repository push.

## Network Topology

Production recommendation:

```text
Internet
  |
  v
Frontend hosting / CDN
  |
  v
Public API Gateway
  |
  | private network only
  v
Design Service       Upload Service       Subscription Service
  |                  |                    |
  v                  v                    v
MongoDB Atlas        MongoDB Atlas        MongoDB Atlas
                     Cloudinary           PayPal
                     Stability AI
```

Only the client and API gateway should be public. Service ports should not be
directly reachable from the internet because downstream services trust
`x-user-id` headers.

## Deployment Checklist

### Before Deploy

- Confirm Google OAuth redirect URI for deployed frontend:

```text
https://app.example.com/api/auth/callback/google
```

- Confirm PayPal return/cancel URLs use deployed `FRONTEND_URL`.
- Confirm MongoDB Atlas Network Access allows the deployment environment.
- Confirm service-specific MongoDB users have least-privilege database access.
- Confirm Cloudinary credentials are present only in the upload service.
- Confirm Stability key is present only in the upload service.
- Confirm downstream services are private.

### Build

- Install dependencies in each deployable unit.
- Run frontend build.
- Run lint if available.
- Run backend service tests with `npm test`.
- Run Swagger/API contract checks from `client` with `npm run test:api`.
- Run browser regression checks from `client` with `npm run test:e2e`.

### Release

- Deploy domain services first.
- Deploy API gateway after service URLs are available.
- Deploy frontend after API gateway URL is configured.
- Smoke test login, design creation, save/load, upload, and export.
- If subscription is enabled, smoke test PayPal sandbox order creation and
  capture.

## Health And Readiness

Current state:

- Every backend service exposes `GET /health`.
- Domain service health checks return `503` until MongoDB is connected.
- The API gateway health check returns `200` when the gateway process is
  running.

Recommended production endpoints:

```text
GET /healthz
GET /readyz
```

Readiness should fail if required dependencies are unavailable:

- Design service: MongoDB
- Upload service: MongoDB, Cloudinary, optionally Stability AI
- Subscription service: MongoDB, PayPal credentials
- API gateway: upstream service configuration

## Rollback Strategy

Current state:

- No migration tooling.
- No release metadata.
- No automated rollback scripts.

Recommended strategy:

1. Version each deployable unit independently.
2. Keep previous service images/artifacts available.
3. Avoid backward-incompatible schema changes without migrations.
4. Roll back API gateway last if frontend depends on new routes.
5. Roll back frontend first if UI is calling broken routes.

## Scaling Considerations

The current app is stateless at the Node process level except for:

- MongoDB connections,
- in-memory request processing,
- multipart upload buffers.

Horizontal scaling is viable if:

- all instances share the same MongoDB/Cloudinary/PayPal/Stability configuration,
- services remain stateless,
- upload memory limits are configured safely,
- gateway routes point to load-balanced service URLs.

## Current Deployment Gaps

- No Dockerfiles or container manifests.
- No custom domains wired in repository config.
- No centralized logging.
- No structured metrics.
- No migration/index creation scripts.
- No automated service-to-service token rotation.
- Provider-native rollback automation is not wired yet.
