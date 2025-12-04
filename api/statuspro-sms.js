import { NextResponse } from "next/server";
import twilio from "twilio";

export async function POST(request) {
  try {
    const body = await request.json();

    // Get data from StatusPro payload
    const status = body.status || body.new_status || body.status_key;
    const orderId = body.order_id;
    const customerPhone = body.customer_phone;

    // Twilio credentials (add these to environment variables)
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const client = twilio(accountSid, authToken);

    // Nigerian customers get sender ID
    let from = "HELLOTASTY"; // Nigeria only
    if (customerPhone.startsWith("+44")) {
      // UK customers get Twilio phone number
      from = process.env.TWILIO_PHONE_NUMBER;
    }

    // CUSTOM STATUS → MESSAGE matching
    let message = "";

    if (status === "prepared" || status === "osp: prepared") {
      message = "Your Hello Tasty order is being prepared 🍲❤️";
    }
    if (status === "ofd" || status === "osp: ofd") {
      message = "Your Hello Tasty rider is on the way 🚴💨";
    }
    if (status === "delivered" || status === "osp: delivered") {
      message = "Your order has been delivered. Enjoy! 🎉🍽️";
    }

    // Send SMS via Twilio
    await client.messages.create({
      body: message,
      from,
      to: customerPhone
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("SMS error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
