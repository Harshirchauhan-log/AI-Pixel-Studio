const { OAuth2Client } = require("google-auth-library");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const tokenCache = new Map();
const TOKEN_CACHE_MAX_SIZE = 200;
const TOKEN_CACHE_EXPIRY_SKEW_MS = 60 * 1000;

function attachUserToRequest(req, payload) {
  req.user = {
    userId: payload["sub"],
    email: payload["email"],
    name: payload["name"],
  };

  req.headers["x-user-id"] = payload["sub"];
  req.headers["x-user-email"] = payload["email"];
  req.headers["x-user-name"] = payload["name"];
}

function getCachedPayload(token) {
  const entry = tokenCache.get(token);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt - TOKEN_CACHE_EXPIRY_SKEW_MS) {
    tokenCache.delete(token);
    return null;
  }

  return entry.payload;
}

function cachePayload(token, payload) {
  const expiresAt = payload.exp ? payload.exp * 1000 : Date.now();

  if (tokenCache.size >= TOKEN_CACHE_MAX_SIZE) {
    const oldestKey = tokenCache.keys().next().value;
    if (oldestKey) tokenCache.delete(oldestKey);
  }

  tokenCache.set(token, { payload, expiresAt });
}

async function authMiddleware(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      error: "Access denied! No Token provided",
    });
  }

  try {
    const cachedPayload = getCachedPayload(token);

    if (cachedPayload) {
      attachUserToRequest(req, cachedPayload);
      return next();
    }

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    cachePayload(token, payload);
    attachUserToRequest(req, payload);

    next();
  } catch (err) {
    console.error("Token verification failed", err);
    res.status(401).json({
      error: "Invalid Token!",
    });
  }
}

module.exports = authMiddleware;
