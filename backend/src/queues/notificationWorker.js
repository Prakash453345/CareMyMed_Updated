const { Worker } = require('bullmq');
const { getQueueConnection } = require('../config/queueRedis');
const { QUEUE_NAME } = require('./notificationQueue');
const Notification = require('../models/Notification');
const { deliverPush } = require('../services/pushService');
const { sendEmail } = require('../services/emailService');

/**
 * ═══════════════════════════════════════════════════════════════
 * NOTIFICATION QUEUE WORKER
 *
 * Consumes 'push' and 'email' jobs from the notifications queue.
 * Runs in-process (started from server.js on boot) — this is a
 * single-service deployment, so a separate worker process isn't
 * needed; concurrency + a rate limiter keep it from overwhelming
 * the Expo push API or the SMTP relay.
 * ═══════════════════════════════════════════════════════════════
 */

const CONCURRENCY = 5;
// Stay well under Expo's push API limits and typical SMTP relay rate limits.
const RATE_LIMIT = { max: 20, duration: 1000 };

let worker = null;

async function processPushJob(job) {
    const { notificationId } = job.data;
    const notification = await Notification.findById(notificationId);
    if (!notification) {
        // Nothing to deliver (e.g. record was deleted) — not a failure, just skip.
        return { skipped: true, reason: 'notification not found' };
    }
    await deliverPush(notification); // throws on transient failure -> BullMQ retries with backoff
    return { delivered: true };
}

async function processEmailJob(job) {
    const { to, subject, html, notificationId } = job.data;
    const result = await sendEmail(to, subject, html);

    if (notificationId) {
        const notification = await Notification.findById(notificationId);
        if (notification) {
            if (result) {
                await notification.markAsSent();
            } else if (job.attemptsMade + 1 >= (job.opts.attempts || 1)) {
                // Only mark permanently failed once retries are exhausted.
                await notification.markAsFailed('SMTP send failed after retries — see server logs');
            }
        }
    }

    if (!result) {
        throw new Error('Email delivery failed — see emailService logs for SMTP error details');
    }
    return { delivered: true };
}

function startNotificationWorker() {
    if (worker) return worker;

    const connection = getQueueConnection();
    if (!connection) {
        console.log('⚠️  Notification worker not started — Redis unavailable (falling back to inline delivery per-call)');
        return null;
    }

    worker = new Worker(
        QUEUE_NAME,
        async (job) => {
            if (job.name === 'push') return processPushJob(job);
            if (job.name === 'email') return processEmailJob(job);
            throw new Error(`Unknown notification job type: ${job.name}`);
        },
        {
            connection,
            concurrency: CONCURRENCY,
            limiter: RATE_LIMIT,
        }
    );

    worker.on('failed', async (job, err) => {
        const attemptsMax = job?.opts?.attempts || 1;
        const isFinalAttempt = (job?.attemptsMade || 0) >= attemptsMax;
        console.error(
            `❌ [NotificationWorker] Job ${job?.id} (${job?.name}) failed ` +
            `(attempt ${job?.attemptsMade}/${attemptsMax}): ${err.message}` +
            (isFinalAttempt ? ' — giving up' : ' — will retry')
        );

        // For push jobs, mark the notification failed once retries are exhausted
        // (email jobs handle this themselves in processEmailJob, since they need
        // the SMTP result, not just the thrown error).
        if (isFinalAttempt && job?.name === 'push' && job.data?.notificationId) {
            try {
                const notification = await Notification.findById(job.data.notificationId);
                if (notification && notification.status !== 'sent') {
                    await notification.markAsFailed(err.message.slice(0, 500));
                }
            } catch (updateErr) {
                console.error('[NotificationWorker] Failed to mark notification as failed:', updateErr.message);
            }
        }
    });

    worker.on('error', (err) => {
        console.error('❌ [NotificationWorker] Worker error:', err.message);
    });

    console.log(`[NotificationWorker] Started (concurrency=${CONCURRENCY})`);
    return worker;
}

async function stopNotificationWorker() {
    if (worker) {
        await worker.close();
        worker = null;
    }
}

module.exports = { startNotificationWorker, stopNotificationWorker };
