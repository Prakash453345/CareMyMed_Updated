const express = require('express');
const { authenticateSession } = require('../../middleware/authenticate');
const { validateObjectId } = require('../../middleware/validateObjectId');
const requireSubscription = require('../../middleware/requireSubscription');
const SubscriptionService = require('../../services/SubscriptionService');
const patientsController = require('../../controllers/users/patientsController');

const router = express.Router();

router.use((req, res, next) => {
  const path = req.path;
  const method = req.method;

  // 1. Exclude public, billing, and basic onboarding/status routes from subscription checks
  const isSubscriptionExcluded =
    path === '/cities' ||
    path === '/location/reverse' ||
    path === '/location/search' ||
    path === '/subscribe' ||
    path === '/initiate-payment' ||
    (path === '/me' && (method === 'GET' || method === 'PUT')) ||
    (path === '/' && (method === 'GET' || method === 'PUT'));

  // 2. Identify if the route itself is public (no authentication needed at all)
  const isPublicRoute =
    path === '/cities' ||
    path === '/location/reverse' ||
    path === '/location/search';

  if (isPublicRoute) {
    return next();
  }

  // 3. For all other routes, we need authentication first.
  // If not already authenticated, authenticate now.
  if (!req.profile && !req.auth) {
    authenticateSession(req, res, (err) => {
      if (err) return next(err);
      runChecks();
    });
  } else {
    runChecks();
  }

  function runChecks() {
    // SEC-FIX: Block companions from accessing patient mutation/settings routes
    if (req.profile && req.profile.role === 'companion') {
      return res.status(403).json({
        error:
          'Companions cannot access or mutate patient records directly. Use the companion APIs.',
      });
    }

    // Apply requireSubscription if not excluded
    if (!isSubscriptionExcluded) {
      return requireSubscription(req, res, next);
    }

    next();
  }
});

// ─── Public Endpoints ─────────────────────────────────────────────────────────

router.get('/cities', patientsController.getCities);
router.get('/location/reverse', patientsController.reverseLocation);
router.get('/location/search', patientsController.searchLocation);

// ─── Billing & Subscription ───────────────────────────────────────────────────

router.post(
  '/initiate-payment',
  authenticateSession,
  patientsController.initiatePayment
);
router.post('/subscribe', authenticateSession, patientsController.subscribe);

// ─── Addresses ────────────────────────────────────────────────────────────────

router.get(
  '/me/addresses',
  authenticateSession,
  patientsController.getAddresses
);
router.post(
  '/me/addresses',
  authenticateSession,
  patientsController.addAddress
);
router.put(
  '/me/addresses/:id',
  authenticateSession,
  validateObjectId('id'),
  patientsController.updateAddress
);
router.delete(
  '/me/addresses/:id',
  authenticateSession,
  validateObjectId('id'),
  patientsController.deleteAddress
);

// ─── Patient Profile ──────────────────────────────────────────────────────────

router.get('/me', authenticateSession, patientsController.getMe);
router.put('/me', authenticateSession, patientsController.updateMe);
router.get('/me/profile', authenticateSession, patientsController.getProfile);

// Array-based Profile Field Updates
router.put(
  '/me/conditions',
  authenticateSession,
  patientsController.updateProfileArray('conditions')
);
router.put(
  '/me/allergies',
  authenticateSession,
  patientsController.updateProfileArray('allergies')
);
router.put(
  '/me/vaccinations',
  authenticateSession,
  patientsController.updateProfileArray('vaccinations')
);
router.put(
  '/me/appointments',
  authenticateSession,
  patientsController.updateProfileArray('appointments')
);
router.put(
  '/me/medical-history',
  authenticateSession,
  patientsController.updateProfileArray('medical_history')
);

router.post(
  '/me/prescriptions',
  authenticateSession,
  patientsController.uploadPrescriptions
);
router.post('/me/avatar', authenticateSession, patientsController.uploadAvatar);
router.put(
  '/me/lifestyle',
  authenticateSession,
  patientsController.updateLifestyle
);
router.put(
  '/me/primary-doctor',
  authenticateSession,
  patientsController.updatePrimaryDoctor
);

// Array-based Profile Field Deletions
router.delete(
  '/me/conditions/:id',
  authenticateSession,
  validateObjectId('id'),
  patientsController.deleteProfileItem('conditions', 'conditions')
);
router.delete(
  '/me/allergies/:id',
  authenticateSession,
  validateObjectId('id'),
  patientsController.deleteProfileItem('allergies', 'allergies')
);
router.delete(
  '/me/vaccinations/:id',
  authenticateSession,
  validateObjectId('id'),
  patientsController.deleteProfileItem('vaccinations', 'vaccinations')
);
router.delete(
  '/me/appointments/:id',
  authenticateSession,
  validateObjectId('id'),
  patientsController.deleteProfileItem('appointments', 'appointments')
);
router.delete(
  '/me/medical-history/:id',
  authenticateSession,
  validateObjectId('id'),
  patientsController.deleteProfileItem('medical_history', 'medical_history')
);
router.delete(
  '/me/history/:id',
  authenticateSession,
  validateObjectId('id'),
  patientsController.deleteProfileItem('medical_history', 'medical_history')
);
router.delete(
  '/me/medications/:id',
  authenticateSession,
  validateObjectId('id'),
  patientsController.deleteProfileItem('medications', 'medications')
);
router.delete(
  '/me/trusted-contacts/:id',
  authenticateSession,
  validateObjectId('id'),
  patientsController.deleteProfileItem('trusted_contacts', 'trusted_contacts')
);
router.delete(
  '/me/contact/:id',
  authenticateSession,
  validateObjectId('id'),
  patientsController.deleteProfileItem('trusted_contacts', 'trusted_contacts')
);

// Emergency Contact & Family/Caregiver Sharing
router.put(
  '/me/emergency-contact',
  authenticateSession,
  patientsController.updateEmergencyContact
);
router.post(
  '/me/invite-code',
  authenticateSession,
  patientsController.generateInviteCode
);
router.delete(
  '/me/companions/:id',
  authenticateSession,
  validateObjectId('id'),
  patientsController.deleteCompanion
);
router.get(
  '/me/trusted-contacts',
  authenticateSession,
  patientsController.getTrustedContacts
);
router.post(
  '/me/trusted-contacts',
  authenticateSession,
  patientsController.addTrustedContact
);
router.put(
  '/me/trusted-contacts/:id',
  authenticateSession,
  validateObjectId('id'),
  patientsController.updateTrustedContact
);

// ─── Caregiver / Callers ──────────────────────────────────────────────────────

router.get('/me/caller', authenticateSession, patientsController.getCaller);
router.get('/me/calls', authenticateSession, patientsController.getCalls);
router.get(
  '/me/agora-token',
  authenticateSession,
  patientsController.getAgoraToken
);
router.post(
  '/me/calls/initiate',
  authenticateSession,
  patientsController.initiateCall
);
router.get(
  '/me/calls/:sessionId/status',
  authenticateSession,
  patientsController.getCallStatus
);
router.post(
  '/me/calls/:sessionId/accept',
  authenticateSession,
  patientsController.acceptCall
);
router.post(
  '/me/calls/:sessionId/reject',
  authenticateSession,
  patientsController.rejectCall
);
router.post(
  '/me/calls/:sessionId/end',
  authenticateSession,
  patientsController.endCall
);
router.post(
  '/me/calls/:sessionId/callback-request',
  authenticateSession,
  patientsController.callbackRequest
);
router.post(
  '/me/calls/:sessionId/secure-message',
  authenticateSession,
  patientsController.sendSecureMessage
);
router.post(
  '/me/calls/:sessionId/feedback',
  authenticateSession,
  patientsController.submitCallFeedback
);

// ─── Medications & Notifications ──────────────────────────────────────────────

router.get(
  '/me/medications',
  authenticateSession,
  patientsController.getMedications
);
router.put(
  '/me/medications',
  authenticateSession,
  patientsController.updateMedications
);
router.put(
  '/me/call-preferences',
  authenticateSession,
  patientsController.updateCallPreferences
);
router.get(
  '/me/notifications',
  authenticateSession,
  patientsController.getNotifications
);
router.put(
  '/me/notifications/:id/read',
  authenticateSession,
  validateObjectId('id'),
  patientsController.markNotificationRead
);

// ─── AI Forecast & Vitals ─────────────────────────────────────────────────────

router.get(
  '/me/ai-prediction',
  authenticateSession,
  patientsController.getAIPrediction
);
router.get(
  '/me/vitals/forecast',
  authenticateSession,
  patientsController.getVitalsForecast
);
router.post(
  '/me/flag-issue',
  authenticateSession,
  patientsController.flagIssue
);
router.post('/me/vitals', authenticateSession, patientsController.logVitals);
router.get('/me/vitals', authenticateSession, patientsController.getVitals);

// ─── Security OTP ─────────────────────────────────────────────────────────────

router.post(
  '/me/security/screenshots/request-otp',
  authenticateSession,
  patientsController.requestScreenshotOtp
);
router.post(
  '/me/security/screenshots/verify',
  authenticateSession,
  patientsController.verifyScreenshotOtp
);
router.post(
  '/me/security/emergency-contact/request-otp',
  authenticateSession,
  patientsController.requestEmergencyContactOtp
);
router.post(
  '/me/security/emergency-contact/verify',
  authenticateSession,
  patientsController.verifyEmergencyContactOtp
);

// ─── Dashboard, Mood & Health State ───────────────────────────────────────────

router.get(
  '/me/dashboard',
  authenticateSession,
  patientsController.getDashboard
);
router.post('/me/mood', authenticateSession, patientsController.logMood);
router.get(
  '/me/health-state',
  authenticateSession,
  patientsController.getHealthState
);
router.get(
  '/me/health-history',
  authenticateSession,
  patientsController.getHealthHistory
);
router.get(
  '/me/health-timeline',
  authenticateSession,
  patientsController.getHealthTimeline
);
router.get(
  '/copilot/context',
  authenticateSession,
  patientsController.getCopilotContext
);

// ─── Sleep Tracking ───────────────────────────────────────────────────────────

router.get('/me/sleep', authenticateSession, patientsController.getSleep);
router.post('/me/sleep', authenticateSession, patientsController.logSleep);

// ─── Compatibility Exports ────────────────────────────────────────────────────

router.activateSubscription = SubscriptionService.activateSubscription;
router.subscribeAndSeedDemoData = patientsController.subscribeAndSeedDemoData;

module.exports = router;
