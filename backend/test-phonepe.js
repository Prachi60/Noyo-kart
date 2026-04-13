import dotenv from "dotenv";
dotenv.config();

import { StandardCheckoutClient, Env, StandardCheckoutPayRequest } from '@phonepe-pg/pg-sdk-node';

async function test() {
  const clientId = process.env.PHONEPE_MERCHANT_ID;
  const clientSecret = process.env.PHONEPE_CLIENT_SECRET;
  const clientVersion = parseInt(process.env.PHONEPE_CLIENT_VERSION || "1", 10);
  const isProd = process.env.PHONEPE_ENV === "PRODUCTION";

  console.log("Config:", { clientId, clientSecret, clientVersion, isProd });

  try {
    const client = StandardCheckoutClient.getInstance(
      clientId,
      clientSecret,
      clientVersion,
      isProd ? Env.PRODUCTION : Env.SANDBOX
    );

    const merchantOrderId = "TEST_" + Date.now();
    const amountPaise = 100;
    const redirectUrl = "http://localhost:5173/payment-status";

    const requestBuilder = StandardCheckoutPayRequest.builder()
      .merchantOrderId(merchantOrderId)
      .amount(amountPaise)
      .redirectUrl(redirectUrl);

    // Check if we can build
    let request;
    try {
        request = requestBuilder.build();
        console.log("Request built successfully");
    } catch (e) {
        console.log("Failed to build request:", e.message);
        return;
    }

    console.log("Attempting pay...");
    const response = await client.pay(request);
    console.log("Pay response:", response);
  } catch (error) {
    console.error("Test failed:", error);
  }
}

test();
