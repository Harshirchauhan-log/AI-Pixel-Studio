require("dotenv").config();
const express = require("express");
const proxy = require("express-http-proxy");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
const authMiddleware = require("./middleware/auth-middleware");

const app = express();
const PORT = process.env.PORT || 5000;
const PROXY_TIMEOUT_MS = Number(process.env.PROXY_TIMEOUT_MS || 30000);
const INTERNAL_SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;
const OPENAPI_PATH = path.resolve(__dirname, "../../../docs/openapi.yaml");
const openApiDocument = YAML.load(OPENAPI_PATH);
const CORS_ORIGINS = (process.env.CORS_ORIGINS || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

if (!INTERNAL_SERVICE_TOKEN) {
  throw new Error("INTERNAL_SERVICE_TOKEN is required");
}

function resolveServiceUrl(name, fallbackPort) {
  const directUrl = process.env[name];
  if (directUrl) return directUrl.replace(/\/+$/, "");

  const host = process.env[`${name}_HOST`];
  if (!host) return undefined;

  const port = process.env[`${name}_PORT`] || fallbackPort;
  const hasProtocol = /^https?:\/\//i.test(host);
  const hasPort = /:\d+$/.test(host);
  const address = hasPort ? host : `${host}:${port}`;

  return `${hasProtocol ? "" : "http://"}${address}`.replace(/\/+$/, "");
}

const UPSTREAMS = {
  DESIGN: resolveServiceUrl("DESIGN", 5001),
  UPLOAD: resolveServiceUrl("UPLOAD", 5002),
  SUBSCRIPTION: resolveServiceUrl("SUBSCRIPTION", 5003),
};

app.use(helmet());
app.use(cors({ origin: CORS_ORIGINS }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", (req, res) => {
  res.status(200).json({
    service: "api-gateway",
    status: "ready",
  });
});

app.get("/openapi.yaml", (req, res) => {
  res.type("yaml").sendFile(OPENAPI_PATH);
});

app.use(
  "/docs",
  swaggerUi.serve,
  swaggerUi.setup(openApiDocument, {
    explorer: true,
    customSiteTitle: "AI Pixel Studio API Docs",
  })
);

//proxy options
const proxyOptions = {
  timeout: PROXY_TIMEOUT_MS,
  proxyReqOptDecorator: (proxyReqOpts) => {
    proxyReqOpts.headers = {
      ...proxyReqOpts.headers,
      "x-internal-service-token": INTERNAL_SERVICE_TOKEN,
    };

    return proxyReqOpts;
  },
  proxyReqPathResolver: (req) => {
    return req.originalUrl.replace(/^\/v1/, "/api");
  },
  proxyErrorHandler: (err, res, next) => {
    res.status(500).json({
      message: "Internal server error!",
      error: err.message,
    });
  },
};

app.use(
  "/v1/designs",
  authMiddleware,
  proxy(UPSTREAMS.DESIGN, {
    ...proxyOptions,
  })
);

app.use(
  "/v1/media/upload",
  authMiddleware,
  proxy(UPSTREAMS.UPLOAD, {
    ...proxyOptions,
    parseReqBody: false,
  })
);

app.use(
  "/v1/media",
  authMiddleware,
  proxy(UPSTREAMS.UPLOAD, {
    ...proxyOptions,
    parseReqBody: true,
  })
);

app.use(
  "/v1/subscription",
  authMiddleware,
  proxy(UPSTREAMS.SUBSCRIPTION, {
    ...proxyOptions,
  })
);

app.listen(PORT, () => {
  console.log(`API Gateway is running on port ${PORT}`);
  console.log(`DESIGN Service upstream: ${UPSTREAMS.DESIGN}`);
  console.log(`UPLOAD Service upstream: ${UPSTREAMS.UPLOAD}`);
  console.log(`SUBSCRIPTION Service upstream: ${UPSTREAMS.SUBSCRIPTION}`);
});
