const express = require('express');
const { authenticate, requireRole } = require('../middleware/authenticate');
const { authorize, authorizeAny } = require('../middleware/authorize');
const { scopeFilter } = require('../middleware/scopeFilter');
const { autoLogAccess } = require('../services/auditService');
const profileController = require('../controllers/profileController');

const router = express.Router();

/**
 * GET /api/profile/me
 * Get current user's profile
 */
router.get('/me', authenticate, autoLogAccess('profile', 'read'), profileController.getMyProfile);

/**
 * GET /api/profile/:id
 * Get specific profile (with RBAC)
 */
router.get('/:id',
  authenticate,
  authorize('profile', 'read'),
  autoLogAccess('profile', 'read'),
  profileController.getProfileById
);

/**
 * GET /api/profile
 * Get profiles with filtering and pagination (with RBAC)
 */
router.get('/',
  authenticate,
  authorize('profile', 'read'),
  scopeFilter('profile'),
  autoLogAccess('profile', 'read'),
  profileController.getProfiles
);

/**
 * POST /api/profile
 * Create a new profile (admin only)
 */
router.post('/',
  authenticate,
  authorize('profile', 'create'),
  autoLogAccess('profile', 'create'),
  profileController.createProfile
);

/**
 * PUT /api/profile/:id
 * Update profile (with RBAC)
 */
router.put('/:id',
  authenticate,
  autoLogAccess('profile', 'update'),
  profileController.updateProfile
);

/**
 * DELETE /api/profile/:id
 * Delete/deactivate profile (admin only)
 */
router.delete('/:id',
  authenticate,
  authorizeAny([
    { resource: 'profile', action: 'delete' },
    { resource: 'care_managers', action: 'delete' },
    { resource: 'caretakers', action: 'delete' }
  ]),
  autoLogAccess('profile', 'delete'),
  profileController.deleteProfile
);

/**
 * GET /api/profile/organization/:orgId
 * Get profiles by organization (admin only)
 */
router.get('/organization/:orgId',
  authenticate,
  authorize('profile', 'read'),
  requireRole('super_admin', 'org_admin', 'care_manager'),
  autoLogAccess('profile', 'read'),
  profileController.getProfilesByOrganization
);

module.exports = router;
