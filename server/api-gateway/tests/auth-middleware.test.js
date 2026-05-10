const assert = require("node:assert/strict");
const { describe, it } = require("node:test");

process.env.GOOGLE_CLIENT_ID = "test-google-client-id";

const authMiddleware = require("../src/middleware/auth-middleware");

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

async function runMiddleware(headers = {}) {
  const req = { headers };
  const res = createResponse();
  let nextCalled = false;

  await authMiddleware(req, res, () => {
    nextCalled = true;
  });

  return { req, res, nextCalled };
}

describe("API gateway auth middleware", () => {
  it("rejects requests without an Authorization bearer token", async () => {
    const { res, nextCalled } = await runMiddleware();

    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 401);
    assert.deepEqual(res.body, {
      error: "Access denied! No Token provided",
    });
  });

  it("rejects invalid Google ID tokens", async () => {
    const originalConsoleError = console.error;
    let result;

    try {
      console.error = () => {};
      result = await runMiddleware({
        authorization: "Bearer invalid-token",
      });
    } finally {
      console.error = originalConsoleError;
    }

    const { res, nextCalled } = result;

    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 401);
    assert.deepEqual(res.body, {
      error: "Invalid Token!",
    });
  });
});
