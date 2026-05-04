const crypto = require("crypto");

function tokenMatches(actualToken, expectedToken) {
  if (!actualToken || !expectedToken) return false;

  const actual = Buffer.from(String(actualToken));
  const expected = Buffer.from(String(expectedToken));

  if (actual.length !== expected.length) return false;

  return crypto.timingSafeEqual(actual, expected);
}

const authenticatedRequest = (req, res, next) => {
  const internalToken = req.headers["x-internal-service-token"];
  const userId = req.headers["x-user-id"];

  if (!process.env.INTERNAL_SERVICE_TOKEN) {
    return res.status(500).json({
      error: "Service auth is not configured",
    });
  }

  if (!tokenMatches(internalToken, process.env.INTERNAL_SERVICE_TOKEN)) {
    return res.status(403).json({
      error: "Forbidden service boundary",
    });
  }

  if (!userId) {
    return res.status(401).json({
      error: "Access denied! Please login to continue",
    });
  }

  req.user = { userId };
  next();
};

module.exports = authenticatedRequest;
