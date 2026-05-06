require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const subscriptionRoutes = require("./routes/subscription-routes");

const app = express();
const PORT = process.env.PORT || 5003;
const CORS_ORIGINS = (process.env.CORS_ORIGINS || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({ origin: CORS_ORIGINS }));
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", (req, res) => {
  const isDbReady = mongoose.connection.readyState === 1;

  res.status(isDbReady ? 200 : 503).json({
    service: "subscription-service",
    status: isDbReady ? "ready" : "not-ready",
  });
});

app.use("/api/subscription", subscriptionRoutes);

async function startServer() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log("Connected to MongoDB");

    app.listen(PORT, () =>
      console.log(`SUBSCRIPTION Service running on port ${PORT}`)
    );
  } catch (error) {
    console.error("Failed to connect to MongoDB or start server", error);
    process.exit(1);
  }
}

startServer();
