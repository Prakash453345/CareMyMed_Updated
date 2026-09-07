const express = require('express');
const { authenticate, requireRole } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { scopeFilter } = require('../middleware/scopeFilter');
const { autoLogAccess } = require('../services/auditService');
const patientsController = require('../controllers/patientsController');

const router = express.Router();

/**
 * GET /api/patients
 * Get patients with role-based access control
 */
router.get('/',
  authenticate,
  authorize('patients', 'read'),
  scopeFilter('patients'),
  autoLogAccess('patients', 'read'),
  patientsController.getPatients
);

/**
 * GET /api/patients/:id
 * Get specific patient with role-based access
 */
router.get('/:id',
  authenticate,
  authorize('patients', 'read'),
  autoLogAccess('patients', 'read'),
  patientsController.getPatientById
);

/**
 * POST /api/patients
 * Create new patient (admin/care manager only)
 */
router.post('/',
  authenticate,
  authorize('patients', 'create'),
  autoLogAccess('patients', 'create'),
  patientsController.createPatient
);

/**
 * PUT /api/patients/:id
 * Update patient information
 */
router.put('/:id',
  authenticate,
  authorize('patients', 'update'),
  autoLogAccess('patients', 'update'),
  patientsController.updatePatient
);

/**
 * POST /api/patients/:caretakerId/assign/:patientId
 * Assign patient to caretaker
 */
router.post('/:caretakerId/assign/:patientId',
  authenticate,
  authorize('patients', 'assign'),
  autoLogAccess('patients', 'assign'),
  patientsController.assignPatientToCaretaker
);

/**
 * DELETE /api/patients/:caretakerId/unassign/:patientId
 * Unassign patient from caretaker
 */
router.delete('/:caretakerId/unassign/:patientId',
  authenticate,
  authorize('patients', 'assign'),
  autoLogAccess('patients', 'assign'),
  patientsController.unassignPatientFromCaretaker
);

/**
 * GET /api/patients/:id/caretakers
 * Get all caretakers assigned to a patient
 */
router.get('/:id/caretakers',
  authenticate,
  authorize('patients', 'read'),
  autoLogAccess('patients', 'read'),
  patientsController.getPatientCaretakers
);

/**
 * POST /api/patients/:id/mentors/authorize
 * Authorize a mentor for a patient
 */
router.post('/:id/mentors/authorize',
  authenticate,
  authorize('patients', 'authorize'),
  autoLogAccess('patients', 'authorize'),
  patientsController.authorizeMentorForPatient
);

/**
 * DELETE /api/patients/:id/mentors/:mentorId/revoke
 * Revoke mentor authorization for a patient
 */
router.delete('/:id/mentors/:mentorId/revoke',
  authenticate,
  authorize('patients', 'revoke'),
  autoLogAccess('patients', 'revoke'),
  patientsController.revokeMentorAuthorizationForPatient
);

/**
 * GET /api/patients/:id/mentors
 * Get all mentors authorized for a patient
 */
router.get('/:id/mentors',
  authenticate,
  authorize('patients', 'read'),
  autoLogAccess('patients', 'read'),
  patientsController.getPatientMentors
);

/**
 * POST /api/patients/:id/medications/:medId/toggle
 * Toggle medication adherence for a specific date
 */
router.post('/:id/medications/:medId/toggle',
  authenticate,
  patientsController.toggleMedicationAdherence
);

module.exports = router;
