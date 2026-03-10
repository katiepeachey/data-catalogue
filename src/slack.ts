import { Submission } from './types';

export async function sendRejectionNotification(
  submission: Submission,
  reason: string
): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  const message = `🚫 Datapoint Rejected: ${submission.name}\nCategory: ${submission.category}\nReason: ${reason}\nSubmitted: ${submission.submittedAt}`;

  if (!webhookUrl || webhookUrl === 'https://hooks.slack.com/services/...') {
    console.log('[Slack notification skipped – no webhook configured]');
    console.log(message);
    return;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message }),
    });

    if (!response.ok) {
      console.error(
        `[Slack] Failed to send notification: ${response.status} ${response.statusText}`
      );
    }
  } catch (err) {
    console.error('[Slack] Error sending notification:', err);
  }
}
