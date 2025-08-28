import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

const sqsClient = new SQSClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  } : undefined,
});

export interface WebhookMessage {
  payload: any;
  timestamp: string;
  shop:string
}

export async function sendWebhookToSQS(message: WebhookMessage): Promise<string | undefined> {
  try {
    const queueUrl = process.env.SQS_WEBHOOK_QUEUE_URL;
    
    if (!queueUrl) {
      throw new Error('SQS_WEBHOOK_QUEUE_URL environment variable is not set');
    }
    // might have to find a better logic to handle more unique values maybe generate a random hash
    const deduplicationId = Buffer.from(`${message.shop}-${message.timestamp}`).toString('base64').slice(0, 128);

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