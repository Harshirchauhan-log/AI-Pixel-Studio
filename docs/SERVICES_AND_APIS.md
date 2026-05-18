# Services And APIs

## API Gateway

Path: `server/api-gateway`

### Environment Variables

```env
PORT=5000
DESIGN=http://localhost:5001
UPLOAD=http://localhost:5002
SUBSCRIPTION=http://localhost:5003
GOOGLE_CLIENT_ID=<google-oauth-client-id>
INTERNAL_SERVICE_TOKEN=<shared-service-boundary-token>
CORS_ORIGINS=http://localhost:3000
PROXY_TIMEOUT_MS=30000
```

`AUTH_GOOGLE_SECRET` may exist in the file, but the gateway code does not read
it. Token verification uses `GOOGLE_CLIENT_ID`.

`INTERNAL_SERVICE_TOKEN` is required at gateway startup. The gateway forwards it
as `x-internal-service-token` to downstream services.

### Swagger Documentation

The gateway serves the checked-in OpenAPI contract through Swagger UI:

```text
http://localhost:5000/docs
```

The raw YAML contract is also exposed from the running gateway:

```text
http://localhost:5000/openapi.yaml
```

Source file:

```text
docs/openapi.yaml
```

### Authentication

Every proxied route is protected by `authMiddleware`.

Expected request header:

```http
Authorization: Bearer <Google ID token>
```

Gateway behavior:

1. Reads the Bearer token.
2. Verifies it with `OAuth2Client.verifyIdToken`.
3. Requires audience to match `GOOGLE_CLIENT_ID`.
4. Adds identity headers for downstream services.
5. Proxies the request.

Failure responses:

```json
{ "error": "Access denied! No Token provided" }
```

```json
{ "error": "Invalid Token!" }
```

### Proxy Rules

The gateway rewrites only the prefix:

```js
req.originalUrl.replace(/^\/v1/, "/api")
```

| Public Route | Upstream Service | Downstream Route |
| --- | --- | --- |
| `/v1/designs` | `DESIGN` | `/api/designs` |
| `/v1/designs/:id` | `DESIGN` | `/api/designs/:id` |
| `/v1/media/upload` | `UPLOAD` | `/api/media/upload` |
| `/v1/media/get` | `UPLOAD` | `/api/media/get` |
| `/v1/media/ai-image-generate` | `UPLOAD` | `/api/media/ai-image-generate` |
| `/v1/subscription` | `SUBSCRIPTION` | `/api/subscription` |
| `/v1/subscription/create-order` | `SUBSCRIPTION` | `/api/subscription/create-order` |
| `/v1/subscription/capture-order` | `SUBSCRIPTION` | `/api/subscription/capture-order` |

Multipart upload uses `parseReqBody: false` on the gateway route so the upload
service can parse the stream.

## Design Service

Path: `server/design-service`

### Environment Variables

```env
PORT=5001
MONGO_URI=mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/pixel_studio_designs?retryWrites=true&w=majority
SUBSCRIPTION=http://localhost:5003
INTERNAL_SERVICE_TOKEN=<shared-service-boundary-token>
FREE_DESIGN_LIMIT=5
CORS_ORIGINS=http://localhost:3000
```

`SUBSCRIPTION` and `INTERNAL_SERVICE_TOKEN` are required when creating designs,
because the service checks whether the user is premium before enforcing
`FREE_DESIGN_LIMIT`.

### Model

`Design` fields:

| Field | Type | Purpose |
| --- | --- | --- |
| `userId` | String | Google subject forwarded by the gateway |
| `name` | String | Design title |
| `canvasData` | String | Serialized Fabric canvas JSON |
| `width` | Number | Canvas width |
| `height` | Number | Canvas height |
| `category` | String | Optional design type/category |
| `createdAt` | Date | Creation time |
| `updatedAt` | Date | Last update time |

### Endpoints

#### `GET /api/designs`

Lists current user's designs sorted by newest update first.

Response:

```json
{
  "success": true,
  "data": []
}
```

#### `GET /api/designs/:id`

Fetches one design by Mongo `_id`, scoped to the current user.

Success response:

```json
{
  "success": true,
  "data": {
    "_id": "design-id",
    "userId": "google-sub",
    "name": "Untitled Design",
    "canvasData": "{}",
    "width": 900,
    "height": 500
  }
}
```

Not found response:

```json
{
  "success": false,
  "message": "Design not found! or you don't have permission to view it."
}
```

#### `POST /api/designs`

Creates or updates a design.

Create body:

```json
{
  "name": "YouTube Thumbnail",
  "canvasData": "{\"objects\":[]}",
  "width": 900,
  "height": 500,
  "category": "YouTube Thumbnail",
  "designId": null
}
```

Update body:

```json
{
  "designId": "design-id",
  "name": "Updated title",
  "canvasData": "{\"objects\":[]}",
  "width": 900,
  "height": 500
}
```

Success response:

```json
{
  "success": true,
  "data": {
    "_id": "design-id",
    "userId": "google-sub",
    "name": "Updated title",
    "canvasData": "{\"objects\":[]}",
    "width": 900,
    "height": 500,
    "category": "YouTube Thumbnail",
    "createdAt": "2026-06-15T00:00:00.000Z",
    "updatedAt": "2026-06-15T00:01:00.000Z"
  }
}
```

Current update caveat: update logic applies only truthy values. Empty strings,
`null` canvas data, and numeric `0` dimensions are not effective update values
until the controller is changed.

#### `DELETE /api/designs/:id`

Deletes a design after checking ownership.

Response:

```json
{
  "success": true,
  "message": "Design deleted successfully"
}
```

## Upload Service

Path: `server/upload-service`

### Environment Variables

```env
PORT=5002
MONGO_URI=mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/pixel_studio_uploads?retryWrites=true&w=majority
INTERNAL_SERVICE_TOKEN=<shared-service-boundary-token>
CORS_ORIGINS=http://localhost:3000
cloud_name=<cloudinary-cloud-name>
api_key=<cloudinary-api-key>
api_secret=<cloudinary-api-secret>
STABILITY_API_KEY=<stability-ai-api-key>
STABILITY_TIMEOUT_MS=45000
AI_PROMPT_MAX_LENGTH=1000
AI_DAILY_LIMIT=10
AI_MIN_INTERVAL_MS=30000
AI_MAX_RESPONSE_BYTES=8388608
```

### Model

`Media` fields:

| Field | Type | Purpose |
| --- | --- | --- |
| `userId` | String | Owner user ID |
| `name` | String | Original upload name or AI-generated name |
| `cloudinaryId` | String | Cloudinary public ID |
| `url` | String | Cloudinary secure URL |
| `mimeType` | String | Media MIME type |
| `size` | Number | Byte size |
| `width` | Number | Image width; currently populated for AI-generated media, not normal uploads |
| `height` | Number | Image height; currently populated for AI-generated media, not normal uploads |
| `createdAt` | Date | Creation time |

### Endpoints

#### `POST /api/media/upload`

Accepts multipart upload with a single `file` field.

Client form field:

```text
file=<image-file>
```

Behavior:

1. Multer reads the file into memory.
2. Controller uploads the buffer to Cloudinary.
3. Controller creates a `Media` document.
4. Response returns the persisted media record.

Current implementation note: normal uploads destructure `width` and `height`
from `req.file`, but Multer does not provide image dimensions by default and
the controller does not copy dimensions from the Cloudinary response. Normal
upload dimensions may therefore be undefined. AI-generated media explicitly
stores `1024x1024`.

Response:

```json
{
  "success": true,
  "data": {
    "_id": "media-id",
    "name": "image.png",
    "url": "https://res.cloudinary.com/...",
    "mimeType": "image/png"
  }
}
```

#### `GET /api/media/get`

Lists current user's media sorted by newest first.

Response:

```json
{
  "success": true,
  "data": []
}
```

#### `POST /api/media/ai-image-generate`

Generates an image from a text prompt.

Body:

```json
{
  "prompt": "A clean social media background"
}
```

Behavior:

1. Sends the prompt to Stability AI's stable-image generation API.
2. Receives the generated PNG image bytes from Stability.
3. Uploads the generated image to Cloudinary.
4. Saves a `Media` document with a Cloudinary URL.
5. Returns the media record plus prompt metadata.

Response:

```json
{
  "success": true,
  "data": {
    "_id": "media-id",
    "url": "https://res.cloudinary.com/..."
  },
  "prompt": "A clean social media background",
  "seed": 123,
  "message": "AI image generated and uploaded to DB successfully"
}
```

## Subscription Service

Path: `server/subscription-service`

### Environment Variables

```env
PORT=5003
MONGO_URI=mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/pixel_studio_subscriptions?retryWrites=true&w=majority
INTERNAL_SERVICE_TOKEN=<shared-service-boundary-token>
CORS_ORIGINS=http://localhost:3000
PAYPAL_CLIENT_ID=<paypal-client-id>
PAYPAL_CLIENT_SECRET=<paypal-client-secret>
FRONTEND_URL=http://localhost:3000
PAYPAL_TIMEOUT_MS=30000
PREMIUM_PRICE=500
PREMIUM_CURRENCY=USD
```

`FRONTEND_URL` defaults to `http://localhost:3000` if omitted.

### Model

`Subscription` fields:

| Field | Type | Purpose |
| --- | --- | --- |
| `userId` | String | Owner user ID |
| `isPremium` | Boolean | Premium entitlement flag |
| `paymentId` | String | PayPal capture ID |
| `premiumSince` | Date | Premium activation time |
| `updatedAt` | Date | Last update time |

### Endpoints

#### `GET /api/subscription`

Returns the current user's premium state. If no record exists, the service
creates an unsaved in-memory `Subscription` instance and returns default values.

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

#### `POST /api/subscription/create-order`

Creates a PayPal order.

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

#### `POST /api/subscription/capture-order`

Captures a PayPal order and marks the user premium.

Body:

```json
{
  "orderId": "paypal-order-id"
}
```

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
