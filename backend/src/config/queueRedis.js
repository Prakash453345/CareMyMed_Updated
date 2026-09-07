const Redis = require('ioredis');

/**
 * ═══════════════════════════════════════════════════════════════
 * DEDICATED REDIS CONNECTION FOR BULLMQ
 *
 * BullMQ needs its own ioredis connection, separate from the
 * general-purpose caching client in config/redis.js:
 *   - maxRetriesPerRequest MUST be null (BullMQ uses blocking
 *     commands and manages retries itself; a finite value makes
 *     the blocking commands error out).
 *   - enableReadyCheck is disabled per BullMQ's recommendation.
 * Falls back to null (no queue) if REDIS_URL is not configured —
 * callers must degrade gracefully, the same way config/redis.js does.
 * ═══════════════════════════════════════════════════════════════
 */

let connection = null;
let connectionFailed = false;

function getQueueConnection() {
    if (connection) return connection;
    if (connectionFailed) return null;

    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
        console.log('⚠️  REDIS_URL not set — notification queue disabled, falling back to inline delivery');
        connectionFailed = true;
        return null;
    }

    try {
        connection = new Redis(redisUrl, {
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
        });

        connection.on('error', (err) => {
            console.error('❌ Queue Redis error:', err.message);
        });

        connection.on('connect', () => {
            console.log('✅ Queue Redis connected');
        });

        return connection;
    } catch (err) {
        console.error('❌ Queue Redis init failed — notification queue disabled:', err.message);
        connectionFailed = true;
        connection = null;
        return null;
    }
}

async function disconnectQueueRedis() {
    if (connection) {
        await connection.quit();
        connection = null;
    }
}

module.exports = { getQueueConnection, disconnectQueueRedis };
