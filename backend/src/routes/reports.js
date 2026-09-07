const express = require('express');
const { authenticate, requireRole } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { scopeFilter } = require('../middleware/scopeFilter');
const reportsController = require('../controllers/reportsController');

const router = express.Router();

/**
 * GET /api/reports/user-activity
 * Get user activity reports
 */
router.get('/user-activity',
  authenticate,
  authorize('reports', 'read'),
  reportsController.getUserActivity
);

/**
 * GET /api/reports/system-activity
 * Get system-wide or organization-wide recent activity log (flat list)
 */
router.get('/system-activity',
  authenticate,
  reportsController.getSystemActivity
);

/**
 * GET /api/reports/organization-stats
 * Get organization statistics
 */
router.get('/organization-stats',
  authenticate,
  authorize('reports', 'read'),
  reportsController.getOrganizationStats
);

/**
 * GET /api/reports/security-incidents
 * Get security incidents report
 */
router.get('/security-incidents',
  authenticate,
  requireRole('super_admin', 'org_admin'),
  authorize('reports', 'read'),
  reportsController.getSecurityIncidentsReport
);

/**
 * GET /api/reports/assignment-overview
 * Get caretaker-patient assignment overview
 */
router.get('/assignment-overview',
  authenticate,
  authorize('reports', 'read'),
  reportsController.getAssignmentOverview
);

/**
 * GET /api/reports/mentor-overview
 * Get mentor authorization overview
 */
router.get('/mentor-overview',
  authenticate,
  authorize('reports', 'read'),
  reportsController.getMentorOverview
);

module.exports = router;
