import logger from '../config/logger.js';
import env from '../config/env.js';

/**
 * Outbound email is not wired to a provider yet.
 *
 * In development it logs what it would have sent, so quotation and follow-up
 * flows can be exercised end to end. In production it throws rather than
 * returning a fake success — a quotation the client never received must not be
 * recorded as sent.
 *
 * To make it real, implement `send` against the chosen provider (SES, Postmark,
 * SendGrid) and delete the guard.
 */
const mailService = {
  async send({ to, subject, html, text }) {
    if (env.nodeEnv === 'production') {
      throw new Error('No email provider is configured — configure one before sending mail in production');
    }

    logger.info(`[mail] would send to ${to} — "${subject}"`);
    logger.debug(`[mail] body: ${text || html || '(empty)'}`);

    return { delivered: false, simulated: true, to, subject };
  },
};

export default mailService;
