import "dotenv/config";
import { Resend } from 'resend';
import { receiveMailFromSQS, deleteMailFromSQS, type MailMessage } from "./utils/sqs";
import { generateAbandonedCartEmailHTML } from "./utils/email-templates";

const POLL_INTERVAL = 15000; // 15 seconds

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

async function sendAbandonedCartEmail(mailData: MailMessage): Promise<void> {
  try {
    
    if (!mailData.customerEmail) {
      console.error(`No customer email found for cart ${mailData.cartToken}`);
      return;
    }

    console.log(`Sending abandoned cart email to: ${mailData.customerEmail}`);

    // Generate email template
    const htmlContent = generateAbandonedCartEmailHTML(mailData);
    
    // Get shop name for email
    const shopName = mailData.shop.replace('.myshopify.com', '').replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const fromEmail = process.env.RESEND_FROM_EMAIL || `noreply@${mailData.shop}`;
    
    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: `${shopName} <${fromEmail}>`,
      to: [mailData.customerEmail],
      subject: `🛒 You left ${mailData.totalProducts} item${mailData.totalProducts > 1 ? 's' : ''} in your cart at ${shopName}!`,
      html: htmlContent,
    });

    if (error) {
      throw new Error(`Resend error: ${error.message}`);
    }

    console.log(`Email sent successfully to: ${mailData.customerEmail}`, {
      messageId: data?.id,
      cartToken: mailData.cartToken
    });

  } catch (error) {
    console.error(`Failed to send abandoned cart email:`, error);
    throw error; // Re-throw to prevent message deletion
  }
}

async function processMailQueue(): Promise<void> {
  try {
    console.log("Polling mail queue for messages...");
    
    const messages = await receiveMailFromSQS();
    
    if (messages.length > 0) {
      console.log(`Received ${messages.length} mail messages`);
      
      for (const message of messages) {
        try {
          if (!message.Body || !message.ReceiptHandle) {
            console.error("Invalid message format:", message);
            continue;
          }
          
          const mailData: MailMessage = JSON.parse(message.Body);
          
          console.log(`Processing mail for cart ${mailData.cartToken}`);
          
          // Send the email
          await sendAbandonedCartEmail(mailData);
          
          // Delete the message from the queue after successful processing
          await deleteMailFromSQS(message.ReceiptHandle);
          console.log(`Mail message processed and deleted for cart ${mailData.cartToken}`);
          
        } catch (error) {
          console.error(`Failed to process mail message:`, error);
          // Message will remain in queue and be retried
        }
      }
    } else {
      console.log("No mail messages in queue");
    }
  } catch (error) {
    console.error("Error processing mail queue:", error);
  }
}

async function startMailWorker(): Promise<void> {
  console.log("Starting mail worker...");
  console.log(`Polling interval: ${POLL_INTERVAL}ms`);
  
  // Process immediately on start
  await processMailQueue();
  
  // Set up recurring processing
  setInterval(async () => {
    await processMailQueue();
  }, POLL_INTERVAL);
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\nReceived SIGINT, shutting down mail worker gracefully...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\nReceived SIGTERM, shutting down mail worker gracefully...");
  process.exit(0);
});

// Start the worker
startMailWorker().catch((error) => {
  console.error("Failed to start mail worker:", error);
  process.exit(1);
});