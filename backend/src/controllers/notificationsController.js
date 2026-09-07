const Notification = require('../models/Notification');
const PushToken = require('../models/PushToken');
const { sendPush } = require('../services/pushService');

// ── GET / — Fetch notifications for the authenticated user ─────
exports.getNotifications = async (req, res) => {
    try {
        const profileId = req.profile._id;
        const { limit = 50, skip = 0, unreadOnly } = req.query;

        const filter = {
            recipientId: profileId,
            $or: [
                { expiresAt: { $gt: new Date() } },
                { expiresAt: null },
            ],
        };

        if (unreadOnly === 'true') {
            filter.status = { $in: ['pending', 'sent', 'delivered'] };
        }

        const [data, total, unreadCount] = await Promise.all([
            Notification.find(filter)
                .sort({ createdAt: -1 })
                .skip(parseInt(skip))
                .limit(parseInt(limit))
                .lean({ virtuals: true }),
            Notification.countDocuments(filter),
            Notification.countDocuments({
                recipientId: profileId,
                status: { $in: ['pending', 'sent', 'delivered'] },
                $or: [
                    { expiresAt: { $gt: new Date() } },
                    { expiresAt: null },
                ],
            }),
        ]);

        res.json({
            data,
            total,
            unreadCount,
            limit: parseInt(limit),
            skip: parseInt(skip),
        });
    } catch (err) {
        console.error('Failed to fetch notifications:', err);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
};

// ── PATCH /read-all — Mark all notifications as read ───────────
exports.markAllAsRead = async (req, res) => {
    try {
        const profileId = req.profile._id;
        const result = await Notification.markAllAsRead(profileId);

        res.json({
            success: true,
            modifiedCount: result.modifiedCount || 0,
        });
    } catch (err) {
        console.error('Failed to mark all as read:', err);
        res.status(500).json({ error: 'Failed to mark all as read' });
    }
};

// ── PATCH /:id/read — Mark a single notification as read ───────
exports.markAsRead = async (req, res) => {
    try {
        const notification = await Notification.findOne({
            _id: req.params.id,
            recipientId: req.profile._id,
        });

        if (!notification) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        if (notification.status === 'read') {
            return res.json({ success: true, message: 'Already read' });
        }

        await notification.markAsRead();

        res.json({ success: true });
    } catch (err) {
        console.error('Failed to mark notification as read:', err);
        res.status(500).json({ error: 'Failed to mark notification as read' });
    }
};

// ── POST /push-token — Register an Expo push token ────────────
exports.registerPushToken = async (req, res) => {
    try {
        const { token, platform } = req.body;

        if (!token) {
            return res.status(400).json({ error: 'token is required' });
        }

        // Upsert: update if exists, create if not
        await PushToken.findOneAndUpdate(
            { profileId: req.profile._id, token },
            { profileId: req.profile._id, token, platform: platform || 'android', isActive: true },
            { upsert: true, new: true }
        );

        console.log(`[PushToken] Registered for ${req.profile.fullName || req.profile._id} (${platform || 'android'})`);
        res.json({ success: true });
    } catch (err) {
        console.error('Failed to register push token:', err);
        res.status(500).json({ error: 'Failed to register push token' });
    }
};

// ── DELETE /push-token — Unregister push token on logout ──────
exports.unregisterPushToken = async (req, res) => {
    try {
        const { token } = req.body;

        if (token) {
            await PushToken.deleteOne({ profileId: req.profile._id, token });
        } else {
            // Remove all tokens for this user
            await PushToken.deleteMany({ profileId: req.profile._id });
        }

        res.json({ success: true });
    } catch (err) {
        console.error('Failed to unregister push token:', err);
        res.status(500).json({ error: 'Failed to unregister push token' });
    }
};

// ── POST /test-push — Send a test push to yourself (dev only) ─
exports.testPush = async (req, res) => {
    try {
        // immediate:true bypasses the queue so this diagnostic endpoint gives a real,
        // synchronous answer about whether Expo actually accepted the push.
        const result = await sendPush(req.profile._id, {
            title: 'Test Notification 🔔',
            body: 'Push notifications are working! Tap to open your dashboard.',
            type: 'call_reminder',
            priority: 'high',
            data: { screen: 'CallerDashboard' },
        }, { immediate: true });

        if (result?.status === 'failed') {
            return res.status(502).json({
                success: false,
                notificationId: result._id,
                error: 'Expo rejected the push — see server logs for details',
                failedReason: result.failedReason,
            });
        }

        res.json({ success: true, notificationId: result?._id, status: result?.status });
    } catch (err) {
        console.error('Test push failed:', err);
        res.status(500).json({ error: 'Test push failed', details: err.message });
    }
};
