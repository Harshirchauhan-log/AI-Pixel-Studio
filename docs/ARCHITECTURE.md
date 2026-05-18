# Architecture

## System Context

AI Pixel Studio is a monorepo-style application with a Next.js frontend and four
Node/Express backend services:

- `client`: Next.js 15 application, NextAuth Google authentication, Fabric.js editor.
- `server/api-gateway`: public backend entrypoint and reverse proxy.
- `server/design-service`: design persistence and design CRUD.
- `server/upload-service`: media upload/listing and AI image generation.
- `server/subscription-service`: premium subscription status and PayPal checkout.

At runtime the browser primarily talks to the API gateway. The gateway verifies
Google ID tokens and forwards authenticated requests to the downstream services.

```text
User browser
  |
  | Next.js pages, React components, NextAuth session
  v
Client services in client/src/services
  |
  | HTTP API base, currently hardcoded fallback http://localhost:5000
  v
API Gateway
  |
  | /v1/designs       -> DESIGN       -> /api/designs
  | /v1/media         -> UPLOAD       -> /api/media
  | /v1/subscription  -> SUBSCRIPTION -> /api/subscription
  v
Domain services
```

## Technology Stack

| Layer | Technology | Evidence |
| --- | --- | --- |
| Frontend framework | Next.js 15, React 19 | `client/package.json` |
| Authentication | NextAuth v5 beta, Google provider | `client/src/auth.js` |
| Editor canvas | Fabric.js | `client/src/fabric/fabric-utils.js` |
| Client state | Zustand | `client/src/store/index.js` |
| HTTP client | Axios | `client/src/services/base-service.js` |
| API gateway | Express, express-http-proxy | `server/api-gateway/src/server.js` |
| Backend services | Express, Mongoose | `server/*/src/server.js` |
| Primary database | MongoDB | service `MONGO_URI` values |
| Media storage | Cloudinary | `server/upload-service/src/utils/cloudinary.js` |
| AI image generation | Stability AI REST API | `server/upload-service/src/controllers/ai-image-controller.js` |
| Payments | PayPal REST API | `server/subscription-service/src/controllers/payment-controller.js` |

## Service Boundaries

### API Gateway

The API gateway is the public backend facade. It:

- Runs on `PORT`, default `5000`.
- Applies `helmet`, `cors`, `express.json`, and URL encoded parsing.
- Verifies Google ID tokens with `google-auth-library`.
- Extracts Google user identity from the token.
- Adds `x-user-id`, `x-user-email`, and `x-user-name` headers.
- Proxies `/v1/*` routes to downstream service `/api/*` routes.

It does not currently aggregate data from multiple services. It is a routing
and authentication layer.

### Design Service

The design service owns user design documents. It:

- Runs on `PORT`, default `5001`.
- Connects to MongoDB with `MONGO_URI`.
- Exposes `/api/designs`.
- Stores Fabric canvas JSON as a string in `canvasData`.
- Scopes reads, updates, and deletes by `userId`.

### Upload Service

The upload service owns media assets. It:

- Runs on `PORT`, default `5002`.
- Connects to MongoDB with `MONGO_URI`.
- Exposes `/api/media`.
- Accepts multipart image uploads through Multer.
- Uploads media bytes to Cloudinary.
- Stores Cloudinary metadata and URLs in MongoDB.
- Generates AI images through Stability AI, then stores the generated image
  through the same Cloudinary plus MongoDB flow.

### Subscription Service

The subscription service owns premium state. It:

- Runs on `PORT`, default `5003`.
- Connects to MongoDB with `MONGO_URI`.
- Exposes `/api/subscription`.
- Reads a subscription record per `userId`; when no record exists, `GET`
  returns an unsaved default state.
- Capture creates and persists the subscription record when needed.
- Creates PayPal checkout orders.
- Captures PayPal orders and marks users premium.

The frontend currently references this service on home/editor load and through
the premium modal. Running without this service requires either a mock, a
running service with valid MongoDB/PayPal configuration, or frontend changes to
disable subscription reads.

## Communication Model

The system uses synchronous REST-style HTTP, not event streaming.

The client service modules read `process.env.NEXT_PUBLIC_API_URL`, then
`process.env.API_URL`, then fall back to `http://localhost:5000`.
`NEXT_PUBLIC_API_URL` is the preferred setting for browser builds because
Next.js exposes public variables to client-side modules.

The client attaches the Google ID token:

```text
Authorization: Bearer <session.idToken>
```

The API gateway verifies that token and forwards user identity to services:

```text
x-user-id: <google subject>
x-user-email: <email>
x-user-name: <name>
```

Downstream services trust `x-user-id` and do not independently verify the
Google token. This is acceptable only if services are private and reachable
only through the API gateway.

## Runtime Topology

Recommended local ports:

| Component | Port | URL |
| --- | ---: | --- |
| Client | 3000 | `http://localhost:3000` |
| API gateway | 5000 | `http://localhost:5000` |
| Design service | 5001 | `http://localhost:5001` |
| Upload service | 5002 | `http://localhost:5002` |
| Subscription service | 5003 | `http://localhost:5003` |

Gateway upstream variables:

```env
DESIGN=http://localhost:5001
UPLOAD=http://localhost:5002
SUBSCRIPTION=http://localhost:5003
```

## Data Ownership

Each service owns its own MongoDB model:

| Service | Model | Collection Purpose |
| --- | --- | --- |
| Design service | `Design` | User-created design documents and Fabric canvas JSON |
| Upload service | `Media` | Uploaded/generated media metadata and Cloudinary URLs |
| Subscription service | `Subscription` | Premium status and payment metadata |

For a microservices-style Atlas setup, use one MongoDB Atlas cluster with
separate databases:

```text
pixel_studio_designs
pixel_studio_uploads
pixel_studio_subscriptions
```

## Architectural Caveats

- Downstream service auth trusts forwarded headers. In production, keep
  services private or add service-to-service authentication.
- MongoDB services call `app.listen()` even if `mongoose.connect()` fails. This
  means a service can appear healthy while database operations fail later.
- There is no message queue, retry queue, outbox, or background worker for
  slow tasks such as AI image generation.
- The gateway has no explicit health endpoints.
- The subscription service depends on PayPal APIs during checkout and capture.
- The frontend currently depends on subscription APIs for premium gating even
  if the team intends not to use subscriptions yet.
