import { NextResponse } from "next/server";
import twilio from "twilio";

export async function POST(request) {
  try {
    const body = await request.json();

    // Extract the new StatusPro status
    const status = body?.status?.new_status;

    // Customer phone is NOT in your payload yet; must enable it in StatusPro webhook settings
    let customerPhone = body?.customer?.phone 
                         || body?.customer?.default_address?.phone 
                         || body?.order?.shipping_address?.phone 
                         || null;

    if (!customerPhone) {
      return NextResponse.json({ error: "No customer phone passed from StatusPro" }, { status: 400 });
    }

    // Twilio Credentials from Environment Variables
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const client = twilio(accountSid, authToken);

    // Determine correct sender ID
    let fromSender = "HELLOTASTY"; // Nigeria only

    if (customerPhone.startsWith("+44")) {
      fromSender = process.env.TWILIO_PHONE_NUMBER; // UK uses real phone number
    }

    // Status-based SMS message
    let message = "";

    if (status === "prepared") {
      message = "Your Hello Tasty order is being prepared 🍲❤️";
    }

    if (status === "ofd") {
      message = "Your Hello Tasty rider is on the way 🚴💨";
    }

    if (status === "delivered") {
      message = "Your order has been delivered. Enjoy! 🎉🍽️";
    }

    if (!message) {
      return NextResponse.json({ error: `Unknown status '${status}'. No SMS sent.` }, { status: 400 });
    }

    // Send SMS via Twilio
    await client.messages.create({
      body: message,
      from: fromSender,
      to: customerPhone
    });

    return NextResponse.json({ success: true, sent_to: customerPhone, status });

  } catch (error) {
    console.error("SMS Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
