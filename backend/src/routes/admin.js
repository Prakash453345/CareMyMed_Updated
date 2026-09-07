const express = require('express');
const { authenticate, requireRole } = require('../middleware/authenticate');
const adminController = require('../controllers/adminController');

const router = express.Router();

// ── All routes require super_admin ──────────────────────────────
router.use(authenticate, requireRole('super_admin'));

// 1. GET /api/admin/stats — Platform-wide KPIs
router.get('/stats', adminController.getStats);

// 2. GET /api/admin/organizations — All orgs (paginated)
router.get('/organizations', adminController.getOrganizations);

// 3. POST /api/admin/organizations — Create org
router.post('/organizations', adminController.createOrganization);

// 4. PUT /api/admin/organizations/:id — Update org
router.put('/organizations/:id', adminController.updateOrganization);

// 5. DELETE /api/admin/organizations/:id — Soft-delete org
router.delete('/organizations/:id', adminController.deleteOrganization);

// 6. GET /api/admin/users — All users (filtered, paginated)
router.get('/users', adminController.getUsers);

// 7. PUT /api/admin/users/:id/status — Activate/deactivate user
router.put('/users/:id/status', adminController.updateUserStatus);

// 8. GET /api/admin/activity — Recent audit logs
router.get('/activity', adminController.getActivity);

// 9. GET /api/admin/alerts — System-wide escalations/alerts
router.get('/alerts', adminController.getAlerts);

// 10. GET /api/admin/analytics/revenue — Revenue chart data
router.get('/analytics/revenue', adminController.getRevenueAnalytics);

// 11. GET /api/admin/analytics/adherence — Adherence trends
router.get('/analytics/adherence', adminController.getAdherenceAnalytics);

// 12. POST /api/admin/reports/export — Export CSV/PDF
router.post('/reports/export', adminController.exportReport);

module.exports = router;
