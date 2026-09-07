const express = require('express');
const { authenticateSession } = require('../../middleware/authenticate');
const medicinesController = require('../../controllers/users/medicinesController');

const router = express.Router();

/**
 * GET /api/users/medicines/today
 */
router.get(
  '/today',
  authenticateSession,
  medicinesController.getTodayMedicines
);

/**
 * PUT /api/users/medicines/mark
 */
router.put('/mark', authenticateSession, medicinesController.markMedicine);

/**
 * PUT /api/users/medicines/mark-slot
 */
router.put('/mark-slot', authenticateSession, medicinesController.markSlot);

/**
 * POST /api/users/medicines/id/:id/refill
 * POST /api/users/medicines/:name/refill
 */
router.post(
  '/id/:id/refill',
  authenticateSession,
  medicinesController.handleRefillRequest
);
router.post(
  '/:name/refill',
  authenticateSession,
  medicinesController.handleRefillRequest
);

/**
 * GET /api/users/medicines/adherence/weekly-summary
 */
router.get(
  '/adherence/weekly-summary',
  authenticateSession,
  medicinesController.getWeeklySummary
);

/**
 * GET /api/users/medicines/adherence/weekly
 */
router.get(
  '/adherence/weekly',
  authenticateSession,
  medicinesController.getWeeklyAdherence
);

/**
 * GET /api/users/medicines/adherence/monthly
 */
router.get(
  '/adherence/monthly',
  authenticateSession,
  medicinesController.getMonthlyAdherence
);

/**
 * GET /api/users/medicines/adherence/details
 */
router.get(
  '/adherence/details',
  authenticateSession,
  medicinesController.getAdherenceDetails
);

/**
 * GET /api/users/medicines/adherence/recap
 */
router.get(
  '/adherence/recap',
  authenticateSession,
  medicinesController.getAdherenceRecap
);

/**
 * GET /api/users/medicines/temp-meds
 */
router.get('/temp-meds', authenticateSession, medicinesController.getTempMeds);

/**
 * POST /api/users/medicines/temp-meds
 */
router.post('/temp-meds', authenticateSession, medicinesController.addTempMed);

/**
 * DELETE /api/users/medicines/temp-meds/:medId
 */
router.delete(
  '/temp-meds/:medId',
  authenticateSession,
  medicinesController.deleteTempMed
);

// Compatibility exports for external services and legacy tests
router.buildMergedMeds = medicinesController.buildMergedMeds;
router.computeCurrentStreak = medicinesController.computeCurrentStreak;

module.exports = router;
module.exports.buildMergedMeds = medicinesController.buildMergedMeds;
module.exports.computeCurrentStreak = medicinesController.computeCurrentStreak;
