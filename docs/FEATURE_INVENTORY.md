# Feature Inventory

This document lists the product and technical features currently implemented in
the codebase.

## Application Routes

| Route | Purpose | Notes |
| --- | --- | --- |
| `/login` | Google sign-in screen | Calls `signIn("google", { callbackUrl: "/" })` |
| `/` | Authenticated dashboard | Fetches designs and subscription state |
| `/editor/[slug]` | Design editor | Loads a design by Mongo `_id` |
| `/subscription/success` | PayPal return page | Captures PayPal order from `token` query param |
| `/subscription/cancel` | PayPal cancel page | Static failure/cancel experience |
| `/api/auth/[...nextauth]` | NextAuth API route | Handles Google OAuth callback/session |

Middleware guards `/` and `/editor/:path*`. It also matches `/login`, but
unauthenticated users are allowed to see the login page while authenticated
users are redirected from `/login` to `/`.

## Authentication Features

- Google login through NextAuth.
- Session provider wraps the app layout.
- Google ID token is copied into `session.idToken`.
- API calls attach the ID token as a Bearer token.
- API gateway validates the token before proxying.
- Header/avatar components use the NextAuth session.
- Logout is available through `signOut()`.

## Dashboard Features

### Home Header

- Product name.
- Project count status chip.
- Current plan status chip.
- User avatar and display name.
- Logout action.

### Left Sidebar

- Create an 825x465 default thumbnail design.
- Open the Projects/designs modal.
- Open the Billing/premium modal.

The sidebar Create action currently does not apply the premium design-count
gate.

### Banner

- Prominent design creation action.
- Creates an 825x465 default thumbnail design.
- Applies free plan gating when the user has at least five designs and is not
  premium.

### AI Draft Section

- Dashboard includes a `Start with a draft` AI section.
- The hero includes an `AI Draft` button that scrolls to this section.
- Users can generate from a video title or a custom prompt.
- Generation creates an 825x465 design, persists the generated image as Fabric
  canvas data, and opens the new design in the editor.
- The generated image is editable after the editor loads.

### Design Type Grid

Design types are defined in `client/src/config/index.js`.

| Type | Width | Height |
| --- | ---: | ---: |
| YouTube Thumbnail | 900 | 500 |
| Logo Design | 400 | 465 |
| Color Palette | 500 | 500 |
| Typography | 200 | 200 |
| Social Media | 825 | 465 |
| Stickers | 250 | 250 |
| Printables | 600 | 600 |
| AI Background | 825 | 465 |
| AI Image Gen | 825 | 465 |
| Upload | 825 | 465 |

Each type tile creates a design and navigates to the editor in one step. Tiles
with a configured `panel` query open the matching editor panel immediately. For
example, `Upload` opens the Uploads panel and `Typography` opens the Text panel.

### Recent Designs And Projects

- Recent designs shows a subset of user designs.
- Projects modal shows the full design list.
- Design previews render Fabric JSON into static preview canvases.
- Design list supports opening and deleting designs.

## Editor Features

### Editor Shell

- Loads the design from `/editor/[slug]`.
- Resets editor store on mount/unmount.
- Fetches design data by ID.
- Restores name, dimensions, background, and Fabric objects.
- Shows a properties panel when an object is selected.
- Redirects to `/` if no design ID exists.

### Canvas

- Dynamically imports Fabric.js to avoid server-side rendering issues.
- Creates a Fabric `Canvas`.
- Enables object stacking preservation.
- Configures a pencil brush.
- Applies custom bounding box styling.
- Emits autosave triggers on:
  - `object:added`
  - `object:modified`
  - `object:removed`
  - `path:created`

### Editor Header

- Link back to dashboard.
- Edit/view mode toggle.
- Save status indicator.
- Export modal trigger.
- Editable design title.
- Premium modal trigger.
- User avatar and logout.

Edit/view mode changes Fabric object `selectable` and `evented` flags.

### Sidebar Tools

The editor sidebar includes:

- Elements
- Text
- Uploads
- Draw
- AI
- Settings

### Elements Tool

- Renders miniature Fabric previews for shape thumbnails.
- Adds selected shapes to the current canvas.
- Shape catalog includes rectangle, square, circle, triangle, ellipse, line,
  star, arrow, pentagon, hexagon, octagon, double arrow, elbow connector,
  heart, and cross.

### Text Tool

- Adds custom editable text.
- Adds preset text styles:
  - Heading
  - Subheading
  - Body Text
  - Caption
- Uses Fabric `IText`.

### Upload Tool

- Uploads image files to the upload service.
- Lists prior uploaded media.
- Renders media thumbnails.
- Adds selected media images to the canvas.

### Draw Tool

- Enables/disables drawing mode.
- Supports color presets.
- Supports custom color input.
- Supports brush size through preset buttons. The brush-size slider currently
  updates React state only and does not live-update the Fabric brush until a
  preset or other brush update path is used.
- Supports opacity.
- Supports eraser mode by drawing with white.

### AI Tool

- Accepts a text prompt.
- Calls the upload service AI generation endpoint.
- Shows a loading state.
- Previews the generated image.
- Adds the generated image to the canvas.

### Settings Tool

- Allows background color selection.
- Includes configured color presets.
- Applies background changes to the Fabric canvas.
- Marks the design as modified after applying.

### Properties Panel

The properties panel adapts to the selected Fabric object.

Common controls:

- Opacity
- Duplicate
- Delete
- Bring to front
- Send to back
- Flip horizontal
- Flip vertical

Text controls:

- Text content
- Font size
- Font family
- Bold
- Italic
- Underline
- Text color
- Text background color
- Letter spacing

Shape/path controls:

- Fill color
- Border color
- Border width
- Border style: solid, dashed, dotted

Image controls:

- Border controls
- Filters such as grayscale, sepia, invert, and blur

## Persistence Features

### Design Autosave

The Zustand store tracks:

- `canvas`
- `designId`
- `name`
- `saveStatus`
- `isModified`
- `lastModified`

When the canvas changes, the store debounces save by 500 ms, serializes the
canvas as Fabric JSON, and calls the design service.

### Design Serialization

Saved design payload:

```json
{
  "name": "Untitled Design",
  "canvasData": "{\"objects\":[]}",
  "width": 900,
  "height": 500,
  "designId": "design-id"
}
```

`canvasData` includes custom `id` and `filters` properties.

## Export Features

Supported export formats:

- PNG
- SVG
- PDF
- JSON

Exports run entirely in the browser. No backend API or database write occurs.

## Subscription Features

- Fetches current premium state.
- Attempts to block banner creation, design-type-grid creation, and export when
  user has at least five designs and is not premium.
- Current caveat: those checks dereference `userSubscription.isPremium`
  directly, so they can throw if subscription state is still `null` or the
  subscription API fails.
- Sidebar Create currently bypasses the premium gate.
- Shows premium/non-premium modal states.
- Creates PayPal checkout orders.
- Redirects to PayPal approval link.
- Captures successful PayPal return and marks user premium when an active
  NextAuth session is still available.
- Current caveat: `/subscription/success` is not middleware-protected and does
  not visibly render capture errors.

Current project note: subscription can be operationally skipped during local
development only if the frontend calls are mocked, disabled, or allowed to fail
gracefully. The current frontend code still calls subscription APIs.
