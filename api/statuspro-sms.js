const twilio = require("twilio");

module.exports = async (req, res) => {
  try {
    // Parse JSON body
    const body = req.body || {};

    // Get StatusPro new status
    const status = body?.status?.new_status;

    // Extract phone number (StatusPro must be configured to include it)
    let customerPhone =
      body?.customer?.phone ||
      body?.customer?.default_address?.phone ||
      body?.order?.shipping_address?.phone ||
      null;

    if (!customerPhone) {
      return res.status(400).json({
        error: "No customer phone passed from StatusPro",
      });
    }

    // Twilio Credentials
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const client = twilio(accountSid, authToken);

    // Determine sender ID
    let fromSender = "HELLOTASTY"; // Nigeria only
    if (customerPhone.startsWith("+44")) {
      fromSender = process.env.TWILIO_PHONE_NUMBER; // UK requires real number
    }

    // Status-based message
    let message = "";

    if (status === "osp: prepared") {
      message = "Your Hello Tasty order is being prepared 🍲❤️";
    }
    if (status === "osp: ofd") {
      message = "Your Hello Tasty rider is on the way 🚴💨";
    }
    if (status === "osp: delivered") {
      message = "Your order has been delivered 🎉🍽️ Enjoy your meal!";
    }

    if (!message) {
      return res.status(400).json({
        error: `Unknown status '${status}'. No SMS sent.`,
      });
    }

    // Send Twilio SMS
    await client.messages.create({
      body: message,
      from: fromSender,
      to: customerPhone,
    });

    return res.status(200).json({
      success: true,
      sent_to: customerPhone,
      status,
    });
  } catch (err) {
    console.error("SMS ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
};
