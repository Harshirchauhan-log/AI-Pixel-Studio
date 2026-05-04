const mongoose = require("mongoose");

const mediaSchema = new mongoose.Schema({
  userId: String,
  name: String,
  cloudinaryId: String,
  url: String,
  mimeType: String,
  source: {
    type: String,
    enum: ["upload", "ai"],
    default: "upload",
  },
  size: Number,
  width: Number,
  height: Number,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

mediaSchema.index({ userId: 1, createdAt: -1 });
mediaSchema.index({ userId: 1, source: 1, createdAt: -1 });

const Media = mongoose.models.Media || mongoose.model("Media", mediaSchema);
module.exports = Media;
