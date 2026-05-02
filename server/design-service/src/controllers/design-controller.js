const mongoose = require("mongoose");
const axios = require("axios");
const Design = require("../models/design");

const FREE_DESIGN_LIMIT = Number(process.env.FREE_DESIGN_LIMIT || 5);

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

const SUBSCRIPTION_SERVICE_URL = resolveServiceUrl("SUBSCRIPTION", 5003);

async function getUserSubscription(userId) {
  if (!SUBSCRIPTION_SERVICE_URL || !process.env.INTERNAL_SERVICE_TOKEN) {
    throw new Error("Subscription lookup is not configured");
  }

  const response = await axios.get(`${SUBSCRIPTION_SERVICE_URL}/api/subscription`, {
    timeout: 5000,
    headers: {
      "x-user-id": userId,
      "x-internal-service-token": process.env.INTERNAL_SERVICE_TOKEN,
    },
  });

  return response.data?.data;
}

async function assertDesignQuota(userId) {
  const subscription = await getUserSubscription(userId);

  if (subscription?.isPremium) return;

  const designCount = await Design.countDocuments({ userId });

  if (designCount >= FREE_DESIGN_LIMIT) {
    const error = new Error("Free design limit reached");
    error.statusCode = 403;
    throw error;
  }
}

exports.getUserDesigns = async (req, res) => {
  try {
    const userId = req.user.userId;

    const designs = await Design.find({ userId }).sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      data: designs,
    });
  } catch (e) {
    console.error("Error fetching designs", e);
    res.status(500).json({
      success: false,
      message: "Failed to fetch designs",
    });
  }
};

exports.getUserDesignsByID = async (req, res) => {
  try {
    const userId = req.user.userId;
    const designId = req.params.id;

    const design = await Design.findOne({ _id: designId, userId });

    if (!design) {
      return res.status(404).json({
        success: false,
        message: "Design not found! or you don't have permission to view it.",
      });
    }

    res.status(200).json({
      success: true,
      data: design,
    });
  } catch (e) {
    console.error("Error fetching design by ID", e);
    res.status(500).json({
      success: false,
      message: "Failed to fetch design by ID",
    });
  }
};

exports.saveDesign = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { designId, name, canvasData, width, height, category } = req.body;
    if (designId) {
      const design = await Design.findOne({ _id: designId, userId });
      if (!design) {
        return res.status(404).json({
          success: false,
          message: "Design not found! or you don't have permission to view it.",
        });
      }

      if (name) design.name = name;
      if (canvasData) design.canvasData = canvasData;
      if (width) design.width = width;
      if (height) design.height = height;
      if (category) design.category = category;

      design.updatedAt = Date.now();
      const updatedDesign = await design.save();

      return res.status(200).json({
        success: true,
        data: updatedDesign,
      });
    } else {
      await assertDesignQuota(userId);

      const newDesign = new Design({
        userId,
        name: name || "Untitled Design",
        width,
        height,
        canvasData,
        category,
      });

      const saveDesign = await newDesign.save();
      return res.status(200).json({
        success: true,
        data: saveDesign,
      });
    }
  } catch (e) {
    console.error("Error while saving design", e);
    res.status(e.statusCode || 500).json({
      success: false,
      message:
        e.statusCode === 403
          ? "Free design limit reached. Upgrade to premium to create more designs."
          : "Failed to save design",
    });
  }
};

exports.deleteDesign = async (req, res) => {
  try {
    const userId = req.user.userId;
    const designId = req.params.id;

    if (!mongoose.isValidObjectId(designId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid design ID",
      });
    }

    const design = await Design.findOne({ _id: designId, userId });

    if (!design) {
      return res.status(404).json({
        success: false,
        message: "Design not found! or you don't have permission to delete it.",
      });
    }

    await Design.deleteOne({ _id: designId });

    res.status(200).json({
      success: true,
      message: "Design deleted successfully",
    });
  } catch (e) {
    console.error("Error while deleting design", e);
    res.status(500).json({
      success: false,
      message: "Failed to delete design",
    });
  }
};
