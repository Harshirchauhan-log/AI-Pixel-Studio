# API Reference

This document is the endpoint-level reference for the current backend API.
Public clients call the API gateway on `/v1/*`; downstream services expose
matching `/api/*` routes after gateway path rewriting.

## Common API Conventions

### Base URLs

Local public API:

```text
http://localhost:5000
```

Swagger documentation:

```text
http://localhost:5000/docs
```

Raw OpenAPI contract:

```text
http://localhost:5000/openapi.yaml
```

Local downstream service URLs:

```text
Design service:       http://localhost:5001
Upload service:       http://localhost:5002
Subscription service: http://localhost:5003
```

### Authentication

All public API routes require:

```http
Authorization: Bearer <Google ID token>
```

The frontend gets this token from NextAuth as `session.idToken`.

Gateway behavior:

1. Verify token with Google.
2. Require audience to match `GOOGLE_CLIENT_ID`.
3. Forward identity to services using `x-user-id`, `x-user-email`, and
   `x-user-name`.

Downstream services require `x-user-id`.

### Standard Success Envelope

Most service responses use:

```json
{
  "success": true,
  "data": {}
}
```

### Standard Error Envelope

Most domain services use:

```json
{
  "success": false,
  "message": "Error message"
}
```

The gateway auth middleware uses two distinct error shapes:

```json
{ "error": "Access denied! No Token provided" }
```

```json
{
  "error": "Invalid Token!"
}
```

## Design API

Public gateway prefix:

```text
/v1/designs
```

Downstream prefix:

```text
/api/designs
```

Source files:

- `client/src/services/design-service.js`
- `server/api-gateway/src/server.js`
- `server/design-service/src/routes/design-routes.js`
- `server/design-service/src/controllers/design-controller.js`
- `server/design-service/src/models/design.js`

### List Designs

```http
GET /v1/designs
```

Behavior:

- Finds all designs for `req.user.userId`.
- Sorts by `updatedAt` descending.

Response:

```json
{
  "success": true,
  "data": [
    {
      "_id": "design-id",
      "userId": "google-sub",
      "name": "Untitled Design",
      "canvasData": "{\"objects\":[]}",
      "width": 900,
      "height": 500,
      "category": "YouTube Thumbnail",
      "createdAt": "2026-06-15T00:00:00.000Z",
      "updatedAt": "2026-06-15T00:00:00.000Z"
    }
  ]
}
```

Failure:

```json
{
  "success": false,
  "message": "Failed to fetch designs"
}
```

### Get Design By ID

```http
GET /v1/designs/:id
```

Behavior:

- Finds one design by `_id` and current `userId`.
- Prevents users from loading designs owned by another user.

Response:

```json
{
  "success": true,
  "data": {
    "_id": "design-id",
    "userId": "google-sub",
    "name": "Untitled Design",
    "canvasData": "{\"objects\":[]}",
    "width": 900,
    "height": 500
  }
}
```

Not found:

```json
{
  "success": false,
  "message": "Design not found! or you don't have permission to view it."
}
```

### Create Design

```http
POST /v1/designs
Content-Type: application/json
```

Body:

```json
{
  "name": "Untitled design - Youtube Thumbnail",
  "canvasData": null,
  "width": 825,
  "height": 465,
  "category": "youtube_thumbnail",
  "designId": null
}
```

Behavior:

- If `designId` is omitted or null, creates a new `Design`.
- Uses `name || "Untitled Design"`.
- Stores the authenticated user's `userId`.

Response:

```json
{
  "success": true,
  "data": {
    "_id": "new-design-id",
    "userId": "google-sub",
    "name": "Untitled design - Youtube Thumbnail",
    "canvasData": null,
    "width": 825,
    "height": 465,
    "category": "youtube_thumbnail",
    "createdAt": "2026-06-15T00:00:00.000Z",
    "updatedAt": "2026-06-15T00:00:00.000Z"
  }
}
```

### Update Design

```http
POST /v1/designs
Content-Type: application/json
```

Body:

```json
{
  "designId": "existing-design-id",
  "name": "Updated title",
  "canvasData": "{\"version\":\"6.6.2\",\"objects\":[]}",
  "width": 900,
  "height": 500
}
```

Behavior:

- If `designId` exists, loads the design by `_id` and `userId`.
- Updates only truthy provided fields in the current implementation.
- Sets `updatedAt = Date.now()`.

Current update caveat:

- The controller checks `if (name)`, `if (canvasData)`, `if (width)`, and
  similar truthy conditions.
- Clients cannot currently clear `name`, set `canvasData` to `null` or an empty
  string, or set dimensions to `0` through this endpoint.

Response:

```json
{
  "success": true,
  "data": {
    "_id": "existing-design-id",
    "userId": "google-sub",
    "name": "Updated title",
    "canvasData": "{\"version\":\"6.6.2\",\"objects\":[]}",
    "width": 900,
    "height": 500,
    "category": "youtube_thumbnail",
    "createdAt": "2026-06-15T00:00:00.000Z",
    "updatedAt": "2026-06-15T00:01:00.000Z"
  }
}
```

### Delete Design

```http
DELETE /v1/designs/:id
```

Behavior:

- Checks ownership with `_id` and `userId`.
- Deletes the document by `_id`.

Response:

```json
{
  "success": true,
  "message": "Design deleted successfully"
}
```

## Media API

Public gateway prefix:

```text
/v1/media
```

Downstream prefix:

```text
/api/media
```

Source files:

- `client/src/services/upload-service.js`
- `client/src/components/editor/sidebar/panels/upload.js`
- `client/src/components/editor/sidebar/panels/ai.js`
- `server/upload-service/src/routes/upload-routes.js`
- `server/upload-service/src/controllers/upload-controller.js`
- `server/upload-service/src/controllers/ai-image-controller.js`

### Upload Media

```http
POST /v1/media/upload
Content-Type: multipart/form-data
```

Form fields:

```text
file=<image file>
```

Gateway note:

- This route sets `parseReqBody: false` so the upload service can parse
  multipart data.

Behavior:

1. Multer reads a single field named `file` into memory.
2. Controller uploads the file buffer to Cloudinary.
3. Controller stores Cloudinary metadata in MongoDB.

Response:

```json
{
  "success": true,
  "data": {
    "_id": "media-id",
    "userId": "google-sub",
    "name": "image.png",
    "cloudinaryId": "cloudinary-public-id",
    "url": "https://res.cloudinary.com/...",
    "mimeType": "image/png",
    "size": 12345,
    "createdAt": "2026-06-15T00:00:00.000Z"
  }
}
```

Current dimension caveat:

- Normal uploads read `width` and `height` from `req.file`, but Multer does not
  provide image dimensions by default.
- AI-generated media explicitly stores dimensions.

### List Media

```http
GET /v1/media/get
```

Behavior:

- Finds media for current `userId`.
- Sorts by `createdAt` descending.

Response:

```json
{
  "success": true,
  "data": [
    {
      "_id": "media-id",
      "name": "image.png",
      "url": "https://res.cloudinary.com/..."
    }
  ]
}
```

### Generate AI Image

```http
POST /v1/media/ai-image-generate
Content-Type: application/json
```

Body:

```json
{
  "prompt": "A bright YouTube thumbnail background"
}
```

Behavior:

1. Sends `prompt` to Stability AI's stable-image generation API.
2. Receives the generated PNG image bytes.
3. Converts the returned bytes to a buffer.
4. Uploads the image to Cloudinary.
5. Stores a `Media` document.

Response:

```json
{
  "success": true,
  "data": {
    "_id": "media-id",
    "name": "AI Generated A bright YouTube thumbnail background",
    "url": "https://res.cloudinary.com/...",
    "mimeType": "image/png",
    "width": 1024,
    "height": 1024
  },
  "prompt": "A bright YouTube thumbnail background",
  "seed": 123456,
  "message": "AI image generated and uploaded to DB successfully"
}
```

Failure:

```json
{
  "success": false,
  "message": "Fetch from AI and upload to DB failed! Please try again"
}
```

## Subscription API

Public gateway prefix:

```text
/v1/subscription
```

Downstream prefix:

```text
/api/subscription
```

Source files:

- `client/src/services/subscription-service.js`
- `server/subscription-service/src/routes/subscription-routes.js`
- `server/subscription-service/src/controllers/subscription-controller.js`
- `server/subscription-service/src/controllers/payment-controller.js`

### Get Subscription

```http
GET /v1/subscription
```

Behavior:

- Finds a subscription record by `userId`.
- If none exists, creates an in-memory default subscription object but does not
  save it.

Response:

```json
{
  "success": true,
  "data": {
    "isPremium": false,
    "premiumSince": null
  }
}
```

### Create PayPal Order

```http
POST /v1/subscription/create-order
```

Behavior:

1. Requests a PayPal access token.
2. Creates a PayPal checkout order.
3. Returns the order ID and approval link.

Response:

```json
{
  "success": true,
  "data": {
    "orderId": "paypal-order-id",
    "approvalLink": "https://www.sandbox.paypal.com/checkoutnow?token=..."
  }
}
```

### Capture PayPal Order

```http
POST /v1/subscription/capture-order
Content-Type: application/json
```

Body:

```json
{
  "orderId": "paypal-order-id"
}
```

Behavior:

1. Requests a PayPal access token.
2. Captures the order.
3. Reads the capture ID.
4. Finds or creates a `Subscription` record.
5. Sets `isPremium`, `premiumSince`, and `paymentId`.

Response:

```json
{
  "success": true,
  "data": {
    "isPremium": true,
    "paymentId": "paypal-capture-id"
  }
}
```

## Client-Only Export APIs

Exports do not call the backend.

Source files:

- `client/src/components/editor/export/index.js`
- `client/src/services/export-service.js`

| Export | Implementation |
| --- | --- |
| JSON | `canvas.toJSON(["id", "filters"])` and `file-saver` |
| PNG | `canvas.toDataURL({ format: "png" })` and `file-saver` |
| SVG | `canvas.toSVG()` and `file-saver` |
| PDF | `canvas.toDataURL("image/png")`, `jsPDF.addImage`, `pdf.save()` |
