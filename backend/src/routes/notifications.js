const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authenticate');
const notificationsController = require('../controllers/notificationsController');

// All routes require authentication
router.use(authenticate);

router.get('/', notificationsController.getNotifications);

// NOTE: This route MUST be defined BEFORE /:id/read to avoid
// Express matching "read-all" as an :id parameter.
router.patch('/read-all', notificationsController.markAllAsRead);

router.patch('/:id/read', notificationsController.markAsRead);

router.post('/push-token', notificationsController.registerPushToken);

router.delete('/push-token', notificationsController.unregisterPushToken);

router.post('/test-push', notificationsController.testPush);

module.exports = router;
