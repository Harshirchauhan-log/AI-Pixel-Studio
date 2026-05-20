# Data Flows

This document traces how data moves through the current implementation.

## 1. Login And Auth Token Flow

```text
User
  |
  | clicks Continue with Google
  v
NextAuth Google provider
  |
  | account.id_token
  v
NextAuth jwt callback
  |
  | token.idToken
  v
NextAuth session callback
  |
  | session.idToken
  v
Client API services
  |
  | Authorization: Bearer <session.idToken>
  v
API Gateway
  |
  | verifyIdToken(audience = GOOGLE_CLIENT_ID)
  v
Downstream service headers:
  x-user-id, x-user-email, x-user-name
```

Source files:

- `client/src/components/login/login-card.js`
- `client/src/auth.js`
- `client/src/middleware.js`
- `client/src/services/base-service.js`
- `server/api-gateway/src/middleware/auth-middleware.js`

Persisted data: none. The app does not create a local user table. User identity
is derived from the Google token payload.

## 2. Home Dashboard Load

```text
Home page mounts
  |
  | getUserSubscription()
  | getUserDesigns()
  v
API Gateway
  |
  | /v1/subscription -> subscription service
  | /v1/designs      -> design service
  v
Zustand store:
  userSubscription, userDesigns, userDesignsLoading
```

Source files:

- `client/src/app/page.js`
- `client/src/services/design-service.js`
- `client/src/services/subscription-service.js`
- `client/src/store/index.js`

Operational note: the frontend currently calls the subscription service on home
load. If the subscription service is intentionally disabled, home page behavior
should be adjusted or a mock/default subscription endpoint should be provided.

## 3. Create Design Flow

```text
Dashboard create action
  |
  | saveDesign({ name, width, height, category, canvasData })
  v
POST /v1/designs
  |
  v
API Gateway -> POST /api/designs
  |
  v
Design controller
  |
  | new Design({ userId, name, width, height, canvasData, category })
  v
MongoDB pixel_studio_designs
  |
  v
Frontend router navigates to /editor/<new-design-id>
```

Frontend entry points:

- `client/src/components/home/banner.js`
- `client/src/components/home/design-types.js`
- `client/src/components/home/sidebar.js`

Backend files:

- `server/design-service/src/routes/design-routes.js`
- `server/design-service/src/controllers/design-controller.js`
- `server/design-service/src/models/design.js`

Response shape:

```json
{
  "success": true,
  "data": {
    "_id": "design-id",
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

## 4. Open Existing Design Flow

```text
User opens design
  |
  v
/editor/[slug]
  |
  | getUserDesignByID(slug)
  v
GET /v1/designs/:id
  |
  v
Design service finds { _id, userId }
  |
  v
Editor parses design.canvasData
  |
  v
Fabric canvas loads JSON, dimensions, background, objects
```

Source files:

- `client/src/app/editor/[slug]/page.js`
- `client/src/components/editor/index.js`
- `client/src/services/design-service.js`
- `server/design-service/src/controllers/design-controller.js`

The editor accepts `canvasData` as a string, parses it to inspect background and
object presence, then passes the original stored `design.canvasData` value to
Fabric's `loadFromJSON`.

## 5. Autosave Flow

```text
Fabric object added/modified/removed/path created
  |
  v
markAsModified()
  |
  | debounce 500 ms
  v
saveToServer()
  |
  | canvas.toJSON(["id", "filters"])
  v
POST /v1/designs { designId, name, canvasData, width, height }
  |
  v
Design service updates existing document
```

Source files:

- `client/src/components/editor/canvas/index.js`
- `client/src/store/index.js`
- `client/src/services/design-service.js`

Persisted data:

- `canvasData`: JSON string
- `name`
- `width`
- `height`
- `updatedAt`

The autosave flow requires an existing `designId`. If no design ID exists,
`markAsModified()` logs an error and does not persist.

## 6. Delete Design Flow

```text
User deletes design in project/design list
  |
  v
DELETE /v1/designs/:id
  |
  v
Design service checks { _id, userId }
  |
  v
deleteOne({ _id })
  |
  v
Frontend refetches user designs
```

Source files:

- `client/src/components/home/design-list.js`
- `client/src/services/design-service.js`
- `server/design-service/src/controllers/design-controller.js`

Response:

```json
{
  "success": true,
  "message": "Design deleted successfully"
}
```

## 7. Upload Media Flow

```text
User selects image file in Upload panel
  |
  v
FormData(file)
  |
  v
POST /v1/media/upload
  |
  | gateway parseReqBody: false
  v
Upload service Multer memory storage
  |
  v
Cloudinary upload_stream
  |
  v
Media document in MongoDB
  |
  v
Frontend prepends returned media to upload grid
```

Source files:

- `client/src/components/editor/sidebar/panels/upload.js`
- `client/src/services/upload-service.js`
- `server/api-gateway/src/server.js`
- `server/upload-service/src/routes/upload-routes.js`
- `server/upload-service/src/controllers/upload-controller.js`
- `server/upload-service/src/utils/cloudinary.js`
- `server/upload-service/src/models/media.js`

Returned media can be added to the canvas through `addImageToCanvas(imageUrl)`.

## 8. List Media Flow

```text
Upload panel mounts with authenticated session
  |
  v
GET /v1/media/get
  |
  v
Upload service queries Media by userId
  |
  v
Frontend renders thumbnails
```

Source files:

- `client/src/components/editor/sidebar/panels/upload.js`
- `server/upload-service/src/controllers/upload-controller.js`

Response:

```json
{
  "success": true,
  "data": [
    {
      "_id": "media-id",
      "url": "https://res.cloudinary.com/...",
      "name": "image.png"
    }
  ]
}
```

## 9. AI Draft Creation Flow

```text
User clicks AI Draft on the dashboard
  |
  v
Dashboard scrolls to Start with a draft
  |
  | Generate from title OR Custom prompt
  v
POST /v1/media/ai-image-generate { prompt, aspectRatio: "16:9" }
  |
  v
Upload service stores generated image in Cloudinary and MongoDB
  |
  v
Frontend builds Fabric canvas JSON with the generated image
  |
  v
POST /v1/designs { name, width: 825, height: 465, category, canvasData }
  |
  v
Frontend opens /editor/[newDesignId]
```

Source files:

- `client/src/components/home/banner.js`
- `client/src/components/home/ai-features.js`
- `client/src/services/upload-service.js`
- `client/src/services/design-service.js`
- `server/upload-service/src/controllers/ai-image-controller.js`
- `server/design-service/src/controllers/design-controller.js`

## 10. Editor AI Image Generation Flow

```text
User submits prompt
  |
  v
POST /v1/media/ai-image-generate { prompt }
  |
  v
Upload service
  |
  | Stability AI text-to-image
  v
Base64 generated image
  |
  | Buffer.from(base64)
  v
Cloudinary upload_stream
  |
  v
Media document in MongoDB
  |
  v
Frontend previews response.data.url
  |
  v
Optional Add To Canvas
```

Source files:

- `client/src/components/editor/sidebar/panels/ai.js`
- `client/src/services/upload-service.js`
- `server/upload-service/src/controllers/ai-image-controller.js`
- `server/upload-service/src/utils/cloudinary.js`

External request:

```text
POST https://api.stability.ai/v2beta/stable-image/generate/core
```

Persisted fields include:

- `name`: `AI Generated <prompt preview>`
- `mimeType`: `image/png`
- `width`: `1024`
- `height`: `1024`
- `url`: Cloudinary URL

## 11. Export Flow

```text
User opens Export modal
  |
  | chooses png, svg, pdf, or json
  v
Browser serializes current Fabric canvas
  |
  v
Browser downloads file
```

No backend service is involved.

Source files:

- `client/src/components/editor/header/index.js`
- `client/src/components/editor/export/index.js`
- `client/src/services/export-service.js`

Export formats:

| Format | Implementation |
| --- | --- |
| JSON | `canvas.toJSON(["id", "filters"])`, `file-saver` |
| PNG | `canvas.toDataURL({ format: "png" })`, `file-saver` |
| SVG | `canvas.toSVG()`, `file-saver` |
| PDF | `canvas.toDataURL("image/png")`, `jsPDF.addImage`, `pdf.save()` |

## 11. Subscription Payment Flow

```text
User opens premium modal
  |
  v
POST /v1/subscription/create-order
  |
  v
Subscription service requests PayPal OAuth token
  |
  v
Subscription service creates PayPal order
  |
  v
Frontend redirects to approvalLink
  |
  v
PayPal returns to /subscription/success?token=<orderId>
  |
  v
POST /v1/subscription/capture-order { orderId }
  |
  v
Subscription service captures PayPal order
  |
  v
Subscription document isPremium=true
```

Source files:

- `client/src/components/subscription/premium-modal.js`
- `client/src/app/subscription/success/page.js`
- `client/src/app/subscription/cancel/page.js`
- `server/subscription-service/src/controllers/payment-controller.js`
- `server/subscription-service/src/models/subscription.js`

Current frontend caveat: `/subscription/success` is not protected by the
Next.js middleware matcher. The capture call still requires an active NextAuth
session because it uses `fetchWithAuth`; without a session, capture fails and
the current page sets an error state that is not visibly rendered.

Current implementation notes:

- Payment verification relies on the capture API response.
- There is no PayPal webhook implementation.
- There is no idempotency handling.
- The order amount is configured as `USD 500` in code.
