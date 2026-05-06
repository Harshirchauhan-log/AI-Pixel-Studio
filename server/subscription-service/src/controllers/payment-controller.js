const Subscription = require("../models/subscription");
const PaymentOrder = require("../models/payment-order");
const axios = require("axios");

const PAYPAL_API =
  process.env.NODE_ENV === "production"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
const CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const PAYPAL_TIMEOUT_MS = Number(process.env.PAYPAL_TIMEOUT_MS || 30000);
const PREMIUM_PRICE = process.env.PREMIUM_PRICE || "500";
const PREMIUM_CURRENCY = process.env.PREMIUM_CURRENCY || "USD";

async function getAccessToken() {
  const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");

  const response = await axios({
    method: "post",
    url: `${PAYPAL_API}/v1/oauth2/token`,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${auth}`,
    },
    data: "grant_type=client_credentials",
    timeout: PAYPAL_TIMEOUT_MS,
  });

  return response.data.access_token;
}

//create new paypal order here

exports.createOrder = async (req, res) => {
  try {
    const { userId } = req.user;
    const accessToken = await getAccessToken();

    const response = await axios({
      method: "post",
      url: `${PAYPAL_API}/v2/checkout/orders`,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      data: {
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: PREMIUM_CURRENCY,
              value: PREMIUM_PRICE,
            },
            description: "AI Pixel Studio Premium Membership",
          },
        ],
        application_context: {
          return_url: `${FRONTEND_URL}/subscription/success`,
          cancel_url: `${FRONTEND_URL}/subscription/cancel`,
        },
      },
      timeout: PAYPAL_TIMEOUT_MS,
    });

    const order = response.data;

    const approvalLink = order.links.find(
      (link) => link.rel === "approve"
    ).href;

    await PaymentOrder.findOneAndUpdate(
      { orderId: order.id },
      {
        userId,
        orderId: order.id,
        status: "CREATED",
        amount: PREMIUM_PRICE,
        currency: PREMIUM_CURRENCY,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({
      success: true,
      data: {
        orderId: order.id,
        approvalLink,
      },
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      message: "Error while creating paypal order",
    });
  }
};

exports.capturePayment = async (req, res) => {
  try {
    const { orderId } = req.body;
    const { userId } = req.user;

    if (!orderId || typeof orderId !== "string") {
      return res.status(400).json({
        success: false,
        message: "Valid orderId is required",
      });
    }

    const paymentOrder = await PaymentOrder.findOne({ orderId, userId });

    if (paymentOrder?.status === "CAPTURED" && paymentOrder.captureId) {
      return res.status(200).json({
        success: true,
        data: {
          isPremium: true,
          paymentId: paymentOrder.captureId,
        },
      });
    }

    const pendingOrder =
      paymentOrder?.status === "CREATED" ? paymentOrder : null;

    if (!pendingOrder) {
      return res.status(403).json({
        success: false,
        message: "PayPal order does not belong to this user or was already used",
      });
    }

    const accessToken = await getAccessToken();

    const response = await axios({
      method: "post",
      url: `${PAYPAL_API}/v2/checkout/orders/${orderId}/capture`,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      timeout: PAYPAL_TIMEOUT_MS,
    });

    const captureData = response.data;
    const capture = captureData.purchase_units?.[0]?.payments?.captures?.[0];
    const captureId = capture?.id;
    const captureAmount = capture?.amount;

    if (
      captureData.status !== "COMPLETED" ||
      capture?.status !== "COMPLETED" ||
      captureAmount?.currency_code !== pendingOrder.currency ||
      captureAmount?.value !== pendingOrder.amount ||
      !captureId
    ) {
      pendingOrder.status = "FAILED";
      await pendingOrder.save();

      return res.status(400).json({
        success: false,
        message: "PayPal capture verification failed",
      });
    }

    let subscription = await Subscription.findOne({ userId });

    if (!subscription) {
      subscription = new Subscription({ userId });
    }

    subscription.isPremium = true;
    subscription.premiumSince = new Date();
    subscription.paymentId = captureId;

    await subscription.save();

    pendingOrder.status = "CAPTURED";
    pendingOrder.captureId = captureId;
    await pendingOrder.save();

    res.status(200).json({
      success: true,
      data: {
        isPremium: true,
        paymentId: captureId,
      },
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      message: "Error while capturing paypal order",
    });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
  } catch (e) {
    res.status(500).json({
      success: false,
      message: "Error while verifying paypal payment",
    });
  }
};
