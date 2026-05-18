# AI Pixel Studio Documentation

This directory is the project documentation hub for the AI Pixel Studio codebase.
It documents the current implementation, not an intended future design.

## Documentation Map

- [Project README](../README.md): project overview, feature summary, test commands, and Swagger usage.
- [Architecture](./ARCHITECTURE.md): system topology, service boundaries, runtime dependencies, communication model, and architectural caveats.
- [Services and APIs](./SERVICES_AND_APIS.md): API gateway routing, backend endpoints, request and response shapes, MongoDB models, and environment variables.
- [API Reference](./API_REFERENCE.md): endpoint-by-endpoint public API reference with request and response examples.
- [OpenAPI Contract](./openapi.yaml): machine-readable Swagger/OpenAPI contract for the public `/v1/*` gateway API. When the API gateway is running, open `http://localhost:5000/docs` for Swagger UI or `http://localhost:5000/openapi.yaml` for the raw YAML. From `client/`, run `npm run test:api` to validate the live gateway against this contract, or `npm run test:sdet` to run API contract checks plus browser E2E coverage.
- [Data Flows](./DATA_FLOWS.md): end-to-end traces for authentication, design CRUD, autosave, media upload, AI image generation, export, and subscription payments.
- [Database Schema](./DATABASE_SCHEMA.md): service-owned MongoDB models, access patterns, suggested indexes, and schema caveats.
- [Feature Inventory](./FEATURE_INVENTORY.md): product routes, dashboard capabilities, editor tools, upload/AI/export features, and subscription UI.
- [Local Setup and Runtime](./LOCAL_SETUP.md): local development setup, required credentials, startup order, service ports, and known local run issues.
- [Deployment Guide](./DEPLOYMENT.md): deployable units, runtime config, topology, readiness expectations, and rollout notes.
- [Testing Strategy](./TESTING_STRATEGY.md): current test gaps, recommended test pyramid, manual smoke tests, and local test commands.
- [Operations and Security Notes](./OPERATIONS_AND_SECURITY.md): deployment considerations, current reliability/security gaps, data ownership, and recommended hardening work.
- [Security Threat Model](./SECURITY_THREAT_MODEL.md): trust boundaries, assets, threats, mitigations, and security readiness checklist.
- [Observability](./OBSERVABILITY.md): logging, metrics, tracing, health/readiness, dashboards, and alerting recommendations.
- [Troubleshooting Runbooks](./TROUBLESHOOTING_RUNBOOKS.md): operational runbooks for auth, gateway, MongoDB, upload, AI, export, and subscription failures.
- [Architecture Decision Records](./ADR.md): captured architectural decisions and consequences.

## Executive Summary

The application is a browser-based design editor implemented as a Next.js
frontend backed by multiple Express services. The frontend uses Google login
through NextAuth, renders and edits designs with Fabric.js, persists design
state in MongoDB through a design service, stores uploaded/generated media in
Cloudinary plus MongoDB through an upload service, and optionally manages
premium status through a subscription service that integrates with PayPal.

The service communication model is synchronous HTTP:

```text
Browser / Next.js client
        |
        | Axios with Authorization: Bearer <Google ID token>
        v
API Gateway, port 5000
        |
        | express-http-proxy, /v1 -> /api path rewrite
        v
Design service       Upload service       Subscription service
port 5001            port 5002            port 5003
        |                    |                    |
        v                    v                    v
MongoDB              MongoDB + Cloudinary  MongoDB + PayPal
                     + Stability AI
```

The project does not use Kafka or another message broker. All cross-service
traffic currently flows through HTTP request/response calls via the API gateway.

## Source Of Truth

The docs were generated from the current files in:

- `client/src`
- `server/api-gateway/src`
- `server/design-service/src`
- `server/upload-service/src`
- `server/subscription-service/src`
- package manifests and runtime configuration files

They intentionally call out implementation caveats where the code behaves
differently from a production-grade target architecture.
