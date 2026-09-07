const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authenticate');
const { otpRateLimiter } = require('../middleware/rateLimiter');
const companionController = require('../controllers/companionController');

/**
 * POST /api/companion/join
 */
router.post('/join', companionController.join);

/**
 * POST /api/companion/check-email
 */
router.post('/check-email', otpRateLimiter, companionController.checkEmail);

/**
 * POST /api/companion/join-otp
 */
router.post('/join-otp', otpRateLimiter, companionController.joinOtp);

/**
 * GET /api/companion/patient-status
 */
router.get(
  '/patient-status',
  authenticate,
  companionController.getPatientStatus
);

/**
 * GET /api/companion/patient-health-history
 */
router.get(
  '/patient-health-history',
  authenticate,
  companionController.getPatientHealthHistory
);

/**
 * GET /api/companion/linked-patients
 */
router.get(
  '/linked-patients',
  authenticate,
  companionController.getLinkedPatients
);

/**
 * GET /api/companion/relationships
 */
router.get(
  '/relationships',
  authenticate,
  companionController.getRelationships
);

/**
 * POST /api/companion/relationships
 */
router.post(
  '/relationships',
  authenticate,
  companionController.createRelationship
);

/**
 * PATCH /api/companion/relationships/:id
 */
router.patch(
  '/relationships/:id',
  authenticate,
  companionController.updateRelationship
);

/**
 * DELETE /api/companion/relationships/:id
 */
router.delete(
  '/relationships/:id',
  authenticate,
  companionController.deleteRelationship
);

/**
 * POST /api/companion/nudge
 */
router.post('/nudge', authenticate, companionController.sendNudge);

/**
 * POST /api/companion/request-bp
 */
router.post('/request-bp', authenticate, companionController.requestBp);

/**
 * POST /api/companion/alerts/:id/acknowledge
 */
router.post(
  '/alerts/:id/acknowledge',
  authenticate,
  companionController.acknowledgeAlert
);

/**
 * POST /api/companion/patients/:patientId/invite-code
 */
router.post(
  '/patients/:patientId/invite-code',
  authenticate,
  companionController.generatePatientInviteCode
);

/**
 * GET /api/companion/interventions
 */
router.get(
  '/interventions',
  authenticate,
  companionController.getInterventions
);

/**
 * POST /api/companion/interventions
 */
router.post(
  '/interventions',
  authenticate,
  companionController.createIntervention
);

/**
 * GET /api/companion/analytics-extended
 */
router.get(
  '/analytics-extended',
  authenticate,
  companionController.getAnalyticsExtended
);

/**
 * POST /api/companion/link-patient
 */
router.post('/link-patient', authenticate, companionController.linkPatient);

/**
 * PUT /api/companion/profile
 */
router.put('/profile', authenticate, companionController.updateProfile);

/**
 * POST /api/companion/patient-status/refresh-insights
 */
router.post(
  '/patient-status/refresh-insights',
  authenticate,
  companionController.refreshInsights
);

module.exports = router;
