// A fixed template that takes no input, so no offer text can reach the reply.
const SAFE_REPLY_TEMPLATE = `Hello,

Thank you for your message. Before I go further, I would like to confirm this offer through official channels.

Please send me the employer's registered company name and trade licence number. I do not pay fees, and I do not share passwords, one-time codes or bank details, before this is confirmed.

Thank you.`;

export function draftReply(): string {
  return SAFE_REPLY_TEMPLATE;
}
