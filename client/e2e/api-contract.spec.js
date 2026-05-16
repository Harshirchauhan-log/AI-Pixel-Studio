const { expect, test } = require("@playwright/test");
const SwaggerParser = require("@apidevtools/swagger-parser");
const YAML = require("yaml");

const protectedOperations = [
  ["GET", "/v1/designs"],
  ["POST", "/v1/designs"],
  ["GET", "/v1/designs/{id}"],
  ["DELETE", "/v1/designs/{id}"],
  ["POST", "/v1/media/upload"],
  ["GET", "/v1/media/get"],
  ["POST", "/v1/media/ai-image-generate"],
  ["GET", "/v1/subscription"],
  ["POST", "/v1/subscription/create-order"],
  ["POST", "/v1/subscription/capture-order"],
];

async function loadOpenApi(request) {
  const response = await request.get("/openapi.yaml");
  expect(response.ok()).toBeTruthy();
  expect(response.headers()["content-type"]).toMatch(/ya?ml/);

  return YAML.parse(await response.text());
}

function pathForRequest(openApiPath) {
  return openApiPath.replace("{id}", "665000000000000000000001");
}

test("serves valid Swagger/OpenAPI metadata from the API gateway", async ({
  request,
}) => {
  const spec = await loadOpenApi(request);

  await SwaggerParser.validate(spec);

  expect(spec.openapi).toBe("3.0.3");
  expect(spec.info.title).toBe("AI Pixel Studio API");
  expect(spec.components.securitySchemes.GoogleIdToken).toMatchObject({
    type: "http",
    scheme: "bearer",
  });

  for (const [method, path] of protectedOperations) {
    const operation = spec.paths[path]?.[method.toLowerCase()];

    expect(operation, `${method} ${path} is documented`).toBeTruthy();
    expect(
      operation.responses["401"],
      `${method} ${path} documents missing/invalid auth`
    ).toBeTruthy();
  }
});

test("exposes Swagger UI and gateway health publicly", async ({ request }) => {
  const health = await request.get("/health");
  expect(health.status()).toBe(200);
  expect(await health.json()).toEqual({
    service: "api-gateway",
    status: "ready",
  });

  const docs = await request.get("/docs/");
  expect(docs.status()).toBe(200);
  expect(await docs.text()).toContain("AI Pixel Studio API Docs");
});

for (const [method, path] of protectedOperations) {
  test(`${method} ${path} matches the documented missing-token auth contract`, async ({
    request,
  }) => {
    const spec = await loadOpenApi(request);
    const isMultipartUpload = path === "/v1/media/upload";
    const response = await request.fetch(pathForRequest(path), {
      method,
      data:
        method === "POST" && !isMultipartUpload
          ? {
              prompt: "contract test",
              orderId: "contract-order",
              name: "Contract Design",
              width: 900,
              height: 500,
          }
          : undefined,
      multipart:
        isMultipartUpload
          ? {
              file: {
                name: "contract.png",
                mimeType: "image/png",
                buffer: Buffer.from("not-a-real-image"),
              },
            }
          : undefined,
    });

    expect(response.status()).toBe(401);

    const body = await response.json();
    const documentedMessages =
      spec.components.schemas.GatewayAuthError.properties.error.enum;

    expect(documentedMessages).toContain(body.error);
    expect(body).toEqual({ error: "Access denied! No Token provided" });
  });
}
