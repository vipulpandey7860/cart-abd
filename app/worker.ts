import 'dotenv/config';
import { receiveWebhookFromSQS, deleteWebhookFromSQS } from './utils/sqs';
import prisma from './db.server';

const POLL_INTERVAL = 5000; // 5 seconds

async function processWebhook(message: any) {
  try {
    const body = JSON.parse(message.Body);
    const payload = body.payload;
    
    console.log('Received webhook from SQS:', payload);
    
    // Extract cart data from payload
    const cartData = {
      id: payload.id,
      token: payload.token,
      createdAt: new Date(payload.created_at),
      payload: JSON.stringify(payload),
      processed: false,
    };
    
    // Save to database
    await prisma.cart.upsert({
      where: { token: cartData.token },
      update: {
        payload: cartData.payload,
        processed: false,
      },
      create: cartData,
    });
    
    console.log(`Cart ${cartData.token} saved to database`);
    
    // Delete the message after processing
    await deleteWebhookFromSQS(message.ReceiptHandle);
    console.log('Message deleted from SQS');
  } catch (error) {
    console.error('Error processing webhook:', error);
  }
}

async function pollSQS() {
  console.log('Polling SQS for webhooks...');
  
  try {
    const messages = await receiveWebhookFromSQS();
    
    if (messages.length > 0) {
      console.log(`Found ${messages.length} messages`);
      
      // Process each message
      for (const message of messages) {
        await processWebhook(message);
      }
    } else {
      console.log('No messages found');
    }
  } catch (error) {
    console.error('Error polling SQS:', error);
  }
}

async function startWorker() {
  console.log('Starting SQS webhook worker...');
  console.log(`Polling interval: ${POLL_INTERVAL}ms`);
  
  // Poll immediately on start
  await pollSQS();
  
  // Set up recurring polling
  setInterval(async () => {
    await pollSQS();
  }, POLL_INTERVAL);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nReceived SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nReceived SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Start the worker
startWorker().catch((error) => {
  console.error('Failed to start worker:', error);
  process.exit(1);
});