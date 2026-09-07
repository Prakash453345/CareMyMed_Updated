const express = require('express');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { scopeFilter } = require('../middleware/scopeFilter');
const { autoLogAccess } = require('../services/auditService');
const caretakersController = require('../controllers/caretakersController');

const router = express.Router();

/**
 * GET /api/caretakers
 * Get caretakers with role-based access control
 */
router.get('/',
  authenticate,
  authorize('caretakers', 'read'),
  scopeFilter('caretakers'),
  autoLogAccess('caretakers', 'read'),
  caretakersController.listCaretakers
);

/**
 * GET /api/caretakers/:id
 * Get specific caretaker with role-based access
 */
router.get('/:id',
  authenticate,
  authorize('caretakers', 'read'),
  autoLogAccess('caretakers', 'read'),
  caretakersController.getCaretaker
);

/**
 * GET /api/caretakers/:id/patients
 * Get all patients assigned to a caretaker
 */
router.get('/:id/patients',
  authenticate,
  authorize('caretakers', 'read'),
  autoLogAccess('caretakers', 'read'),
  caretakersController.getCaretakerPatientsList
);

/**
 * POST /api/caretakers/:id/patients/:patientId/notes
 * Add note to caretaker-patient assignment
 */
router.post('/:id/patients/:patientId/notes',
  authenticate,
  authorize('caretakers', 'update'),
  autoLogAccess('caretakers', 'update'),
  caretakersController.addCaretakerPatientNote
);

module.exports = router;
