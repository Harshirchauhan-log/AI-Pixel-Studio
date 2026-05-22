# Local Setup And Runtime

## Prerequisites

- Node.js. The current local environment used Node `v26.0.0`, but the project
  dependencies are more likely to behave predictably on an active LTS release.
- npm.
- MongoDB Atlas or a local MongoDB instance.
- Google OAuth credentials for login.
- Cloudinary credentials for upload features.
- Stability AI API key for AI image generation.
- PayPal sandbox credentials for subscription checkout.

## Install Dependencies

Install dependencies in each package directory:

```bash
cd client && npm install
cd ../server/api-gateway && npm install
cd ../design-service && npm install
cd ../upload-service && npm install
cd ../subscription-service && npm install
```

## Environment Files

### Client

Primary file in this worktree: `client/.env`.

Next.js also supports an uncommitted local override file named `.env.local` in
the client directory, but that file is optional.

```env
AUTH_SECRET=<random-nextauth-secret>
AUTH_GOOGLE_ID=<google-oauth-client-id>
AUTH_GOOGLE_SECRET=<google-oauth-client-secret>
NEXT_PUBLIC_API_URL=http://localhost:5000
```

Important: the NextAuth Google provider expects the `AUTH_GOOGLE_ID` and
`AUTH_GOOGLE_SECRET` naming convention. If the file uses `GOOGLE_CLIENT_ID`
instead, bridge or rename it before starting the frontend.

The client service layer reads `NEXT_PUBLIC_API_URL`, then `API_URL`, then falls
back to `http://localhost:5000`. Prefer `NEXT_PUBLIC_API_URL` for local and
production browser builds because it is available to client-side Next.js code.

### API Gateway

File: `server/api-gateway/.env`

```env
PORT=5000
DESIGN=http://localhost:5001
UPLOAD=http://localhost:5002
SUBSCRIPTION=http://localhost:5003
GOOGLE_CLIENT_ID=<same-value-as-client-AUTH_GOOGLE_ID>
```

### Design Service

File: `server/design-service/.env`

```env
PORT=5001
MONGO_URI=mongodb+srv://USER:ENCODED_PASSWORD@CLUSTER.mongodb.net/pixel_studio_designs?retryWrites=true&w=majority
```

### Upload Service

File: `server/upload-service/.env`

```env
PORT=5002
MONGO_URI=mongodb+srv://USER:ENCODED_PASSWORD@CLUSTER.mongodb.net/pixel_studio_uploads?retryWrites=true&w=majority
cloud_name=<cloudinary-cloud-name>
api_key=<cloudinary-api-key>
api_secret=<cloudinary-api-secret>
STABILITY_API_KEY=<stability-ai-api-key>
```

### Subscription Service

File: `server/subscription-service/.env`

```env
PORT=5003
MONGO_URI=mongodb+srv://USER:ENCODED_PASSWORD@CLUSTER.mongodb.net/pixel_studio_subscriptions?retryWrites=true&w=majority
PAYPAL_CLIENT_ID=<paypal-sandbox-client-id>
PAYPAL_CLIENT_SECRET=<paypal-sandbox-client-secret>
FRONTEND_URL=http://localhost:3000
```

## MongoDB Atlas Guidance

Use one Atlas cluster with separate databases:

```text
pixel_studio_designs
pixel_studio_uploads
pixel_studio_subscriptions
```

The database name is the path after `.net/` in the connection string.

If your MongoDB username or password contains special characters, URL encode
them:

| Character | Encoded |
| --- | --- |
| `?` | `%3F` |
| `@` | `%40` |
| `#` | `%23` |
| `/` | `%2F` |
| `&` | `%26` |
| `:` | `%3A` |

## Google OAuth Setup

Create a Web application OAuth client in Google Cloud Console.

Authorized JavaScript origin:

```text
http://localhost:3000
```

Authorized redirect URI:

```text
http://localhost:3000/api/auth/callback/google
```

Use the client ID in both:

```env
client: AUTH_GOOGLE_ID
gateway: GOOGLE_CLIENT_ID
```

Use the client secret in:

```env
client: AUTH_GOOGLE_SECRET
```

## Startup Order

Start domain services first:

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

Start the gateway:

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

## Minimal Local Stack Without Subscription

If the team intentionally skips subscription during early development, run:

- `design-service`
- `upload-service`
- `api-gateway`
- `client`

However, the current frontend still calls:

- `GET /v1/subscription`
- `POST /v1/subscription/create-order`
- `POST /v1/subscription/capture-order`

For a clean no-subscription local mode, add one of these:

- a lightweight mock subscription endpoint,
- a running subscription service with dummy/sandbox credentials,
- or frontend guards that treat missing subscription as `{ isPremium: false }`.

## Local Verification

Expected listening ports:

```text
3000 client
5000 API gateway
5001 design service
5002 upload service
5003 subscription service, if enabled
```

Expected unauthenticated gateway check:

```bash
curl -i http://localhost:5000/v1/designs
```

Expected result:

```text
401 Unauthorized
```

That means the gateway is alive and enforcing auth.

## Known Local Runtime Issues

- Very new Node versions may expose transitive dependency compatibility issues.
  Prefer an active Node LTS version until the project declares an explicit
  `engines.node` policy.
- MongoDB Atlas requires outbound DNS/network access.
- MongoDB Atlas requires the client IP to be allowed in Network Access.
- Services currently log Mongo connection errors but still start listening.
- Subscription service will not start correctly unless its `MONGO_URI` begins
  with `mongodb://` or `mongodb+srv://`.
