const axios = require("axios");
const { uploadMediaToCloudinary } = require("../utils/cloudinary");
const Media = require("../models/media");

const STABILITY_API_KEY = process.env.STABILITY_API_KEY;
const STABILITY_API_HOST = "https://api.stability.ai";
const STABILITY_GENERATE_URL = `${STABILITY_API_HOST}/v2beta/stable-image/generate/core`;
const STABILITY_TIMEOUT_MS = Number(process.env.STABILITY_TIMEOUT_MS || 45000);
const AI_PROMPT_MAX_LENGTH = Number(process.env.AI_PROMPT_MAX_LENGTH || 1000);
const AI_DAILY_LIMIT = Number(process.env.AI_DAILY_LIMIT || 10);
const AI_MIN_INTERVAL_MS = Number(process.env.AI_MIN_INTERVAL_MS || 30000);
const AI_MAX_RESPONSE_BYTES = Number(process.env.AI_MAX_RESPONSE_BYTES || 8 * 1024 * 1024);
const aiUsageByUser = new Map();
const aiInFlightUsers = new Set();
const SUPPORTED_ASPECT_RATIOS = new Set([
  "1:1",
  "16:9",
  "21:9",
  "2:3",
  "3:2",
  "4:5",
  "5:4",
  "9:16",
  "9:21",
]);

function getUsageWindow() {
  return new Date().toISOString().slice(0, 10);
}

function assertAiQuota(userId) {
  const now = Date.now();
  const window = getUsageWindow();
  const usage = aiUsageByUser.get(userId);

  if (!usage || usage.window !== window) {
    aiUsageByUser.set(userId, {
      window,
      count: 1,
      lastRequestAt: now,
    });
    return;
  }

  if (now - usage.lastRequestAt < AI_MIN_INTERVAL_MS) {
    const error = new Error("AI generation is rate limited");
    error.statusCode = 429;
    throw error;
  }

  if (usage.count >= AI_DAILY_LIMIT) {
    const error = new Error("Daily AI generation limit reached");
    error.statusCode = 429;
    throw error;
  }

  usage.count += 1;
  usage.lastRequestAt = now;
}

const generateImageFromAIAndUploadToDB = async (req, res) => {
  const prompt = typeof req.body.prompt === "string" ? req.body.prompt.trim() : req.body.prompt;
  const requestedAspectRatio = req.body.aspectRatio;
  const aspectRatio = SUPPORTED_ASPECT_RATIOS.has(requestedAspectRatio)
    ? requestedAspectRatio
    : "1:1";
  const userId = req.user.userId;

  try {
    if (!STABILITY_API_KEY) {
      return res.status(500).json({
        success: false,
        message: "STABILITY_API_KEY is not configured",
      });
    }

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({
        success: false,
        message: "Prompt is required",
      });
    }

    if (prompt.length > AI_PROMPT_MAX_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Prompt must be ${AI_PROMPT_MAX_LENGTH} characters or fewer`,
      });
    }

    if (aiInFlightUsers.has(userId)) {
      return res.status(429).json({
        success: false,
        message: "An AI generation is already running for this user",
      });
    }

    assertAiQuota(userId);

    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);

    const aiMediaCount = await Media.countDocuments({
      userId,
      source: "ai",
      createdAt: { $gte: dayStart },
    });

    if (aiMediaCount >= AI_DAILY_LIMIT) {
      return res.status(429).json({
        success: false,
        message: "Daily AI generation limit reached",
      });
    }

    aiInFlightUsers.add(userId);

    console.log("Generating AI image", { userId, promptLength: prompt.length });

    const response = await axios.postForm(
      STABILITY_GENERATE_URL,
      {
        prompt,
        output_format: "png",
        aspect_ratio: aspectRatio,
      },
      {
        timeout: STABILITY_TIMEOUT_MS,
        maxBodyLength: 1024 * 1024,
        maxContentLength: AI_MAX_RESPONSE_BYTES,
        maxRedirects: 0,
        responseType: "arraybuffer",
        headers: {
          Accept: "image/*",
          Authorization: `Bearer ${STABILITY_API_KEY}`,
        },
      }
    );

    if (!response.data || !response.data.byteLength) {
      throw new Error("No image generated from Stability AI");
    }

    const imageBuffer = Buffer.from(response.data);

    const file = {
      buffer: imageBuffer,
      originalname: `ai-generated-${Date.now()}.png`,
      mimetype: "image/png",
      size: imageBuffer.length,
      width: 1024,
      height: 1024,
    };

    const cloudinaryResult = await uploadMediaToCloudinary(file);

    const newlyCreatedMedia = new Media({
      userId,
      name: `AI Generated ${prompt.substring(0, 50)}${
        prompt.length > 50 ? "..." : ""
      }}`,
      cloudinaryId: cloudinaryResult.public_id,
      url: cloudinaryResult.secure_url,
      mimeType: "image/png",
      source: "ai",
      size: imageBuffer.length,
      width: 1024,
      height: 1024,
    });

    await newlyCreatedMedia.save();

    return res.status(201).json({
      success: true,
      data: newlyCreatedMedia,
      prompt,
      aspectRatio,
      message: "AI image generated and uploaded to DB successfully",
    });
  } catch (e) {
    const status = e.response?.status;
    const stabilityError = e.response?.data
      ? Buffer.from(e.response.data).toString("utf8")
      : e.message;

    console.log("AI image generation failed", {
      status,
      message: stabilityError,
    });

    res.status(e.statusCode || 500).json({
      success: false,
      message:
        e.statusCode === 429
          ? e.message
          : "Fetch from AI and upload to DB failed! Please try again",
    });
  } finally {
    aiInFlightUsers.delete(userId);
  }
};

module.exports = { generateImageFromAIAndUploadToDB };
