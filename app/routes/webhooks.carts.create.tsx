import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { sendWebhookToSQS } from "../utils/sqs";

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { payload, session, topic, shop } =
      await authenticate.webhook(request);
    console.log(`Received ${topic} webhook for ${shop}`);
    console.log("payload", payload);

    // Extract X-Shopify-Event-Id for duplicate prevention or fallback
    const shopifyEventId = request.headers.get('X-Shopify-Event-Id') || shop + payload.timestamp

    console.log('X-Shopify-Event-Id:', shopifyEventId);
    if (session) {
      const messageId = await sendWebhookToSQS({
        payload: { shop, ...payload },
        eventId: shopifyEventId,
      });

      console.log(`Webhook queued successfully with message ID: ${messageId}`);
    } else {
      console.warn("No session found, webhook not queued");
    }

    return new Response(null, { status: 200 });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response(null, { status: 500 });
  }
};

// fetch('/cart.js')
//   .then(response => response.json())
//   .then(data => console.log(data.token));
