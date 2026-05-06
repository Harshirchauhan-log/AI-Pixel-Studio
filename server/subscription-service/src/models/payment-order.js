const mongoose = require("mongoose");

const PaymentOrderSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  orderId: {
    type: String,
    required: true,
    unique: true,
  },
  status: {
    type: String,
    enum: ["CREATED", "CAPTURED", "FAILED"],
    default: "CREATED",
  },
  amount: {
    type: String,
    required: true,
  },
  currency: {
    type: String,
    required: true,
  },
  captureId: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

PaymentOrderSchema.index({ userId: 1, orderId: 1 });

PaymentOrderSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const PaymentOrder =
  mongoose.models.PaymentOrder ||
  mongoose.model("PaymentOrder", PaymentOrderSchema);

module.exports = PaymentOrder;
