const assert = require("node:assert/strict");
const { afterEach, describe, it } = require("node:test");

const authenticatedRequest = require("../src/middleware/auth-middleware");

const ORIGINAL_INTERNAL_SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;

function createResponse() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

function runMiddleware(headers = {}) {
  const req = { headers };
  const res = createResponse();
  let nextCalled = false;

  authenticatedRequest(req, res, () => {
    nextCalled = true;
  });

  return { req, res, nextCalled };
}

describe("subscription service auth middleware", () => {
  afterEach(() => {
    process.env.INTERNAL_SERVICE_TOKEN = ORIGINAL_INTERNAL_SERVICE_TOKEN;
  });

  it("fails closed when the internal service token is not configured", () => {
    delete process.env.INTERNAL_SERVICE_TOKEN;

    const { res, nextCalled } = runMiddleware({
      "x-internal-service-token": "any-token",
      "x-user-id": "user-123",
    });

    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 500);
    assert.deepEqual(res.body, {
      error: "Service auth is not configured",
    });
  });

  it("rejects requests without the expected internal service token", () => {
    process.env.INTERNAL_SERVICE_TOKEN = "expected-token";

    const { res, nextCalled } = runMiddleware({
      "x-internal-service-token": "wrong-token",
      "x-user-id": "user-123",
    });

    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 403);
    assert.deepEqual(res.body, {
      error: "Forbidden service boundary",
    });
  });

  it("rejects internal requests that do not include a user id", () => {
    process.env.INTERNAL_SERVICE_TOKEN = "expected-token";

    const { res, nextCalled } = runMiddleware({
      "x-internal-service-token": "expected-token",
    });

    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 401);
    assert.deepEqual(res.body, {
      error: "Access denied! Please login to continue",
    });
  });

  it("attaches the authenticated user and calls next for valid service requests", () => {
    process.env.INTERNAL_SERVICE_TOKEN = "expected-token";

    const { req, res, nextCalled } = runMiddleware({
      "x-internal-service-token": "expected-token",
      "x-user-id": "user-123",
    });

    assert.equal(nextCalled, true);
    assert.equal(res.statusCode, null);
    assert.deepEqual(req.user, { userId: "user-123" });
  });
});
