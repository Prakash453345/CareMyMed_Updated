const { Queue } = require('bullmq');
const { getQueueConnection } = require('../config/queueRedis');

/**
 * ═══════════════════════════════════════════════════════════════
 * NOTIFICATION QUEUE
 *
 * Single BullMQ queue for both push and email delivery jobs
 * (distinguished by job name: 'push' | 'email'). Kept as one queue
 * so the app only holds one persistent Redis connection for
 * background delivery, which matters on connection-limited
 * managed Redis plans (e.g. Upstash free tier).
 *
 * If Redis is unavailable, enqueue* helpers return false and the
 * caller (pushService / emailService callers) falls back to
 * delivering inline instead of crashing — same graceful-degradation
 * philosophy as config/redis.js.
 * ═══════════════════════════════════════════════════════════════
 */

const QUEUE_NAME = 'notifications';

const DEFAULT_JOB_OPTIONS = {
    attempts: 5,
    backoff: { type: 'exponential', delay: 5000 }, // 5s, 10s, 20s, 40s, 80s
    removeOnComplete: { count: 500, age: 24 * 60 * 60 },       // keep 24h / last 500
    removeOnFail: { count: 1000, age: 7 * 24 * 60 * 60 },      // keep 7d / last 1000 for inspection
};

// Priority: lower number = delivered first in BullMQ
const PRIORITY_BY_LEVEL = { urgent: 1, high: 2, normal: 3, low: 4 };

let queue = null;
let initFailed = false;

function getQueue() {
    if (queue) return queue;
    if (initFailed) return null;

    const connection = getQueueConnection();
    if (!connection) {
        initFailed = true;
        return null;
    }

    try {
        queue = new Queue(QUEUE_NAME, {
            connection,
            defaultJobOptions: DEFAULT_JOB_OPTIONS,
        });
        queue.on('error', (err) => {
            console.error('❌ Notification queue error:', err.message);
        });
        return queue;
    } catch (err) {
        console.error('❌ Failed to init notification queue — falling back to inline delivery:', err.message);
        initFailed = true;
        return null;
    }
}

/**
 * Enqueue a push-delivery job.
 * @returns {Promise<boolean>} true if queued, false if the caller should deliver inline.
 */
async function enqueuePush(payload) {
    const q = getQueue();
    if (!q) return false;

    try {
        await q.add('push', payload, {
            priority: PRIORITY_BY_LEVEL[payload.priority] || PRIORITY_BY_LEVEL.normal,
        });
        return true;
    } catch (err) {
        console.error('❌ Failed to enqueue push job — falling back to inline delivery:', err.message);
        return false;
    }
}

/**
 * Enqueue an email-delivery job.
 * @returns {Promise<boolean>} true if queued, false if the caller should deliver inline.
 */
async function enqueueEmail(payload) {
    const q = getQueue();
    if (!q) return false;

    try {
        await q.add('email', payload);
        return true;
    } catch (err) {
        console.error('❌ Failed to enqueue email job — falling back to inline delivery:', err.message);
        return false;
    }
}

async function closeQueue() {
    if (queue) {
        await queue.close();
        queue = null;
    }
}

module.exports = { QUEUE_NAME, getQueue, enqueuePush, enqueueEmail, closeQueue };
