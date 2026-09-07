const express = require('express');
const { authenticate, requireRole } = require('../middleware/authenticate');
const dashboardController = require('../controllers/dashboardController');

const router = express.Router();

/**
 * GET /api/dashboard/super-admin-stats
 * Aggregated dashboard data for Super Admin.
 * Returns: stats counters, organizations list with patient counts, recent activity.
 */
router.get('/super-admin-stats',
    authenticate,
    requireRole('super_admin'),
    dashboardController.getSuperAdminStats
);

/**
 * GET /api/dashboard/org-admin-stats
 * Aggregated dashboard data for Organizational Admin.
 * Returns: role counts, routing queue, manager workload.
 */
router.get('/org-admin-stats',
    authenticate,
    requireRole('org_admin'),
    dashboardController.getOrgAdminStats
);

/**
 * GET /api/dashboard/care-manager-stats
 * Aggregated dashboard data for Care Manager.
 * Returns: case stats, top performers, recent team activity.
 */
router.get('/care-manager-stats',
    authenticate,
    requireRole('care_manager'),
    dashboardController.getCareManagerStats
);

/**
 * GET /api/dashboard/care-manager-shift-pulse
 * Lightweight, real-time shift data for premium UX widgets.
 * Returns: shiftPulse, dailyGoal, callerActivity[], shiftHandoff
 */
router.get('/care-manager-shift-pulse',
    authenticate,
    requireRole('care_manager'),
    dashboardController.getCareManagerShiftPulse
);

/**
 * GET /api/dashboard/org-admin-pulse
 * Premium UX data for Org Admin Dashboard
 * Returns: systemUtilization, globalSla, staffingForecast, orgPulse, escalationHeatmap
 */
router.get('/org-admin-pulse',
    authenticate,
    requireRole('admin', 'super_admin'),
    dashboardController.getOrgAdminPulse
);

module.exports = router;
