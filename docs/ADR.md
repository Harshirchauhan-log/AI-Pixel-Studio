# Architecture Decision Records

This document captures the major architectural decisions represented by the
current codebase. Status values describe the current implementation, not a
future approval process.

## ADR-001: Use HTTP API Gateway For Service Communication

Status: accepted/current

### Context

The application has a browser client and several backend services. User actions
such as design CRUD, media upload, AI generation, and subscription checkout are
request/response flows.

### Decision

Use an Express API gateway as the public backend entrypoint. The gateway
verifies Google ID tokens and proxies `/v1/*` routes to downstream services
using synchronous HTTP.

### Consequences

Positive:

- Simple local development model.
- Frontend only needs one API base URL.
- Auth verification is centralized.
- No event broker is needed for current request/response flows.

Negative:

- Gateway can become a bottleneck.
- Downstream services trust forwarded headers.
- Long-running tasks such as AI generation hold HTTP requests open.

### Alternatives Considered

- Direct frontend-to-service calls: rejected because auth/CORS/routing would be
  duplicated across services.
- Kafka/event bus: not necessary for current synchronous user flows.

## ADR-002: Use Google NextAuth Session As The User Identity Source

Status: accepted/current

### Context

The project does not maintain a local users table. It relies on Google login.

### Decision

Use NextAuth with the Google provider. Store Google `id_token` in the NextAuth
JWT and expose it as `session.idToken`. The API gateway verifies that ID token
and uses the Google subject as `userId`.

### Consequences

Positive:

- No password storage.
- No custom user identity implementation.
- Same identity key can scope designs, media, and subscriptions.

Negative:

- Gateway depends on Google token verification.
- No local profile/role model exists.
- Changing auth providers would require a migration strategy for `userId`.

## ADR-003: Store Fabric Canvas State As JSON In MongoDB

Status: accepted/current

### Context

The editor uses Fabric.js and must persist arbitrary canvas objects, filters,
dimensions, and object IDs.

### Decision

Serialize the Fabric canvas with `canvas.toJSON(["id", "filters"])`, stringify
it, and store it as `Design.canvasData`.

### Consequences

Positive:

- Simple persistence.
- Preserves Fabric object data with minimal backend logic.
- Supports editor reload through `loadFromJSON`.

Negative:

- Backend cannot easily query individual canvas objects.
- Large designs can create large MongoDB documents.
- Schema validation of canvas internals is not enforced.

## ADR-004: Use Cloudinary For Media Storage

Status: accepted/current

### Context

User uploaded images and AI generated images need durable storage and public
URLs that can be loaded into Fabric.js.

### Decision

Upload media buffers to Cloudinary and store Cloudinary metadata plus secure
URLs in MongoDB.

### Consequences

Positive:

- Avoids storing binary files in MongoDB.
- Provides hosted image URLs for the browser canvas.
- Same path works for uploaded and generated images.

Negative:

- Upload service depends on Cloudinary credentials and availability.
- There is no media delete flow yet.
- Normal upload dimensions are not currently copied from Cloudinary results.

## ADR-005: Keep Exports Client-Side

Status: accepted/current

### Context

Users can export the current design as PNG, SVG, PDF, or JSON.

### Decision

Perform export in the browser using Fabric.js, `file-saver`, and `jsPDF`.

### Consequences

Positive:

- No backend rendering service required.
- Export works directly from the in-memory canvas.
- Reduces server load.

Negative:

- Large exports depend on browser memory/performance.
- Cross-origin image behavior can affect canvas export.
- Server cannot audit or reproduce exported artifacts.

## ADR-006: Use Separate MongoDB Databases Per Service

Status: recommended/current direction

### Context

Each service has a distinct model and ownership boundary.

### Decision

Use one MongoDB Atlas cluster but separate databases:

```text
pixel_studio_designs
pixel_studio_uploads
pixel_studio_subscriptions
```

### Consequences

Positive:

- Clear service data ownership.
- Lower cost than separate clusters.
- Easier operational isolation than one shared database.

Negative:

- Cross-service reporting requires explicit integration.
- Each service needs its own migration/index management.

## ADR-007: Keep Subscription As A Separate Service

Status: implemented but operationally optional

### Context

Premium gating and PayPal checkout are separate from core design editing.

### Decision

Implement subscription state and PayPal integration in
`server/subscription-service`.

### Consequences

Positive:

- Payment concerns are isolated.
- Core design/upload services do not need PayPal credentials.

Negative:

- Frontend currently calls subscription APIs on dashboard/editor entry.
- Running without subscription requires a mock, fallback, or frontend changes.
- Payment capture hardening is still needed before production use.
