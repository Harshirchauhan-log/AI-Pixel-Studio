const express = require("express");
const multer = require("multer");
const {
  uploadMedia,
  getAllMediasByUser,
} = require("../controllers/upload-controller");
const {
  generateImageFromAIAndUploadToDB,
} = require("../controllers/ai-image-controller");
const authenticatedRequest = require("../middleware/auth-middleware");

const router = express.Router();
const ALLOWED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
      return cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", "file"));
    }

    cb(null, true);
  },
}).single("file");

router.post(
  "/upload",
  authenticatedRequest,

  (req, res, next) => {
    upload(req, res, function (err) {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      } else if (err) {
        return res.status(500).json({
          success: false,
          message: err.message,
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No file found",
        });
      }

      if (!ALLOWED_IMAGE_TYPES.has(req.file.mimetype)) {
        return res.status(400).json({
          success: false,
          message: "Only PNG, JPEG, WebP, and GIF image uploads are allowed",
        });
      }

      next();
    });
  },
  uploadMedia
);

router.get("/get", authenticatedRequest, getAllMediasByUser);
router.post(
  "/ai-image-generate",
  authenticatedRequest,
  generateImageFromAIAndUploadToDB
);

module.exports = router;
