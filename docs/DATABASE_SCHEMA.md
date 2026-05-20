# Database Schema

This project uses MongoDB through Mongoose. Each backend service owns its own
model and should use its own database in MongoDB Atlas for cleaner service
boundaries.

Recommended Atlas layout:

```text
pixel_studio_designs
pixel_studio_uploads
pixel_studio_subscriptions
```

## Design Service Schema

Source file: `server/design-service/src/models/design.js`

Mongoose model: `Design`

Recommended database: `pixel_studio_designs`

### Fields

| Field | Type | Required By Code | Description |
| --- | --- | --- | --- |
| `_id` | ObjectId | MongoDB generated | Design identifier used in `/editor/[slug]` |
| `userId` | String | yes in controller | Google subject from gateway `x-user-id` |
| `name` | String | no | User-visible design title |
| `canvasData` | String | no | Serialized Fabric.js canvas JSON |
| `width` | Number | no | Canvas width |
| `height` | Number | no | Canvas height |
| `category` | String | no | Design type/category |
| `createdAt` | Date | default | Creation timestamp |
| `updatedAt` | Date | default/manual update | Updated timestamp |

### Example Document

```json
{
  "_id": "666000000000000000000001",
  "userId": "google-sub-123",
  "name": "Untitled design - Youtube Thumbnail",
  "canvasData": "{\"version\":\"6.6.2\",\"objects\":[]}",
  "width": 825,
  "height": 465,
  "category": "youtube_thumbnail",
  "createdAt": "2026-06-15T00:00:00.000Z",
  "updatedAt": "2026-06-15T00:00:00.000Z"
}
```

### Access Patterns

| Operation | Query |
| --- | --- |
| List user designs | `Design.find({ userId }).sort({ updatedAt: -1 })` |
| Get one design | `Design.findOne({ _id: designId, userId })` |
| Update design | `Design.findOne({ _id: designId, userId })`, then `save()` |
| Delete design | ownership check, then `Design.deleteOne({ _id: designId })` |

### Recommended Indexes

```js
db.designs.createIndex({ userId: 1, updatedAt: -1 })
db.designs.createIndex({ userId: 1, _id: 1 })
```

### Current Caveats

- The schema uses `default: Date.now()` instead of `default: Date.now`, so the
  default date function is evaluated when the schema is created rather than at
  document creation time.
- There is no schema-level `required` validation.
- `canvasData` is stored as a string, not as structured JSON.

## Upload Service Schema

Source file: `server/upload-service/src/models/media.js`

Mongoose model: `Media`

Recommended database: `pixel_studio_uploads`

### Fields

| Field | Type | Required By Code | Description |
| --- | --- | --- | --- |
| `_id` | ObjectId | MongoDB generated | Media identifier |
| `userId` | String | yes in controller | Owner user ID |
| `name` | String | yes in controller | Original upload name or generated AI name |
| `cloudinaryId` | String | yes after Cloudinary upload | Cloudinary public ID |
| `url` | String | yes after Cloudinary upload | Cloudinary secure URL |
| `mimeType` | String | yes in controller | Media MIME type |
| `size` | Number | yes in controller | File size in bytes |
| `width` | Number | partial | AI-generated images store `1024`; normal uploads may be undefined |
| `height` | Number | partial | AI-generated images store `1024`; normal uploads may be undefined |
| `createdAt` | Date | default | Upload/generation timestamp |

### Example Normal Upload Document

```json
{
  "_id": "666000000000000000000002",
  "userId": "google-sub-123",
  "name": "logo.png",
  "cloudinaryId": "canva/logo",
  "url": "https://res.cloudinary.com/example/image/upload/logo.png",
  "mimeType": "image/png",
  "size": 12345,
  "createdAt": "2026-06-15T00:00:00.000Z"
}
```

### Example AI Generated Document

```json
{
  "_id": "666000000000000000000003",
  "userId": "google-sub-123",
  "name": "AI Generated A clean product background",
  "cloudinaryId": "canva/ai-image",
  "url": "https://res.cloudinary.com/example/image/upload/ai-image.png",
  "mimeType": "image/png",
  "size": 999999,
  "width": 1024,
  "height": 1024,
  "createdAt": "2026-06-15T00:00:00.000Z"
}
```

### Access Patterns

| Operation | Query |
| --- | --- |
| List user media | `Media.find({ userId }).sort({ createdAt: -1 })` |
| Create upload record | `new Media(...).save()` |
| Create AI media record | `new Media(...).save()` |

### Recommended Indexes

```js
db.media.createIndex({ userId: 1, createdAt: -1 })
```

Do not add a `cloudinaryId` index until a lookup, delete, or dedupe path needs
it. If Cloudinary IDs become durable unique external identifiers, prefer a
sparse unique index and add application handling for duplicate-key errors.

### Current Caveats

- Normal uploads do not currently persist image dimensions from Cloudinary.
- There is no delete endpoint for media, so Cloudinary assets may accumulate.
- There is no uniqueness constraint on `cloudinaryId`.

## Subscription Service Schema

Source file: `server/subscription-service/src/models/subscription.js`

Mongoose model: `Subscription`

Recommended database: `pixel_studio_subscriptions`

### Fields

| Field | Type | Required By Code | Description |
| --- | --- | --- | --- |
| `_id` | ObjectId | MongoDB generated | Subscription record ID |
| `userId` | String | yes in controller | Owner user ID |
| `isPremium` | Boolean | default false | Premium entitlement |
| `paymentId` | String | set after PayPal capture | PayPal capture ID |
| `premiumSince` | Date | set after capture | Premium activation timestamp |
| `updatedAt` | Date | pre-save hook | Last update timestamp |

### Example Document

```json
{
  "_id": "666000000000000000000004",
  "userId": "google-sub-123",
  "isPremium": true,
  "paymentId": "PAYPAL-CAPTURE-ID",
  "premiumSince": "2026-06-15T00:00:00.000Z",
  "updatedAt": "2026-06-15T00:00:00.000Z"
}
```

### Access Patterns

| Operation | Query |
| --- | --- |
| Get premium state | `Subscription.findOne({ userId })` |
| Capture payment | `Subscription.findOne({ userId })`, mutate, `save()` |

### Recommended Indexes

```js
db.subscriptions.createIndex({ userId: 1 }, { unique: true })
db.subscriptions.createIndex({ paymentId: 1 }, { sparse: true })
```

### Current Caveats

- `GET /subscription` creates an in-memory default object but does not save it.
- There is no uniqueness constraint on `userId`, so duplicate records are
  possible under race conditions.
- Payment records are not modeled separately from subscription entitlement.

## Cross-Service Data Rules

- Services should not read each other's MongoDB databases directly.
- User identity should flow through the gateway and service auth middleware.
- A user's Google subject is the common join key across service-owned data.
- There is currently no user profile service and no local users collection.

## Migration Guidance

There is no migration framework in the repository today.

Recommended next steps:

1. Add migration scripts per service if schemas become stricter.
2. Add service-owned index creation scripts.
3. Record schema changes in this document.
4. Avoid cross-service migrations that update multiple service databases in one
   transaction.
