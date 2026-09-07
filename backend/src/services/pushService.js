/**
 * Expo Push Notification Service
 * Sends real push notifications via Expo Push API.
 *
 * Delivery is queue-backed (see queues/notificationQueue.js +
 * queues/notificationWorker.js): sendPush() creates the Notification
 * record and enqueues a delivery job, so callers never block on the
 * Expo API round-trip. If the queue is unavailable (e.g. Redis down),
 * it falls back to delivering inline so notifications still go out.
 */
const PushToken = require('../models/PushToken');
const Notification = require('../models/Notification');
const { enqueuePush } = require('../queues/notificationQueue');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Actually calls the Expo Push API for a given (already-created) notification
 * and updates its delivery status. Used by the queue worker, and as the
 * inline fallback when the queue is unavailable or `immediate: true` is passed.
 *
 * @param {import('mongoose').Document} notification — a Notification document
 * @returns {Promise<import('mongoose').Document>} the same notification, updated
 */
async function deliverPush(notification) {
    try {
        const tokens = await PushToken.find({ profileId: notification.recipientId, isActive: true }).lean();

        if (tokens.length === 0) {
            console.log(`[PushService] No push tokens for user ${notification.recipientId}`);
            await notification.markAsSent();
            return notification;
        }

        const priority = notification.priority;
        const data = notification.data || {};

        const messages = tokens.map(t => ({
            to: t.token,
            sound: 'default',
            title: notification.title,
            body: notification.body,
            data: {
                notificationId: notification._id.toString(),
                type: notification.type || 'system_announcement',
                urgency: priority === 'urgent' ? 'high' : 'normal',
                ...data,
            },
            priority: (priority === 'urgent' || data?.urgency === 'high' || data?.urgency === 'critical') ? 'high' : 'default',
            channelId: 'caller-notifications',
            categoryId: data?.categoryId || undefined,
        }));

        const response = await fetch(EXPO_PUSH_URL, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(messages),
        });

        if (!response.ok) {
            // Transient/HTTP-level failure — throw so the queue worker retries with backoff
            throw new Error(`Expo push API returned HTTP ${response.status}`);
        }

        const result = await response.json();

        if (result.errors && result.errors.length) {
            // Request-level errors (e.g. malformed payload) — log and treat as failed
            console.error('[PushService] Expo push API request-level error(s):', JSON.stringify(result.errors));
        }

        let anySucceeded = tokens.length === 0;
        if (result.data) {
            for (let i = 0; i < result.data.length; i++) {
                const ticket = result.data[i];
                const token = tokens[i];

                if (ticket.status === 'error') {
                    // Log EVERY error ticket, not just DeviceNotRegistered — silent swallowing
                    // of credential/config errors (e.g. missing FCM V1 service account on the
                    // Expo/EAS project) was previously the reason pushes looked "sent" but
                    // never arrived on-device.
                    console.error(
                        `[PushService] Delivery error for user ${notification.recipientId} ` +
                        `(token ${token?.token?.slice(0, 12)}...): ${ticket.details?.error || 'unknown'} — ${ticket.message || ''}`
                    );

                    if (ticket.details?.error === 'DeviceNotRegistered') {
                        await PushToken.updateOne({ token: token.token }, { isActive: false });
                        console.log(`[PushService] Deactivated stale token for user ${notification.recipientId}`);
                    }
                } else {
                    anySucceeded = true;
                }
            }
        }

        if (anySucceeded) {
            await notification.markAsSent();
        } else {
            await notification.markAsFailed('All Expo push tickets returned errors — see server logs');
        }

        return notification;
    } catch (err) {
        console.error(`[PushService] Error delivering push to user ${notification.recipientId}:`, err.message);
        throw err; // let the queue worker retry with backoff; inline fallback callers catch this themselves
    }
}

/**
 * Send a push notification to a specific user.
 * Creates a Notification record immediately (for the in-app feed) and
 * queues the actual Expo delivery so this never blocks the caller on
 * an external HTTP call.
 *
 * @param {ObjectId|string} recipientId
 * @param {{ title: string, body: string, type?: string, priority?: string, data?: object }} notification
 * @param {{ immediate?: boolean }} [options] — pass immediate:true to bypass the queue and
 *   deliver synchronously (used by the /test-push diagnostic endpoint for instant feedback).
 * @returns {Promise<import('mongoose').Document|null>} the created Notification record
 */
async function sendPush(recipientId, { title, body, type, priority, data }, options = {}) {
    let notification;
    try {
        notification = await Notification.create({
            recipientId,
            type: type || 'system_announcement',
            channel: 'push',
            title,
            body,
            priority: priority || 'normal',
            status: 'pending',
            data: data || {},
        });
    } catch (err) {
        console.error('[PushService] Failed to create notification record:', err.message);
        return null;
    }

    if (options.immediate) {
        try {
            await deliverPush(notification);
        } catch (err) {
            // deliverPush already logged the details; surface failure to the caller.
            await notification.markAsFailed(err.message).catch(() => {});
        }
        return notification;
    }

    const queued = await enqueuePush({
        notificationId: notification._id.toString(),
        priority: notification.priority,
    });

    if (!queued) {
        // Queue unavailable — degrade gracefully by delivering inline instead of dropping it.
        deliverPush(notification).catch((err) => {
            notification.markAsFailed(err.message).catch(() => {});
        });
    }

    return notification;
}

/**
 * Send push to multiple users at once (batch).
 */
async function sendPushBatch(recipientIds, { title, body, type, priority, data }) {
    const results = [];
    for (const id of recipientIds) {
        const r = await sendPush(id, { title, body, type, priority, data });
        if (r) results.push(r);
    }
    return results;
}

module.exports = { sendPush, sendPushBatch, deliverPush };
