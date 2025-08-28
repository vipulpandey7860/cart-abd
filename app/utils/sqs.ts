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
}

export async function sendWebhookToSQS(message: WebhookMessage): Promise<string | undefined> {
  try {
    const queueUrl = process.env.SQS_WEBHOOK_QUEUE_URL;
    
    if (!queueUrl) {
      throw new Error('SQS_WEBHOOK_QUEUE_URL environment variable is not set');
    }

    const command = new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(message.payload),
    });

    const response = await sqsClient.send(command);
    console.log(`Message sent to SQS: ${response.MessageId}`);
    return response.MessageId;
  } catch (error) {
    console.error('Failed to send message to SQS:', error);
    throw error;
  }
}