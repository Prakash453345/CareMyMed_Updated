const express = require('express');
const { authenticate, requireRole } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { autoLogAccess } = require('../services/auditService');
const organizationsController = require('../controllers/organizationsController');

const router = express.Router();

/**
 * GET /api/organizations
 * Get organizations (super admin only)
 */
router.get('/',
  authenticate,
  requireRole('super_admin'),
  authorize('organizations', 'read'),
  autoLogAccess('organizations', 'read'),
  organizationsController.listOrganizations
);

/**
 * GET /api/organizations/:id
 * Get specific organization
 */
router.get('/:id',
  authenticate,
  authorize('organizations', 'read'),
  autoLogAccess('organizations', 'read'),
  organizationsController.getOrganization
);

/**
 * POST /api/organizations
 * Create new organization (super admin only)
 */
router.post('/',
  authenticate,
  requireRole('super_admin'),
  authorize('organizations', 'create'),
  autoLogAccess('organizations', 'create'),
  organizationsController.createOrganization
);

/**
 * PUT /api/organizations/:id
 * Update organization
 */
router.put('/:id',
  authenticate,
  authorize('organizations', 'update'),
  autoLogAccess('organizations', 'update'),
  organizationsController.updateOrganization
);

/**
 * POST /api/organizations/:id/collaborations
 * Add a new collaboration/tie-up (super admin or org admin)
 */
router.post('/:id/collaborations',
  authenticate,
  authorize('organizations', 'update'),
  autoLogAccess('organizations', 'update'),
  organizationsController.addCollaboration
);

/**
 * DELETE /api/organizations/:id/collaborations
 * Remove specific collaborations/tie-ups and automatically deduct the revenue
 */
router.delete('/:id/collaborations',
  authenticate,
  authorize('organizations', 'update'),
  autoLogAccess('organizations', 'update'),
  organizationsController.deleteCollaborations
);

/**
 * DELETE /api/organizations/:id
 * Delete/deactivate organization (super admin only)
 */
router.delete('/:id',
  authenticate,
  requireRole('super_admin'),
  authorize('organizations', 'delete'),
  autoLogAccess('organizations', 'delete'),
  organizationsController.deleteOrganization
);

/**
 * GET /api/organizations/:id/users
 * Get users in an organization
 */
router.get('/:id/users',
  authenticate,
  authorize('organizations', 'read'),
  autoLogAccess('organizations', 'read'),
  organizationsController.getOrganizationUsers
);

/**
 * GET /api/organizations/:id/stats
 * Get organization statistics
 */
router.get('/:id/stats',
  authenticate,
  authorize('organizations', 'read'),
  autoLogAccess('organizations', 'read'),
  organizationsController.getOrganizationStats
);

/**
 * PATCH /api/organizations/:id/toggle-status
 * Deactivate or reactivate an organization (super admin only)
 */
router.patch('/:id/toggle-status',
  authenticate,
  requireRole('super_admin'),
  organizationsController.toggleOrganizationStatus
);

module.exports = router;
