# Observability

The current implementation primarily uses `console.log` and `console.error`.
There are no structured logs, metrics, traces, dashboards, or health endpoints
in the repository today. This document defines a target observability standard
for operating the app.

## Current State

Current logging examples:

- MongoDB connection success/failure logs in each service `src/server.js`.
- Gateway logs startup configuration.
- AI controller logs prompt and user ID.
- Frontend logs several editor/debug values to the browser console.

Current gaps:

- No request IDs.
- No structured log format.
- No centralized log fields.
- No metrics.
- No traces.
- No health/readiness endpoints.
- No alerting definitions.

## Recommended Log Fields

Use JSON logs in backend services.

Recommended fields:

| Field | Description |
| --- | --- |
| `timestamp` | ISO timestamp |
| `level` | `debug`, `info`, `warn`, `error` |
| `service` | `api-gateway`, `design-service`, `upload-service`, `subscription-service` |
| `requestId` | Correlates gateway and downstream logs |
| `method` | HTTP method |
| `path` | Request path |
| `statusCode` | Response status |
| `durationMs` | Request latency |
| `userId` | Authenticated user ID, when available |
| `upstream` | Gateway target service |
| `errorName` | Error class/name |
| `errorMessage` | Sanitized error message |

Do not log:

- Bearer tokens,
- Google OAuth secrets,
- MongoDB URIs,
- Cloudinary secrets,
- Stability API keys,
- PayPal secrets,
- full AI prompts if prompts may contain sensitive user data.

## Request Correlation

Recommended flow:

```text
Client request
  |
  v
Gateway creates or accepts x-request-id
  |
  v
Gateway forwards x-request-id to downstream service
  |
  v
Each service includes requestId in logs
```

Suggested header:

```http
x-request-id: <uuid>
```

## Metrics

Recommended service metrics:

| Metric | Labels |
| --- | --- |
| `http_requests_total` | service, method, route, status |
| `http_request_duration_ms` | service, method, route |
| `mongodb_connection_status` | service |
| `mongodb_operation_errors_total` | service, operation |
| `gateway_proxy_errors_total` | upstream |
| `cloudinary_upload_errors_total` | reason |
| `stability_generation_errors_total` | reason |
| `paypal_order_errors_total` | operation, reason |
| `autosave_errors_total` | client route/version if client metrics are added |

## Traces

High-value traces:

- `GET /v1/designs`
- `POST /v1/designs`
- `POST /v1/media/upload`
- `POST /v1/media/ai-image-generate`
- `POST /v1/subscription/create-order`
- `POST /v1/subscription/capture-order`

Trace spans should include:

- gateway auth verification,
- gateway proxy,
- downstream controller,
- MongoDB operation,
- external API call for Cloudinary/Stability/PayPal.

## Health And Readiness

Recommended endpoints per service:

```text
GET /healthz
GET /readyz
```

Suggested semantics:

- `/healthz`: process is alive.
- `/readyz`: required dependencies are reachable and configuration is valid.

Readiness checks:

| Service | Dependencies |
| --- | --- |
| API gateway | upstream URLs configured |
| Design service | MongoDB |
| Upload service | MongoDB, Cloudinary configuration, Stability config if AI enabled |
| Subscription service | MongoDB, PayPal configuration |

## Dashboards

Minimum dashboard panels:

- request rate by service,
- error rate by route,
- p95 latency by route,
- gateway proxy failures by upstream,
- MongoDB connection status,
- upload failures,
- AI generation failures and latency,
- PayPal create/capture failures,
- Node process memory and CPU.

## Alerts

Recommended alerts:

- API gateway 5xx rate above threshold.
- Any service readiness failing for more than two minutes.
- MongoDB connection failures.
- Cloudinary upload failure spike.
- Stability AI failure spike.
- PayPal capture failure spike.
- Unusual 401 spike at gateway.
- High memory usage in upload service.

## Implementation Roadmap

1. Add request ID middleware to gateway and all services.
2. Replace ad hoc console logs with structured logger.
3. Add `/healthz` and `/readyz`.
4. Add request timing middleware.
5. Add external dependency timing/error logs.
6. Add metrics exporter or platform-native metrics.
7. Add dashboards and alerts.

