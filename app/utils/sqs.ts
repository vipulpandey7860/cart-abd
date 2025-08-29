import { SQSClient, SendMessageCommand, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';

const sqsClient = new SQSClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  } : undefined,
});

export interface WebhookMessage {
  payload: any;
  eventId: string;
}

export async function sendWebhookToSQS(message: WebhookMessage): Promise<string | undefined> {
  try {
    const queueUrl = process.env.SQS_WEBHOOK_QUEUE_URL;
    
    if (!queueUrl) {
      throw new Error('SQS_WEBHOOK_QUEUE_URL environment variable is not set');
    }
    // Use X-Shopify-Event-Id for deduplication if available, otherwise fallback to shop-timestamp
    const deduplicationId = Buffer.from(message.eventId).toString('base64').slice(0, 128)

    const command = new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify({
        payload: message.payload,
      }),
      MessageGroupId: "webhook-group",
      MessageDeduplicationId: deduplicationId,
    });

    const response = await sqsClient.send(command);
    console.log(`Message sent to SQS: ${response.MessageId}`);
    return response.MessageId;
  } catch (error) {
    console.error('Failed to send message to SQS:', error);
    throw error;
  }
}

export async function receiveWebhookFromSQS(): Promise<any[]> {
  try {
    const queueUrl = process.env.SQS_WEBHOOK_QUEUE_URL;
    
    if (!queueUrl) {
      throw new Error('SQS_WEBHOOK_QUEUE_URL environment variable is not set');
    }

    const command = new ReceiveMessageCommand({
      QueueUrl: queueUrl,
      MaxNumberOfMessages: 10,
      WaitTimeSeconds: 20,
      MessageAttributeNames: ['All'],
    });

    const response = await sqsClient.send(command);
    return response.Messages || [];
  } catch (error) {
    console.error('Failed to receive messages from SQS:', error);
    throw error;
  }
}

export async function deleteWebhookFromSQS(receiptHandle: string): Promise<void> {
  try {
    const queueUrl = process.env.SQS_WEBHOOK_QUEUE_URL;
    
    if (!queueUrl) {
      throw new Error('SQS_WEBHOOK_QUEUE_URL environment variable is not set');
    }

    const command = new DeleteMessageCommand({
      QueueUrl: queueUrl,
      ReceiptHandle: receiptHandle,
    });

    await sqsClient.send(command);
  } catch (error) {
    console.error('Failed to delete message from SQS:', error);
    throw error;
  }
}