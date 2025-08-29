import "dotenv/config";
import prisma from "./db.server";
import { getCartById } from "./graphql/queries/getCartById";
import { unauthenticated } from "./shopify.server";

const POLL_INTERVAL = 30000; // 30 seconds
const CART_ABANDONMENT_SECONDS = parseInt(
  process.env.CART_ABANDONMENT_SECONDS || "30",
);

async function checkCartExistsInShopify(cartId: string, shop: string) {
  try {
    // another approach could have been using admin api and fetching if order was created with this cart token, but I think we might hit the rate limit if we are processing lot of order, storefront being more relaible
    const { storefront } = await unauthenticated.storefront(shop);

    const response = await storefront.graphql(getCartById, {
      variables: {
        cartId: `gid://shopify/Cart/${cartId}`,
      },
    });
    const jsonresponse = await response.json();
    return jsonresponse.data;
  } catch (error) {
    console.error(`Error checking cart ${cartId}:`, error);
    return false;
  }
}

async function processAbandonedCarts() {
  try {
    const cutoffTime = new Date();
    cutoffTime.setSeconds(cutoffTime.getSeconds() - CART_ABANDONMENT_SECONDS);

    console.log(
      `Looking for carts older than ${CART_ABANDONMENT_SECONDS} seconds (before ${cutoffTime.toISOString()})`,
    );

    const abandonedCarts = await prisma.cart.findMany({
      where: {
        createdAt: {
          lt: cutoffTime,
        },
        processed: false,
        status: null,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    if (abandonedCarts.length > 0) {
      console.log(`Found ${abandonedCarts.length} abandoned carts`);

      for (const cart of abandonedCarts) {
        console.log(
          `Processing abandoned cart: ${cart.token} (created: ${cart.createdAt})`,
        );

        // Parse payload to get shop and cart ID
        const payload = JSON.parse(cart.payload);
        const shop = payload.shop;
        const cartId = cart.id;

        console.log("Cart details:", {
          id: cart.id,
          token: cart.token,
          shop: shop,
        });

        // Check if cart still exists in Shopify
        const cartExists = await checkCartExistsInShopify(cartId, shop);

        if (!cartExists.cart) {
          // Cart doesn't exist (order was created), delete from database
          await prisma.cart.delete({
            where: { id: cart.id },
          });
          console.log(
            `Cart ${cart.token} deleted from database (order was created)`,
          );
        } else {
          // Cart still exists, mark as abandoned
          await prisma.cart.update({
            where: { id: cart.id },
            data: {
              status: "ABANDONED",
              processed: true,
              processedAt: new Date(),
            },
          });
          console.log(`Cart ${cart.token} marked as abandoned`);
        }
      }
    } else {
      console.log("No abandoned carts found");
    }
  } catch (error) {
    console.error("Error processing abandoned carts:", error);
  }
}

async function startAbandonedCartWorker() {
  console.log("Starting abandoned cart worker...");
  console.log(`Polling interval: ${POLL_INTERVAL}ms`);
  console.log(`Cart abandonment threshold: ${CART_ABANDONMENT_SECONDS} seconds`);

  // Process immediately on start
  await processAbandonedCarts();

  // Set up recurring processing
  setInterval(async () => {
    await processAbandonedCarts();
  }, POLL_INTERVAL);
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\nReceived SIGINT, shutting down gracefully...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\nReceived SIGTERM, shutting down gracefully...");
  process.exit(0);
});

// Start the worker
startAbandonedCartWorker().catch((error) => {
  console.error("Failed to start abandoned cart worker:", error);
  process.exit(1);
});
