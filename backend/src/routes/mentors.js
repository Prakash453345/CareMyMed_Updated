const express = require('express');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { scopeFilter } = require('../middleware/scopeFilter');
const { autoLogAccess } = require('../services/auditService');
const mentorsController = require('../controllers/mentorsController');

const router = express.Router();

/**
 * GET /api/mentors
 * Get mentors with role-based access control
 */
router.get('/',
  authenticate,
  authorize('mentors', 'read'),
  scopeFilter('mentors'),
  autoLogAccess('mentors', 'read'),
  mentorsController.getMentors
);

/**
 * GET /api/mentors/:id
 * Get specific mentor with role-based access
 */
router.get('/:id',
  authenticate,
  authorize('mentors', 'read'),
  autoLogAccess('mentors', 'read'),
  mentorsController.getMentorById
);

/**
 * GET /api/mentors/:id/patients
 * Get all patients a mentor is authorized to access
 */
router.get('/:id/patients',
  authenticate,
  authorize('mentors', 'read'),
  autoLogAccess('mentors', 'read'),
  mentorsController.getMentorPatients
);

/**
 * PUT /api/mentors/:id/patients/:patientId/permissions
 * Update mentor permissions for a specific patient
 */
router.put('/:id/patients/:patientId/permissions',
  authenticate,
  authorize('mentors', 'update'),
  autoLogAccess('mentors', 'update'),
  mentorsController.updateMentorPatientPermissions
);

/**
 * GET /api/mentors/:id/patients/:patientId/permissions/check
 * Check if mentor has specific permission for patient
 */
router.get('/:id/patients/:patientId/permissions/check',
  authenticate,
  authorize('mentors', 'read'),
  autoLogAccess('mentors', 'read'),
  mentorsController.checkMentorPatientPermission
);

/**
 * POST /api/mentors/:id/patients/:patientId/access-log
 * Log mentor access to patient data (called by other services)
 */
router.post('/:id/patients/:patientId/access-log',
  authenticate,
  authorize('mentors', 'read'),
  mentorsController.logMentorPatientAccess
);

module.exports = router;
