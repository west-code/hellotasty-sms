const twilio = require("twilio");
const fetch = require("node-fetch");

module.exports = async (req, res) => {
  try {
    const body = req.body || {};

    // StatusPro new status key (osp: prepared, osp: ofd, osp: delivered)
    const status = body?.status?.new_status;
    const orderId = body?.order?.id;

    if (!orderId) {
      return res.status(400).json({ error: "Order ID missing from webhook." });
    }

    // Fetch order details from Shopify Admin API
    const shopDomain = process.env.SHOPIFY_STORE_DOMAIN;
    const apiToken = process.env.SHOPIFY_ADMIN_API_TOKEN;

    const shopifyResponse = await fetch(
      `https://${shopDomain}/admin/api/2023-10/orders/${orderId}.json`,
      {
        method: "GET",
        headers: {
          "X-Shopify-Access-Token": apiToken,
          "Content-Type": "application/json",
        },
      }
    );

    const shopifyData = await shopifyResponse.json();

    if (!shopifyData.order) {
      return res.status(400).json({ error: "Order not found in Shopify." });
    }

    const order = shopifyData.order;

    // Extract phone number
    const customerPhone =
      order.phone ||
      order.billing_address?.phone ||
      order.shipping_address?.phone ||
      order.customer?.phone ||
      order.customer?.default_address?.phone ||
      null;

    if (!customerPhone) {
      return res
        .status(400)
        .json({ error: "No phone number found for this order." });
    }

    // Twilio credentials
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const client = twilio(accountSid, authToken);

    // Choose sender ID
    let fromSender = "HELLOTASTY"; // Nigeria only
    if (customerPhone.startsWith("+44")) {
      fromSender = process.env.TWILIO_PHONE_NUMBER; // UK requires real number
    }

    // Status-based message
    let smsMessage = "";

    if (status === "osp: prepared") {
      smsMessage = "Your Hello Tasty order is being prepared 🍲❤️";
    }

    if (status === "osp: ofd") {
      smsMessage =
        "Your Hello Tasty rider is on the way 🚴💨 Please stay available.";
    }

    if (status === "osp: delivered") {
      smsMessage =
        "Your Hello Tasty order has been delivered 🎉🍽️ Thank you for ordering!";
    }

    if (!smsMessage) {
      return res.status(400).json({
        error: `Unknown status '${status}'. No SMS sent.`,
      });
    }

    // Send SMS
    await client.messages.create({
      body: smsMessage,
      from: fromSender,
      to: customerPhone,
    });

    return res.status(200).json({
      success: true,
      orderId,
      phone: customerPhone,
      status,
    });
  } catch (err) {
    console.error("SMS ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
};
